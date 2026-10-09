// The sounds, made with Web Audio (no files): a pop that climbs the scale with the combo, a sparkle on the special bubbles, a chime at a milestone
// and a run of notes when the sheet is cleared. Everything goes through one compressor, so many pops at once do not clip.
import { frequency, type BubbleKind } from "./engine";

const masters = new WeakMap<AudioContext, AudioNode>();

function master(context: AudioContext): AudioNode {
  let node = masters.get(context);
  if (!node) {
    const compressor = context.createDynamicsCompressor();
    const gain = context.createGain();
    gain.gain.value = 0.7;
    compressor.connect(gain).connect(context.destination);
    masters.set(context, compressor);
    node = compressor;
  }
  return node;
}

function tone(context: AudioContext, at: number, hz: number, peak: number, length: number, type: OscillatorType = "sine", glide = 1) {
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(hz, at);
  if (glide !== 1) osc.frequency.exponentialRampToValueAtTime(hz * glide, at + length);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(gain).connect(master(context));
  osc.start(at);
  osc.stop(at + length + 0.02);
}

let noise: AudioBuffer | null = null;
function click(context: AudioContext, at: number, peak: number) {
  if (!noise) {
    noise = context.createBuffer(1, Math.floor(context.sampleRate * 0.04), context.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = noise;
  filter.type = "highpass";
  filter.frequency.value = 1800;
  gain.gain.setValueAtTime(peak, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.04);
  source.connect(filter).connect(gain).connect(master(context));
  source.start(at);
}

export function playPop(context: AudioContext, combo: number, chain: boolean, kind: BubbleKind, delay = 0) {
  const at = context.currentTime + delay;
  const hz = frequency(combo);
  tone(context, at, hz, chain ? 0.16 : 0.26, 0.16, "triangle", 0.96);
  tone(context, at, 170, 0.18, 0.07, "sine", 0.4); // the body of the pop
  click(context, at, chain ? 0.1 : 0.16);
  if (kind === "gold") tone(context, at, hz * 2, 0.12, 0.3);
  if (kind === "rainbow") { tone(context, at, hz * 2, 0.12, 0.4); tone(context, at, hz * 3, 0.08, 0.5); }
}

export function playMilestone(context: AudioContext, value: number) {
  const at = context.currentTime;
  const base = 523.25 * (value >= 100 ? 1.25 : 1);
  [1, 1.25, 1.5, 2].forEach((ratio, i) => tone(context, at + i * 0.045, base * ratio, 0.13, 0.9));
}

export function playClear(context: AudioContext) {
  const at = context.currentTime;
  [0, 4, 7, 12, 16, 19, 24].forEach((step, i) => tone(context, at + i * 0.07, 523.25 * 2 ** (step / 12), 0.14, 0.5, "triangle"));
}
