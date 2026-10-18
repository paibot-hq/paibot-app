import { test } from 'node:test';
import assert from 'node:assert/strict';
import { noiseSound } from './hiss.ts';
import { NOISE_KINDS } from './noise.ts';

const RATE = 8000;
const settings = kind => ({ kind, seed: 4, scale: 4, octaves: 4, gain: 0.5, lacunarity: 2 });
// The average size of the change from one sample to the next: large for a hiss, small for a low rumble.
const jitter = samples => { let sum = 0; for (let i = 1; i < samples.length; i++) sum += Math.abs(samples[i] - samples[i - 1]); return sum / (samples.length - 1); };

test('every kind of noise gives a sound in [-1, 1], centred on zero, reaching its peak', () => {
  for (const kind of NOISE_KINDS) {
    const sound = noiseSound(settings(kind), 1, RATE);
    assert.equal(sound.length, RATE);
    let peak = 0, sum = 0;
    for (const v of sound) { assert.ok(v >= -1 && v <= 1, `${kind}: ${v}`); peak = Math.max(peak, Math.abs(v)); sum += v; }
    assert.ok(peak > 0.999, `${kind} peak ${peak}`);
    assert.ok(Math.abs(sum / sound.length) < 1e-3, `${kind} mean ${sum / sound.length}`);
  }
});

test('the kinds of noise sound different, and the same settings sound the same', () => {
  const sounds = NOISE_KINDS.map(kind => noiseSound(settings(kind), 0.5, RATE));
  for (let a = 0; a < sounds.length; a++) for (let b = a + 1; b < sounds.length; b++) assert.notDeepEqual(sounds[a], sounds[b]);
  assert.deepEqual(noiseSound(settings('perlin'), 0.5, RATE), noiseSound(settings('perlin'), 0.5, RATE));
  assert.notDeepEqual(noiseSound(settings('perlin'), 0.5, RATE), noiseSound({ ...settings('perlin'), seed: 5 }, 0.5, RATE));
});

test('white noise hisses, a smooth noise rumbles, and a larger scale or more octaves make it rougher', () => {
  const white = jitter(noiseSound(settings('white'), 1, RATE));
  const perlin = jitter(noiseSound(settings('perlin'), 1, RATE));
  assert.ok(white > perlin * 3, `white ${white} vs perlin ${perlin}`);
  const low = jitter(noiseSound({ ...settings('simplex'), octaves: 1, scale: 2 }, 1, RATE));
  const high = jitter(noiseSound({ ...settings('simplex'), octaves: 1, scale: 16 }, 1, RATE));
  assert.ok(high > low * 2, `scale 16 ${high} vs scale 2 ${low}`);
  const one = jitter(noiseSound({ ...settings('perlin'), octaves: 1 }, 1, RATE));
  const six = jitter(noiseSound({ ...settings('perlin'), octaves: 6 }, 1, RATE));
  assert.ok(six > one, `6 octaves ${six} vs 1 ${one}`);
});

test('the loop joins without a jump', () => {
  for (const kind of NOISE_KINDS) {
    if (kind === 'white') continue;
    const sound = noiseSound({ ...settings(kind), octaves: 1 }, 1, RATE);
    const typical = jitter(sound);
    assert.ok(Math.abs(sound[0] - sound[sound.length - 1]) < typical * 8 + 0.05, `${kind}: ${sound[0]} → ${sound[sound.length - 1]}`);
  }
});
