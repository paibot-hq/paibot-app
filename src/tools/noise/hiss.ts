// The noise on the page as a sound ("ザー"): the same noise function, read along a line at an audio rate instead of
// across the image. White noise is a random number every sample, a hiss; the smooth kinds rumble, lower at a small
// scale and higher at a large one, and more octaves add the rougher, higher layers. Pure functions, so they are tested
// without a browser or sound.

import { makeNoise, random, type NoiseSettings } from "./noise.ts";

// The first octave's lattice points per second at a scale of 1, so the scale (1-32) runs from a low rumble to a hiss.
const HERTZ_PER_SCALE = 40;
// The line read through the noise climbs at this slope, so it does not come back to the lattice it started on.
const SLOPE = 0.618;
// The last part of the sound is faded into its start, so the loop has no click.
const SEAM = 0.1;

// `seconds` of the sound at `rate` samples a second, in [-1, 1], centred on zero, ready to loop.
export function noiseSound(settings: NoiseSettings, seconds: number, rate: number): Float32Array<ArrayBuffer> {
  const length = Math.round(seconds * rate);
  const seam = Math.round(SEAM * rate);
  const raw = new Float32Array(length + seam);
  if (settings.kind === "white") {
    const next = random(settings.seed);
    for (let i = 0; i < raw.length; i++) raw[i] = next();
  } else {
    const noise = makeNoise(settings.kind, settings.seed);
    const octaves = Math.max(1, Math.floor(settings.octaves));
    const layers = Array.from({ length: octaves }, (_, o) => ({
      step: (HERTZ_PER_SCALE * settings.scale * settings.lacunarity ** o) / rate,
      amplitude: settings.gain ** o,
      shift: o * 31.7,
    }));
    for (let i = 0; i < raw.length; i++) {
      let sum = 0;
      for (const layer of layers) {
        const x = i * layer.step + layer.shift;
        sum += layer.amplitude * noise(x, x * SLOPE + layer.shift);
      }
      raw[i] = sum;
    }
  }
  const out = new Float32Array(length);
  out.set(raw.subarray(0, length));
  for (let i = 0; i < seam; i++) {
    const t = i / seam;
    out[i] = out[i] * t + raw[length + i] * (1 - t);
  }
  // Centred on zero and as loud as possible without going over.
  let mean = 0;
  for (const v of out) mean += v;
  mean /= length;
  let peak = 0;
  for (let i = 0; i < length; i++) { out[i] -= mean; peak = Math.max(peak, Math.abs(out[i])); }
  if (peak > 0) for (let i = 0; i < length; i++) out[i] /= peak;
  return out;
}
