import { SPEED_OF_SOUND, type BurstEvent, type Kind } from "./engine";

// Sound takes time to arrive: the burst is seen first and heard `distance / 340` seconds later. A bigger shell is
// louder and deeper, a far one is quieter.
const CRACKLES: ReadonlySet<Kind> = new Set<Kind>(["chrysanthemum", "willow", "core"]);

function noise(audio: AudioContext, seconds: number, power: number): AudioBufferSourceNode {
  const length = Math.floor(audio.sampleRate * seconds);
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, power);
  const source = audio.createBufferSource();
  source.buffer = buffer;
  return source;
}

export function playLaunch(audio: AudioContext, at = audio.currentTime) {
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(240, at);
  oscillator.frequency.exponentialRampToValueAtTime(1100, at + 0.55);
  gain.gain.setValueAtTime(0.02, at);
  gain.gain.exponentialRampToValueAtTime(0.001, at + 0.6);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(at);
  oscillator.stop(at + 0.65);
}

export function playBurst(audio: AudioContext, event: BurstEvent, distance: number, now = audio.currentTime) {
  const at = now + distance / SPEED_OF_SOUND;
  const loud = Math.min(1, Math.max(0.2, 1.05 - distance / 2200)) * (0.45 + event.size / 14);
  // The thump of the burst: a short low note falling.
  const thump = audio.createOscillator();
  const thumpGain = audio.createGain();
  thump.type = "sine";
  thump.frequency.setValueAtTime(130 - event.size * 4, at);
  thump.frequency.exponentialRampToValueAtTime(32, at + 0.45);
  thumpGain.gain.setValueAtTime(0.5 * loud, at);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, at + 0.5);
  thump.connect(thumpGain).connect(audio.destination);
  thump.start(at);
  thump.stop(at + 0.55);
  // The crack: noise through a falling low-pass filter.
  const crack = noise(audio, 0.55, 2.4);
  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2200, at);
  filter.frequency.exponentialRampToValueAtTime(180, at + 0.5);
  const crackGain = audio.createGain();
  crackGain.gain.value = 0.34 * loud;
  crack.connect(filter).connect(crackGain).connect(audio.destination);
  crack.start(at);
  // Bursts with trailing stars crackle as they fall.
  if (CRACKLES.has(event.kind)) {
    for (let i = 0; i < 12; i++) {
      const tick = noise(audio, 0.04, 3);
      const tickGain = audio.createGain();
      tickGain.gain.value = (0.05 + Math.random() * 0.08) * loud;
      tick.connect(tickGain).connect(audio.destination);
      tick.start(at + 0.25 + Math.random() * 1.4);
    }
  }
}
