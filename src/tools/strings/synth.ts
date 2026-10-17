// The sound of the instruments (Web Audio, browser only), from the settings in instruments.ts. A plucked string is a Karplus-Strong sample
// (a course may be two slightly different strings); a bowed one is a sustained, filtered sawtooth that goes on while the bow is down, with vibrato.
import { pluckSamples } from "./pluck";
import type { BowSound, PluckSound } from "./instruments";

export type Synth = {
  resume(): void;
  setVolume(volume: number): void;
  // Pluck a string (0 is the top one) at a frequency. `key` names the instrument, for its body; `short` is for a tremolo.
  pluck(key: string, course: number, frequency: number, sound: PluckSound, short?: boolean): void;
  // A bow on a string. The id says which touch it is (so several strings can sound together).
  bowStart(key: string, id: string, frequency: number, sound: BowSound, vibrato: boolean): void;
  bowMove(id: string, frequency: number): void;
  bowStop(id: string): void;
  dispose(): void;
};

type Bow = { oscillators: OscillatorNode[]; gain: GainNode; filter: BiquadFilterNode; extra: AudioScheduledSourceNode[]; sound: BowSound };
type Course = { gain: GainNode; sources: AudioBufferSourceNode[] };

function peaking(audio: AudioContext, frequency: number, gain: number, q = 1) {
  const filter = audio.createBiquadFilter();
  filter.type = "peaking";
  filter.frequency.value = frequency;
  filter.gain.value = gain;
  filter.Q.value = q;
  return filter;
}

// A short burst of decaying noise: a room, for the sound to sit in.
function room(audio: AudioContext) {
  const length = Math.floor(audio.sampleRate * 1.3);
  const buffer = audio.createBuffer(2, length, audio.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
  }
  const convolver = audio.createConvolver();
  convolver.buffer = buffer;
  return convolver;
}

export function createSynth(): Synth {
  const audio = new AudioContext();
  const master = audio.createGain();
  master.gain.value = 0.7;
  const compressor = audio.createDynamicsCompressor();
  const wet = audio.createGain();
  wet.gain.value = 0.22;
  const convolver = room(audio);
  master.connect(compressor);
  master.connect(convolver).connect(wet).connect(compressor);
  compressor.connect(audio.destination);

  // Each instrument has its own body: a few broad bumps in the sound, made the first time it is played.
  const buses = new Map<string, GainNode>();
  const busFor = (key: string, eq: [number, number][]) => {
    let bus = buses.get(key);
    if (!bus) {
      bus = audio.createGain();
      let last: AudioNode = bus;
      for (const [hz, gain] of eq) { const filter = peaking(audio, hz, gain); last.connect(filter); last = filter; }
      last.connect(master);
      buses.set(key, bus);
    }
    return bus;
  };

  const courses = new Map<number, Course>();
  const bows = new Map<string, Bow>();
  // Bow noise: a little scrape, in a loop.
  const noiseBuffer = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) noiseData[i] = Math.random() * 2 - 1;

  const releaseCourse = (course: number) => {
    const old = courses.get(course);
    if (!old) return;
    const now = audio.currentTime;
    old.gain.gain.cancelScheduledValues(now);
    old.gain.gain.setTargetAtTime(0, now, 0.02);
    for (const source of old.sources) source.stop(now + 0.15);
    courses.delete(course);
  };

  return {
    resume() { void audio.resume(); },
    setVolume(volume) { master.gain.setTargetAtTime(Math.max(0, Math.min(1, volume)), audio.currentTime, 0.02); },

    pluck(key, course, frequency, sound, short = false) {
      releaseCourse(course);
      const now = audio.currentTime;
      const gain = audio.createGain();
      gain.gain.value = sound.level;
      gain.connect(busFor(key, sound.eq));
      const sources: AudioBufferSourceNode[] = [];
      // The two strings of a course are a few cents apart, which is the shimmer of a mandolin.
      const offsets = sound.strings === 2 ? [-sound.spread / 2, sound.spread / 2] : [0];
      for (const cents of offsets) {
        const { data, f0 } = pluckSamples(audio.sampleRate, frequency, Math.random, short ? 0.4 : 2.6, sound);
        const buffer = audio.createBuffer(1, data.length, audio.sampleRate);
        buffer.copyToChannel(data, 0);
        const source = audio.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = (frequency / f0) * 2 ** (cents / 1200);
        source.connect(gain);
        source.start(now);
        sources.push(source);
      }
      courses.set(course, { gain, sources });
    },

    bowStart(key, id, frequency, sound, vibrato) {
      this.bowStop(id);
      const now = audio.currentTime;
      const gain = audio.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.setTargetAtTime(sound.level, now, sound.attack);
      const filter = audio.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = Math.min(sound.max, Math.max(sound.min, frequency * sound.track));
      filter.Q.value = 0.7;
      filter.connect(gain).connect(busFor(key, sound.eq));
      const oscillators = [0, 7].map(cents => {
        const oscillator = audio.createOscillator();
        oscillator.type = "sawtooth";
        oscillator.frequency.value = frequency;
        oscillator.detune.value = cents;
        oscillator.connect(filter);
        oscillator.start(now);
        return oscillator;
      });
      const extra: AudioScheduledSourceNode[] = [];
      if (vibrato) {
        // The vibrato comes in a moment after the note starts, as a player's does.
        const lfo = audio.createOscillator();
        lfo.frequency.value = 5.6;
        const depth = audio.createGain();
        depth.gain.setValueAtTime(0, now);
        depth.gain.linearRampToValueAtTime(sound.vibrato, now + 0.7);
        lfo.connect(depth);
        for (const oscillator of oscillators) depth.connect(oscillator.detune);
        lfo.start(now);
        extra.push(lfo);
      }
      const scrape = audio.createBufferSource();
      scrape.buffer = noiseBuffer;
      scrape.loop = true;
      const band = audio.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = 2800;
      const hiss = audio.createGain();
      hiss.gain.value = sound.hiss;
      scrape.connect(band).connect(hiss).connect(filter);
      scrape.start(now);
      extra.push(scrape);
      bows.set(id, { oscillators, gain, filter, extra, sound });
    },

    bowMove(id, frequency) {
      const bow = bows.get(id);
      if (!bow) return;
      const now = audio.currentTime;
      for (const oscillator of bow.oscillators) oscillator.frequency.setTargetAtTime(frequency, now, 0.03);
      bow.filter.frequency.setTargetAtTime(Math.min(bow.sound.max, Math.max(bow.sound.min, frequency * bow.sound.track)), now, 0.03);
    },

    bowStop(id) {
      const bow = bows.get(id);
      if (!bow) return;
      bows.delete(id);
      const now = audio.currentTime;
      bow.gain.gain.cancelScheduledValues(now);
      bow.gain.gain.setTargetAtTime(0, now, 0.06);
      for (const node of [...bow.oscillators, ...bow.extra]) node.stop(now + 0.5);
    },

    dispose() { void audio.close(); },
  };
}
