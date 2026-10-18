// Glitch noise, after the "noise" short video (video/harness/render.py): short scenes picked at random (TV snow, flowing
// colour waves, bars, a mosaic, moiré, a flash, the PAIBOT robot in the static), drawn on a coarse grid of cells, with
// glitches on top (rows slipping sideways, the colours split, the picture inverted, scan lines) and a sound for each
// scene. Pure functions, so they are tested without a browser or sound.
//
// Flashing is kept within WCAG 2.3.1 (at most three flashes a second), unlike the video: a scene lasts at least a third
// of a second, what recolours large areas (the flash scene, bars, the mosaic) does so at most three times a second, the
// picture is inverted at most once a second, and the gentle intensity (the default) neither flashes nor inverts. Snow
// and static still change every frame: their fine grain keeps the screen's overall brightness the same.

export type Mode = "snow" | "flow" | "bars" | "mosaic" | "moire" | "flash" | "signal";
export const MODES: readonly Mode[] = ["snow", "flow", "bars", "mosaic", "moire", "flash", "signal"];
export type Intensity = "mild" | "wild";

type Rgb = readonly [number, number, number];
export const PALETTES: Record<Intensity, readonly Rgb[]> = {
  wild: [[255, 0, 102], [0, 255, 200], [255, 230, 0], [40, 0, 255], [0, 0, 0], [255, 255, 255], [255, 120, 0], [120, 255, 0]],
  mild: [[255, 190, 200], [190, 235, 255], [200, 245, 215], [255, 235, 170], [215, 200, 250], [250, 246, 240], [150, 170, 205], [240, 215, 195]],
};
// How often each scene comes up, in the order of MODES; the gentle intensity has no flash.
const WEIGHTS: Record<Intensity, readonly number[]> = {
  wild: [0.17, 0.2, 0.17, 0.15, 0.12, 0.08, 0.11],
  mild: [0.14, 0.3, 0.12, 0.2, 0.1, 0, 0.14],
};
// How long a scene lasts, in seconds, and how likely each length is.
const LENGTHS: Record<Intensity, { seconds: readonly number[]; weights: readonly number[] }> = {
  wild: { seconds: [0.34, 0.42, 0.55, 0.7, 1.1], weights: [0.3, 0.25, 0.2, 0.15, 0.1] },
  mild: { seconds: [0.35, 0.6, 0.9, 1.4], weights: [0.35, 0.3, 0.2, 0.15] },
};
// The fastest a large area may change colour: three times a second (WCAG 2.3.1).
export const FLASHES_PER_SECOND = 3;
// The least time between two inversions of the whole picture, in seconds.
export const INVERT_GAP = 1;

// A small, fast pseudo-random generator (mulberry32): the same seed gives the same sequence in [0, 1).
export function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (next: () => number, weights: readonly number[]) => {
  let r = next() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r < 0 && weights[i] > 0) return i; }
  return weights.findLastIndex(w => w > 0);
};
const uniform = (next: () => number, low: number, high: number) => low + (high - low) * next();
const int = (next: () => number, low: number, high: number) => Math.floor(uniform(next, low, high));
// A normally distributed number (Box-Muller).
const gauss = (next: () => number) => Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next());

export type Segment = { start: number; end: number; mode: Mode; seed: number };

// The scene after `start`: random, or always `mode` when one is chosen (each scene still gets a seed of its own, so it
// looks different every time).
export function nextSegment(next: () => number, start: number, intensity: Intensity, mode: Mode | null): Segment {
  const lengths = LENGTHS[intensity];
  const seconds = lengths.seconds[pick(next, lengths.weights)];
  return { start, end: start + seconds, mode: mode ?? MODES[pick(next, WEIGHTS[intensity])], seed: Math.floor(next() * 2 ** 30) };
}

