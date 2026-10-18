// Noise functions as used in computer graphics: white, value, Perlin, simplex and Worley (cellular) noise, layered into
// octaves (fractal Brownian motion), and colour maps that turn a value into a pixel. Pure functions, so they are tested
// without a browser. Every noise here returns a value in [0, 1] and is the same for the same seed.

export type NoiseKind = "white" | "value" | "perlin" | "simplex" | "worley";
export const NOISE_KINDS: readonly NoiseKind[] = ["white", "value", "perlin", "simplex", "worley"];

export type Palette = "gray" | "terrain" | "heat";
export const PALETTES: readonly Palette[] = ["gray", "terrain", "heat"];

export type NoiseSettings = {
  kind: NoiseKind;
  seed: number;
  // How many cells of the lattice span the image at the first octave.
  scale: number;
  octaves: number;
  // Each octave's amplitude relative to the one before (persistence), and its frequency (lacunarity).
  gain: number;
  lacunarity: number;
};

// A small, fast pseudo-random generator (mulberry32): the same seed gives the same sequence.
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

// The numbers 0-255 shuffled by the seed, written twice so that perm[i + j] needs no wrapping (Perlin's permutation table).
export function permutation(seed: number): Uint8Array {
  const next = random(seed);
  const table = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [table[i], table[j]] = [table[j], table[i]];
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = table[i & 255];
  return perm;
}

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Eight gradient directions for Perlin noise.
const GRADIENTS = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
// Simplex noise's skew factors for two dimensions.
const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

// One octave of the chosen noise at (x, y), in lattice units, in [0, 1].
export function makeNoise(kind: NoiseKind, seed: number): (x: number, y: number) => number {
  const perm = permutation(seed);
  const hash = (i: number, j: number) => perm[(i & 255) + perm[j & 255]];

  if (kind === "white") return (x, y) => hash(Math.floor(x), Math.floor(y)) / 255;

  if (kind === "value") {
    // A random value at every lattice point, blended smoothly in between.
    return (x, y) => {
      const i = Math.floor(x), j = Math.floor(y);
      const u = smooth(x - i), v = smooth(y - j);
      const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
      return lerp(lerp(a, b, u), lerp(c, d, u), v) / 255;
    };
  }

  if (kind === "perlin") {
    // A random gradient at every lattice point; the value is how far the point lies along each corner's gradient, blended.
    const dot = (h: number, x: number, y: number) => { const g = GRADIENTS[h & 7]; return g[0] * x + g[1] * y; };
    return (x, y) => {
      const i = Math.floor(x), j = Math.floor(y);
      const fx = x - i, fy = y - j;
      const u = fade(fx), v = fade(fy);
      const n = lerp(
        lerp(dot(hash(i, j), fx, fy), dot(hash(i + 1, j), fx - 1, fy), u),
        lerp(dot(hash(i, j + 1), fx, fy - 1), dot(hash(i + 1, j + 1), fx - 1, fy - 1), u),
        v,
      );
      // At most 1 in size with these gradients.
      return Math.min(1, Math.max(0, (n + 1) / 2));
    };
  }

  if (kind === "simplex") {
    // Ken Perlin's simplex noise: a lattice of triangles instead of squares, each corner adding a fading bump.
    const corner = (h: number, x: number, y: number) => {
      const t = 0.5 - x * x - y * y;
      if (t < 0) return 0;
      const g = GRADIENTS[h & 7];
      return t * t * t * t * (g[0] * x + g[1] * y);
    };
    return (x, y) => {
      const s = (x + y) * F2;
      const i = Math.floor(x + s), j = Math.floor(y + s);
      const t = (i + j) * G2;
      const x0 = x - (i - t), y0 = y - (j - t);
      const [i1, j1] = x0 > y0 ? [1, 0] : [0, 1];
      const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
      const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
      const n = corner(hash(i, j), x0, y0) + corner(hash(i + i1, j + j1), x1, y1) + corner(hash(i + 1, j + 1), x2, y2);
      // 70 brings the sum to about [-1, 1] (Gustavson's factor for these gradients is a little under 1 at the extremes).
      return Math.min(1, Math.max(0, (n * 70 + 1) / 2));
    };
  }

  // Worley noise: one random point in every cell; the value is the distance to the nearest, so it looks like cells.
  return (x, y) => {
    const i = Math.floor(x), j = Math.floor(y);
    let nearest = 2;
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        const h = hash(i + di, j + dj);
        const px = i + di + h / 255;
        const py = j + dj + perm[(h + 97) & 511] / 255;
        nearest = Math.min(nearest, Math.hypot(px - x, py - y));
      }
    }
    return Math.min(1, nearest);
  };
}

// The image as values in [0, 1], row by row. White noise is one random value per pixel, so it takes no scale or octaves.
export function render(settings: NoiseSettings, width: number, height: number): Float32Array {
  const out = new Float32Array(width * height);
  const noise = makeNoise(settings.kind, settings.seed);
  if (settings.kind === "white") {
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) out[y * width + x] = noise(x, y);
    return out;
  }
  const octaves = Math.max(1, Math.floor(settings.octaves));
  // Each octave is shifted, so the octaves' lattices do not all line up at the origin.
  const layers = Array.from({ length: octaves }, (_, o) => ({
    frequency: settings.lacunarity ** o * settings.scale / width,
    amplitude: settings.gain ** o,
    shift: o * 31.7,
  }));
  const total = layers.reduce((sum, layer) => sum + layer.amplitude, 0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (const layer of layers) sum += layer.amplitude * noise(x * layer.frequency + layer.shift, y * layer.frequency + layer.shift);
      out[y * width + x] = sum / total;
    }
  }
  return out;
}

// Spreads the values over the whole of [0, 1], so a few octaves (whose average sits near the middle) still use the full range.
export function stretch(values: Float32Array): Float32Array {
  let low = Infinity, high = -Infinity;
  for (const v of values) { if (v < low) low = v; if (v > high) high = v; }
  const range = high - low;
  if (!(range > 0)) return values.slice();
  return values.map(v => (v - low) / range);
}

type Stop = [number, number, number, number];
const ramp = (stops: Stop[], v: number): [number, number, number] => {
  for (let k = 1; k < stops.length; k++) {
    const [at, r, g, b] = stops[k];
    if (v <= at) {
      const [from, r0, g0, b0] = stops[k - 1];
      const t = (v - from) / (at - from);
      return [Math.round(lerp(r0, r, t)), Math.round(lerp(g0, g, t)), Math.round(lerp(b0, b, t))];
    }
  }
  const last = stops[stops.length - 1];
  return [last[1], last[2], last[3]];
};
// Sea, beach, grass, rock and snow, as a height map is usually coloured.
const TERRAIN: Stop[] = [[0, 12, 34, 84], [0.42, 38, 110, 180], [0.47, 222, 208, 150], [0.55, 92, 160, 70], [0.72, 46, 104, 52], [0.85, 128, 118, 108], [1, 248, 248, 252]];
const HEAT: Stop[] = [[0, 0, 0, 0], [0.35, 150, 20, 10], [0.65, 240, 120, 20], [0.85, 255, 220, 80], [1, 255, 255, 240]];

// The colour of a value in [0, 1].
export function colour(palette: Palette, v: number): [number, number, number] {
  const c = Math.min(1, Math.max(0, v));
  if (palette === "terrain") return ramp(TERRAIN, c);
  if (palette === "heat") return ramp(HEAT, c);
  const g = Math.round(c * 255);
  return [g, g, g];
}
