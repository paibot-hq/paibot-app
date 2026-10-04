import { SPEED_OF_SOUND, type BurstEvent, type Kind } from "./engine";

// The sound of a shell: a mortar's thump and a thin whistle as it goes up, then the sharp crack of the burst, a deep
// boom that rolls back off the town, and for the trailing kinds the crackle of stars falling. All of it is heard
// `distance / 340` seconds after it happens, quieter and duller the farther away you are.

type Bus = { dry: GainNode; wet: GainNode };
const buses = new WeakMap<AudioContext, Bus>();

// The sound goes through one compressor (a finale is many bursts at once) and a reverb: an echo off the town, made
// from decaying noise.
function bus(audio: AudioContext): Bus {
  const known = buses.get(audio);
  if (known) return known;
  const master = audio.createGain();
  master.gain.value = 0.85;
  const compressor = audio.createDynamicsCompressor();
  compressor.threshold.value = -16;
  compressor.knee.value = 12;
  compressor.ratio.value = 5;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.3;
  master.connect(compressor).connect(audio.destination);
  const seconds = 2.6;
  const length = Math.floor(audio.sampleRate * seconds);
  const impulse = audio.createBuffer(2, length, audio.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    let low = 0;
    for (let i = 0; i < length; i++) {
      // Darker as it dies away: a one-pole low-pass whose cutoff falls.
      const decay = Math.pow(1 - i / length, 2.6);
      low += ((Math.random() * 2 - 1) - low) * (0.5 - 0.42 * (i / length));
      data[i] = low * decay;
    }
    // A few early echoes from the buildings.
    for (const ms of [38, 71, 113, 167]) data[Math.floor((audio.sampleRate * (ms + channel * 7)) / 1000)] += 0.5 * (channel ? -1 : 1);
  }
  const reverb = audio.createConvolver();
  reverb.buffer = impulse;
  const wet = audio.createGain();
  wet.gain.value = 0.55;
  reverb.connect(wet).connect(master);
  const dry = audio.createGain();
  dry.connect(master);
  dry.connect(reverb);
  const made = { dry, wet };
  buses.set(audio, made);
  return made;
}

// Noise that dies away: `power` is how fast.
function noise(audio: AudioContext, seconds: number, power: number): AudioBufferSourceNode {
  const length = Math.max(1, Math.floor(audio.sampleRate * seconds));
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, power);
  const source = audio.createBufferSource();
  source.buffer = buffer;
  return source;
}

function filtered(audio: AudioContext, source: AudioNode, type: BiquadFilterType, frequency: number, q = 0.7): BiquadFilterNode {
  const filter = audio.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = frequency;
  filter.Q.value = q;
  source.connect(filter);
  return filter;
}

function toBus(audio: AudioContext, node: AudioNode, level: number) {
  const gain = audio.createGain();
  gain.gain.value = level;
  node.connect(gain).connect(bus(audio).dry);
}

// Air takes the highs out of a far sound.
const airCutoff = (distance: number) => Math.min(9000, Math.max(1400, 9500 - distance * 5.5));
const loudness = (distance: number) => Math.min(1, Math.max(0.2, 1.1 - distance / 2000));

function tone(audio: AudioContext, type: OscillatorType, from: number, to: number, start: number, seconds: number, level: number, target?: AudioNode) {
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(from, start);
  oscillator.frequency.exponentialRampToValueAtTime(to, start + seconds);
  gain.gain.setValueAtTime(level, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  oscillator.connect(gain);
  if (target) gain.connect(target);
  else gain.connect(bus(audio).dry);
  oscillator.start(start);
  oscillator.stop(start + seconds + 0.05);
}

// The launch: a mortar's thump, a puff of air and a thin whistle rising.
export function playLaunch(audio: AudioContext, distance = 0, now = audio.currentTime) {
  const at = now + distance / SPEED_OF_SOUND;
  const loud = loudness(distance);
  const jitter = 0.92 + Math.random() * 0.16;
  tone(audio, "sine", 95 * jitter, 42, at, 0.28, 0.28 * loud);
  const puff = noise(audio, 0.4, 2);
  toBus(audio, filtered(audio, puff, "bandpass", 900 * jitter, 0.6), 0.1 * loud);
  puff.start(at);
  const whistle = audio.createGain();
  whistle.connect(bus(audio).dry);
  tone(audio, "sine", 1100 * jitter, 2300 * jitter, at + 0.03, 0.7, 0.011 * loud, whistle);
}

const CRACKLES: ReadonlySet<Kind> = new Set<Kind>(["chrysanthemum", "willow", "core"]);

// The burst: crack, boom and rumble, and the crackle of the trailing kinds.
export function playBurst(audio: AudioContext, event: BurstEvent, distance: number, now = audio.currentTime) {
  const at = now + distance / SPEED_OF_SOUND;
  const loud = loudness(distance) * (0.5 + event.size / 12);
  const jitter = 0.92 + Math.random() * 0.16;
  const dull = airCutoff(distance);
  // The crack: a very short, sharp burst of noise, the part that says "burst".
  const crack = noise(audio, 0.16, 5);
  toBus(audio, filtered(audio, filtered(audio, crack, "highpass", 700), "lowpass", dull), 0.55 * loud);
  crack.start(at);
  // The boom: a low note falling, with a little push behind it; bigger shells are deeper.
  const pitch = (118 - event.size * 5) * jitter;
  tone(audio, "sine", pitch, 34, at, 0.75, 0.62 * loud);
  tone(audio, "triangle", pitch * 0.62, 30, at + 0.012, 0.5, 0.25 * loud);
  // The rumble that rolls back off the town.
  const rumble = noise(audio, 1.9, 1.6);
  toBus(audio, filtered(audio, rumble, "lowpass", 420 * jitter), 0.3 * loud);
  rumble.start(at + 0.04);
  if (!CRACKLES.has(event.kind)) return;
  // The stars crackle as they fall: many tiny clicks, thinning out; a willow also hisses.
  const clicks = event.kind === "willow" ? 30 : 22;
  for (let i = 0; i < clicks; i++) {
    const when = at + 0.22 + Math.pow(Math.random(), 1.7) * (event.kind === "willow" ? 2.6 : 1.8);
    const click = noise(audio, 0.012 + Math.random() * 0.02, 3);
    toBus(audio, filtered(audio, filtered(audio, click, "bandpass", 2400 + Math.random() * 4200, 1.8), "lowpass", dull), (0.08 + Math.random() * 0.12) * loud);
    click.start(when);
  }
  if (event.kind === "willow") {
    const hiss = noise(audio, 2.8, 1.4);
    toBus(audio, filtered(audio, filtered(audio, hiss, "highpass", 4200), "lowpass", Math.min(dull, 8500)), 0.07 * loud);
    hiss.start(at + 0.3);
  }
}