// The scene drawn on a grid of `w` x `h` cells, as RGB bytes row by row, `local` seconds into the scene. `frame`
// changes every frame and gives the fine-grained scenes (snow, static) their new random numbers; the bars and the
// mosaic, which recolour large areas, take new ones only three times a second.
export function drawCells(segment: Segment, intensity: Intensity, local: number, frame: number, w: number, h: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h * 3);
  const pal = PALETTES[intensity];
  const params = random(segment.seed);
  const now = random(segment.seed ^ Math.imul(frame + 1, 0x9e3779b1));
  const beat = random(segment.seed ^ Math.imul(Math.floor(local * FLASHES_PER_SECOND) + 1, 0x85ebca6b));
  const set = (i: number, [r, g, b]: Rgb) => { out[i * 3] = r; out[i * 3 + 1] = g; out[i * 3 + 2] = b; };
  const mild = intensity === "mild";

  if (segment.mode === "snow") {
    if (mild) {
      // A pastel tint with soft grain.
      const tint = pal[int(params, 0, pal.length)];
      for (let i = 0; i < w * h; i++) { const n = gauss(now) * 26; set(i, [tint[0] + n, tint[1] + n, tint[2] + n]); }
    } else if (now() < 0.5) {
      for (let i = 0; i < w * h; i++) set(i, [int(now, 0, 256), int(now, 0, 256), int(now, 0, 256)]);
    } else {
      for (let i = 0; i < w * h; i++) { const v = int(now, 0, 256); set(i, [v, v, v]); }
    }
  } else if (segment.mode === "flow") {
    // Three sine waves added up and cut into a few bands of colour, drifting.
    const [a, b, c, d, e, f] = Array.from({ length: 6 }, () => uniform(params, 0.5, 7));
    const speed = uniform(params, 2, 14);
    const levels = int(params, 2, 6);
    const colours = shuffled(params, pal).slice(0, levels);
    const tt = local * speed + uniform(params, 0, 6);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const xx = x / w, yy = y / h;
        const v = Math.sin(xx * a * 6 + tt * b * 0.3) + Math.sin(yy * c * 6 - tt * d * 0.3) + Math.sin((xx + yy) * e * 5 + tt * f * 0.2);
        set(y * w + x, colours[((Math.floor(((v + 3) / 6) * levels) % levels) + levels) % levels]);
      }
    }
  } else if (segment.mode === "bars") {
    // Horizontal bands, each split once into two colours and slid sideways.
    const edges = [0, ...Array.from({ length: int(params, 18, 70) }, () => int(params, 0, h)).sort((p, q) => p - q), h];
    for (let k = 0; k < edges.length - 1; k++) {
      const left = pal[int(beat, 0, pal.length)], right = pal[int(beat, 0, pal.length)];
      const cut = int(beat, 0, w), slide = int(beat, -Math.floor(w / 3), Math.floor(w / 3));
      for (let y = edges[k]; y < edges[k + 1]; y++) {
        for (let x = 0; x < w; x++) set(y * w + x, (((x - slide) % w) + w) % w < cut ? right : left);
      }
    }
  } else if (segment.mode === "mosaic") {
    const [gw, gh] = [[4, 3], [8, 6], [16, 12], [32, 24]][int(params, 0, 4)];
    const cells = Array.from({ length: gw * gh }, () => pal[int(beat, 0, pal.length)]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) set(y * w + x, cells[Math.floor((y * gh) / h) * gw + Math.floor((x * gw) / w)]);
  } else if (segment.mode === "moire") {
    // Two sets of stripes at slightly different angles; where they disagree shows the interference.
    const th1 = uniform(params, 0, Math.PI) + local * uniform(params, -0.8, 0.8);
    const th2 = th1 + uniform(params, 0.02, 0.5);
    const f1 = uniform(params, 8, 60), f2 = uniform(params, 8, 60);
    const [ca, cb] = shuffled(params, pal);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const xx = x / w, yy = (y / h) * 0.75;
        const s1 = Math.cos(2 * Math.PI * f1 * (xx * Math.cos(th1) + yy * Math.sin(th1)) + local * 6) > 0;
        const s2 = Math.cos(2 * Math.PI * f2 * (xx * Math.cos(th2) + yy * Math.sin(th2)) - local * 4) > 0;
        set(y * w + x, s1 !== s2 ? ca : cb);
      }
    }
  } else if (segment.mode === "flash") {
    // One colour over everything, changing at most three times a second (once a second when gentle), with a few
    // specks of its opposite when wild.
    const tick = Math.floor(local * (mild ? 1 : FLASHES_PER_SECOND));
    const colour = pal[int(random(segment.seed + tick * 7919), 0, pal.length)];
    for (let i = 0; i < w * h; i++) set(i, !mild && now() < 0.02 ? [255 - colour[0], 255 - colour[1], 255 - colour[2]] : colour);
  } else {
    // signal: dark static, where the robot's face shows (drawn by the page on top).
    for (let i = 0; i < w * h; i++) {
      if (mild) { const n = gauss(now) * 10; set(i, [92 + n, 108 + n, 140 + n]); }
      else { const v = int(now, 0, 70); set(i, [v, v, v]); }
    }
  }
  return out;
}

