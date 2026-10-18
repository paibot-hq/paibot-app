import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NOISE_KINDS, PALETTES, colour, makeNoise, permutation, random, render, stretch } from './noise.ts';

const settings = kind => ({ kind, seed: 7, scale: 4, octaves: 4, gain: 0.5, lacunarity: 2 });
// The average difference between a pixel and the one to its right: small for smooth noise, large for white noise.
const roughness = (values, width) => {
  let sum = 0, count = 0;
  for (let i = 0; i < values.length; i++) if ((i + 1) % width) { sum += Math.abs(values[i + 1] - values[i]); count++; }
  return sum / count;
};

test('the generator gives the same numbers for the same seed, in [0, 1)', () => {
  const a = random(42), b = random(42), c = random(43);
  const first = Array.from({ length: 50 }, a);
  assert.deepEqual(first, Array.from({ length: 50 }, b));
  assert.notDeepEqual(first, Array.from({ length: 50 }, c));
  for (const v of first) assert.ok(v >= 0 && v < 1);
});

test('the permutation holds each of 0-255 once, repeated', () => {
  const perm = permutation(5);
  assert.equal(perm.length, 512);
  assert.deepEqual([...new Set(perm.slice(0, 256))].sort((x, y) => x - y), Array.from({ length: 256 }, (_, i) => i));
  for (let i = 0; i < 256; i++) assert.equal(perm[i], perm[i + 256]);
});

test('every kind stays in [0, 1], and the same seed draws the same image', () => {
  for (const kind of NOISE_KINDS) {
    const values = render(settings(kind), 64, 64);
    for (const v of values) assert.ok(v >= 0 && v <= 1, `${kind}: ${v}`);
    assert.deepEqual(values, render(settings(kind), 64, 64));
    assert.notDeepEqual(values, render({ ...settings(kind), seed: 8 }, 64, 64), `${kind} changes with the seed`);
  }
});

test('value and Perlin noise pass through their lattice values and zeros', () => {
  // Perlin noise is 0 (0.5 once mapped) at every lattice point.
  const perlin = makeNoise('perlin', 3);
  for (let i = 0; i < 10; i++) assert.equal(perlin(i, 2 * i), 0.5);
  // Value noise equals the random value at a lattice point, and is between its neighbours elsewhere.
  const value = makeNoise('value', 3);
  const corners = [value(4, 4), value(5, 4)];
  const between = value(4.5, 4);
  assert.ok(between >= Math.min(...corners) - 1e-12 && between <= Math.max(...corners) + 1e-12);
});

test('the smooth kinds are much smoother than white noise', () => {
  const white = roughness(render(settings('white'), 128, 128), 128);
  for (const kind of ['value', 'perlin', 'simplex', 'worley']) {
    const smooth = roughness(render({ ...settings(kind), octaves: 1 }, 128, 128), 128);
    assert.ok(smooth * 5 < white, `${kind}: ${smooth} vs white ${white}`);
  }
});

test('more octaves add detail, and a larger scale makes the features smaller', () => {
  const one = roughness(render({ ...settings('perlin'), octaves: 1 }, 128, 128), 128);
  const six = roughness(render({ ...settings('perlin'), octaves: 6 }, 128, 128), 128);
  assert.ok(six > one);
  const coarse = roughness(render({ ...settings('simplex'), octaves: 1, scale: 2 }, 128, 128), 128);
  const fine = roughness(render({ ...settings('simplex'), octaves: 1, scale: 16 }, 128, 128), 128);
  assert.ok(fine > coarse * 2);
});

test('stretching spreads the values over the whole of [0, 1]', () => {
  const values = stretch(new Float32Array([0.4, 0.5, 0.45]));
  assert.deepEqual([...values].map(v => Math.round(v * 100) / 100), [0, 1, 0.5]);
  assert.deepEqual([...stretch(new Float32Array([0.3, 0.3]))], [0.3, 0.3].map(v => Math.fround(v)));
});

test('the colour maps go from their first colour to their last', () => {
  assert.deepEqual(colour('gray', 0), [0, 0, 0]);
  assert.deepEqual(colour('gray', 1), [255, 255, 255]);
  assert.deepEqual(colour('heat', 0), [0, 0, 0]);
  assert.deepEqual(colour('heat', 1), [255, 255, 240]);
  // Low values on a height map are sea (blue), high ones snow.
  const [r, , b] = colour('terrain', 0.2);
  assert.ok(b > r);
  assert.deepEqual(colour('terrain', 1), [248, 248, 252]);
  for (const palette of PALETTES) for (let v = -0.5; v <= 1.5; v += 0.05) for (const c of colour(palette, v)) assert.ok(Number.isInteger(c) && c >= 0 && c <= 255);
});
