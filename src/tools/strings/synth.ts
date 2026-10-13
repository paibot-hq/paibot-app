// The sound of the two instruments (Web Audio, browser only). The mandolin is plucked, each course as two slightly different strings;
// the violin is bowed: a sustained, filtered sawtooth that goes on while the bow is down, with vibrato.
import { pluckSamples } from "./pluck";

export type Synth = {
  resume(): void;
  setVolume(volume: number): void;
  // Mandolin: pluck a course (0 is the top one) at a frequency.
  pluck(course: number, frequency: number, short?: boolean): void;
  // Violin: a bow on a string. The id says which touch it is (so several strings can sound together).
  bowStart(id: string, frequency: number, vibrato: boolean): void;
  bowMove(id: string, frequency: number): void;
  bowStop(id: string): void;
  dispose(): void;
};

type Bow = { oscillators: OscillatorNode[]; gain: GainNode; filter: BiquadFilterNode; extra: AudioScheduledSourceNode[] };
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

  // Each instrument has its own body: a few broad bumps in the sound.
  const mandolinBus = audio.createGain();
  mandolinBus.connect(peaking(audio, 900, 4)).connect(peaking(audio, 2400, 3)).connect(master);
  const violinBus = audio.createGain();
  violinBus.connect(peaking(audio, 300, 4)).connect(peaking(audio, 1200, 2)).connect(peaking(audio, 2800, 5)).connect(master);

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

    pluck(course, frequency, short = false) {
      releaseCourse(course);
      const now = audio.currentTime;
      const gain = audio.createGain();
      gain.gain.value = 0.8;
      gain.connect(mandolinBus);
      const sources: AudioBufferSourceNode[] = [];
      // The two strings of a course are a few cents apart, which is the shimmer of a mandolin.
      for (const cents of [-2.5, 2.5]) {
        const { data, f0 } = pluckSamples(audio.sampleRate, frequency, Math.random, short ? 0.4 : 2.6);
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

    bowStart(id, frequency, vibrato) {
      this.bowStop(id);
      const now = audio.currentTime;
      const gain = audio.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.setTargetAtTime(0.2, now, 0.05);
      const filter = audio.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = Math.min(7000, Math.max(1500, frequency * 7));
      filter.Q.value = 0.7;
      filter.connect(gain).connect(violinBus);
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
        depth.gain.linearRampToValueAtTime(16, now + 0.7);
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
      hiss.gain.value = 0.05;
      scrape.connect(band).connect(hiss).connect(filter);
      scrape.start(now);
      extra.push(scrape);
      bows.set(id, { oscillators, gain, filter, extra });
    },

    bowMove(id, frequency) {
      const bow = bows.get(id);
      if (!bow) return;
      const now = audio.currentTime;
      for (const oscillator of bow.oscillators) oscillator.frequency.setTargetAtTime(frequency, now, 0.03);
      bow.filter.frequency.setTargetAtTime(Math.min(7000, Math.max(1500, frequency * 7)), now, 0.03);
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