function shuffled<T>(next: () => number, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

// ---- Glitches, on the full picture as RGBA bytes ----

// Rows y0 to y0 + rows slid `dx` pixels sideways, wrapping round.
export function slipRows(data: Uint8ClampedArray, width: number, y0: number, rows: number, dx: number) {
  const height = data.length / 4 / width;
  const line = new Uint8ClampedArray(width * 4);
  const shift = ((Math.round(dx) % width) + width) % width;
  if (shift === 0) return;
  for (let y = Math.max(0, y0); y < Math.min(height, y0 + rows); y++) {
    const row = data.subarray(y * width * 4, (y + 1) * width * 4);
    line.set(row);
    row.set(line.subarray((width - shift) * 4), 0);
    row.set(line.subarray(0, (width - shift) * 4), shift * 4);
  }
}

// The red channel moved `dx` pixels right and the blue `dx` left, as when a picture's colours fall out of register.
export function splitColours(data: Uint8ClampedArray, width: number, dx: number) {
  const height = data.length / 4 / width;
  const copy = data.slice();
  const d = Math.round(dx);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      data[i] = copy[(y * width + (((x - d) % width) + width) % width) * 4];
      data[i + 2] = copy[(y * width + (((x + d) % width) + width) % width) * 4 + 2];
    }
  }
}

export function invert(data: Uint8ClampedArray) {
  for (let i = 0; i < data.length; i += 4) { data[i] = 255 - data[i]; data[i + 1] = 255 - data[i + 1]; data[i + 2] = 255 - data[i + 2]; }
}

// Every fourth row darkened, like a CRT's scan lines.
export function scanLines(data: Uint8ClampedArray, width: number) {
  const height = data.length / 4 / width;
  for (let y = 0; y < height; y += 4) for (let i = y * width * 4; i < (y + 1) * width * 4; i += 4) { data[i] *= 0.72; data[i + 1] *= 0.72; data[i + 2] *= 0.72; }
}

// The gentle intensity lifts the blacks and lowers the contrast.
export function soften(data: Uint8ClampedArray) {
  for (let i = 0; i < data.length; i += 4) { data[i] = data[i] * 0.78 + 46; data[i + 1] = data[i + 1] * 0.78 + 46; data[i + 2] = data[i + 2] * 0.78 + 46; }
}

export type Glitch = "slip" | "split" | "invert" | "scan";
export const GLITCHES: readonly Glitch[] = ["slip", "split", "invert", "scan"];

export type GlitchPlan = { slips: { y: number; rows: number; dx: number }[]; split: number; invert: boolean; scan: boolean; robot: boolean };

// Which glitches hit this frame, `t` seconds in. Inversion changes the whole screen, so it is only allowed once
// INVERT_GAP seconds have passed since `lastInvert` (and never when gentle).
export function planGlitches(next: () => number, on: ReadonlySet<Glitch>, intensity: Intensity, width: number, height: number, t: number, lastInvert: number): GlitchPlan {
  const mild = intensity === "mild";
  const strength = mild ? 0.25 : 1;
  const k = width / 1080;
  const slips: GlitchPlan["slips"] = [];
  if (on.has("slip") && next() < 0.7 * (mild ? 0.5 : 1)) {
    for (let n = int(next, 0, 6); n > 0; n--) {
      slips.push({ y: int(next, 0, height), rows: Math.max(1, Math.round(int(next, 6, 140) * k * (mild ? 0.5 : 1))), dx: Math.round(int(next, -300, 300) * k * strength) });
    }
  }
  const split = on.has("split") && next() < 0.6 ? Math.round(int(next, 4, 46) * k * strength) : 0;
  const invert = !mild && on.has("invert") && t - lastInvert >= INVERT_GAP && next() < 0.12;
  return { slips, split, invert, scan: on.has("scan") && !mild, robot: next() < (mild ? 0.02 : 0.035) };
}

// ---- Sound ----

