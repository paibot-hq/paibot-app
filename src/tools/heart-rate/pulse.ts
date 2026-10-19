// Heart rate from a fingertip over the camera (photoplethysmography): with each beat a little more blood fills the
// fingertip and it lets a little less light through, so the red of the picture dips and rises with the pulse. These
// pure functions turn the picture's average colour over time into a pulse wave and a rate, so they are tested without
// a camera.

export type Sample = { t: number; r: number; g: number; b: number };

// The rates looked for, in beats a minute.
export const MIN_BPM = 40;
export const MAX_BPM = 200;
const RATE = 30;              // samples a second, after resampling
export const MEASURE_S = 20;  // how long a measurement lasts (long enough for ten beats at the slowest)
export const WARMUP_S = 2;    // the first seconds are left out: the camera settles its exposure

// Whether a frame looks like a fingertip over the lens: mostly red, bright enough, little green or blue.
export function isFinger({ r, g, b }: Omit<Sample, "t">): boolean {
  return r > 60 && r > g * 1.6 && r > b * 1.6;
}

// The samples (seconds, red) at an even RATE a second, by linear interpolation.
export function resample(samples: readonly { t: number; v: number }[], rate = RATE): number[] {
  if (samples.length < 2) return [];
  const start = samples[0].t, end = samples[samples.length - 1].t;
  const out: number[] = [];
  let j = 0;
  for (let t = start; t <= end; t += 1 / rate) {
    while (j < samples.length - 2 && samples[j + 1].t < t) j++;
    const a = samples[j], b = samples[j + 1];
    const k = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
    out.push(a.v + (b.v - a.v) * Math.min(1, Math.max(0, k)));
  }
  return out;
}

const movingAverage = (x: readonly number[], size: number) => {
  const half = Math.floor(size / 2);
  return x.map((_, i) => {
    let sum = 0, n = 0;
    for (let k = Math.max(0, i - half); k <= Math.min(x.length - 1, i + half); k++) { sum += x[k]; n++; }
    return sum / n;
  });
};

// The pulse wave: the slow drift (pressure, light) taken out by a 1.5 s moving average, the jitter smoothed by a short
// one, turned so that a beat (darker red) points up, and scaled to -1..1.
export function pulseWave(values: readonly number[], rate = RATE): number[] {
  if (values.length < 3) return [];
  const slow = movingAverage(values, Math.round(rate * 1.5));
  const smooth = movingAverage(values.map((v, i) => slow[i] - v), Math.max(1, Math.round(rate / 10)));
  const peak = Math.max(1e-9, ...smooth.map(Math.abs));
  return smooth.map(v => v / peak);
}

// A peak this many times the band's average strength counts as a fully clear pulse.
const PROMINENCE_FULL = 200;

// The rate of a pulse wave, from its spectrum: the strongest frequency between MIN_BPM and MAX_BPM, looked for every
// quarter beat a minute (a direct Fourier sum, with a Hann window). A pulse has no strength at half its rate, so this is
// not fooled into halving it; it could be fooled into doubling it by a strong second harmonic (the small notch after
// each beat), so a frequency at half the strongest that is nearly as strong is the beat instead. The share of the
// strength within half a beat a second of the peak (0 to 1) says how clear the pulse is.
export function estimateBpm(wave: readonly number[], rate = RATE): { bpm: number; quality: number } | null {
  const n = wave.length;
  if (n < rate * 4) return null;
  const mean = wave.reduce((a, b) => a + b, 0) / n;
  const x = wave.map((v, i) => (v - mean) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1))));
  const power = (bpm: number) => {
    const w = (2 * Math.PI * bpm) / 60 / rate;
    let re = 0, im = 0;
    for (let i = 0; i < n; i++) { re += x[i] * Math.cos(w * i); im += x[i] * Math.sin(w * i); }
    return re * re + im * im;
  };
  const STEP = 0.25;
  const grid = Array.from({ length: Math.round((MAX_BPM - MIN_BPM) / STEP) + 1 }, (_, i) => MIN_BPM + i * STEP);
  const spectrum = grid.map(power);
  const total = spectrum.reduce((a, b) => a + b, 0);
  if (!(total > 0)) return null;
  let best = 0;
  for (let i = 1; i < spectrum.length; i++) if (spectrum[i] > spectrum[best]) best = i;
  // A strong harmonic (twice or three times the rate) taken for the beat: if a third or half of the rate is nearly as
  // strong, that is the beat (the lowest such, a third before a half).
  for (const divisor of [3, 2]) {
    const index = Math.round((grid[best] / divisor - MIN_BPM) / STEP);
    if (index < 0) continue;
    let h = index;
    for (let i = Math.max(0, index - 8); i <= Math.min(spectrum.length - 1, index + 8); i++) if (spectrum[i] > spectrum[h]) h = i;
    if (spectrum[h] > 0.6 * spectrum[best]) { best = h; break; }
  }
  const bpm = grid[best];
  // How far the peak stands above the rest: its strength over the band's median (which the peak and its shoulders do
  // not pull up), as 0 (no peak) to 1.
  const median = [...spectrum].sort((p, q) => p - q)[Math.floor(spectrum.length / 2)];
  const prominence = spectrum[best] / Math.max(median, total * 1e-12);
  return { bpm: Math.round(bpm), quality: Math.max(0, Math.min(1, (prominence - 1) / (PROMINENCE_FULL - 1))) };
}

// The rate of a measurement: the red of each frame after the warm-up, resampled, made a pulse wave and timed.
export function measure(samples: readonly Sample[]): { bpm: number; quality: number; wave: number[] } | null {
  if (!samples.length) return null;
  const start = samples[0].t + WARMUP_S;
  const kept = samples.filter(s => s.t >= start).map(s => ({ t: s.t, v: s.r }));
  const wave = pulseWave(resample(kept));
  const result = estimateBpm(wave);
  return result && { ...result, wave };
}

// Good enough to show: a clear pulse. (Over many test runs, pure noise stays under 0.1, and a fingertip with the
// noise of a real camera's frame average, slow or fast, over 0.13.)
export const isClear = (quality: number) => quality >= 0.12;