// The sound of a scene, `seconds` long at `rate` samples a second, or null for the scenes left silent (about one in
// seven, so the sound cannot be predicted either). The same scene always sounds the same.
export function sceneSound(segment: Segment, intensity: Intensity, seconds: number, rate: number): Float32Array<ArrayBuffer> | null {
  const next = random(segment.seed + 5);
  const mild = intensity === "mild";
  if (segment.mode !== "flash" && next() < 0.15) return null;
  const length = Math.max(8, Math.round(seconds * rate));
  const out = new Float32Array(length);
  const at = (i: number) => i / rate;
  let gain = 0.3;
  if (segment.mode === "snow") {
    // Static: noise held for a few samples at a time (gritty), chopped on and off.
    const hold = int(next, 1, 40), chop = uniform(next, 2, 40);
    let v = 0;
    for (let i = 0; i < length; i++) {
      if (i % hold === 0) v = gauss(next);
      out[i] = Math.sin(2 * Math.PI * chop * at(i)) > -0.2 ? v : 0;
    }
    if (mild) smooth(out, 48, 4);
    gain = 0.45;
  } else if (segment.mode === "flow") {
    // A tone sliding from one pitch to another, wobbling.
    const [f0, f1] = [0, 0].map(() => Math.exp(uniform(next, Math.log(60), Math.log(2400))));
    const depth = uniform(next, 1, 9), wobble = uniform(next, 3, 60);
    let phase = 0;
    for (let i = 0; i < length; i++) {
      phase += (2 * Math.PI * (f0 + ((f1 - f0) * i) / length)) / rate;
      out[i] = Math.sin(phase + depth * Math.sin(2 * Math.PI * wobble * at(i)));
    }
    gain = 0.3;
  } else if (segment.mode === "bars") {
    // A short grain of buzz, repeated.
    const grainLength = Math.max(1, Math.round(uniform(next, 0.008, 0.06) * rate));
    const pitch = uniform(next, 100, mild ? 900 : 3000);
    const grain = Array.from({ length: grainLength }, (_, i) => gauss(next) * (mild ? 0.1 : 0.7) + Math.sin((2 * Math.PI * pitch * i) / rate));
    for (let i = 0; i < length; i++) out[i] = grain[i % grainLength];
    gain = 0.4;
  } else if (segment.mode === "mosaic") {
    // A new random pitch twelve times a second: a square wave (a soft sine when gentle).
    const step = Math.round(rate / 12);
    let phase = 0, f = 0;
    for (let i = 0; i < length; i++) {
      if (i % step === 0) f = Math.exp(uniform(next, Math.log(90), Math.log(3200)));
      phase += (2 * Math.PI * f) / rate;
      out[i] = mild ? Math.sin(phase) : Math.sign(Math.sin(phase));
    }
    gain = 0.2;
  } else if (segment.mode === "moire") {
    // Two close pitches beating against each other, as the stripes do.
    const f = uniform(next, 180, 1300), beat = uniform(next, 3, 40);
    for (let i = 0; i < length; i++) out[i] = Math.sin(2 * Math.PI * f * at(i)) + Math.sin(2 * Math.PI * (f + beat) * at(i));
    gain = 0.22;
  } else if (segment.mode === "flash") {
    // A burst of noise over a low thump.
    for (let i = 0; i < length; i++) out[i] = gauss(next) * Math.exp(-at(i) * 90) + Math.sin(2 * Math.PI * 55 * at(i)) * Math.exp(-at(i) * 14) * 1.3;
    gain = 0.7;
  } else {
    // signal: the robot appears with a small beep-beep.
    for (let i = 0; i < length; i++) {
      const x = at(i);
      out[i] = (Math.sin(2 * Math.PI * 880 * x) * (x < 0.04 ? 1 : 0) + Math.sin(2 * Math.PI * 1320 * x) * (x > 0.07 && x < 0.11 ? 1 : 0)) * 0.8 + gauss(next) * 0.05;
    }
    gain = 0.35;
  }
  if (segment.mode !== "flash") {
    // Fades at both ends, so the cuts do not click (longer fades when gentle).
    const edge = Math.min(Math.floor(length / 2), Math.round((mild ? 0.02 : 0.002) * rate));
    for (let i = 0; i < edge; i++) { const v = i / edge; out[i] *= v; out[length - 1 - i] *= v; }
  }
  const level = gain * (mild ? 0.55 : 1);
  for (let i = 0; i < length; i++) out[i] = Math.tanh(out[i] * level * 1.4);
  return out;
}

// A moving average over `size` samples, times `boost`: a soft, windy noise.
function smooth(data: Float32Array, size: number, boost: number) {
  const copy = data.slice();
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += copy[i];
    if (i >= size) sum -= copy[i - size];
    data[i] = (sum / size) * boost;
  }
}
