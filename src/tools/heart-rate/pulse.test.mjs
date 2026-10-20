import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MEASURE_S, estimateBpm, isClear, isFinger, measure, pulseWave, resample } from './pulse.ts';

// A seeded generator, so the noisy tests are the same every run.
const random = seed => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// What a camera sees of a fingertip: red near 180 that dips with each beat (a sharp rise of blood, a slower ebb, a small
// notch after), drifting slowly as the finger presses, with noise, at an uneven ~30 frames a second.
function fingertip(bpm, { seconds = MEASURE_S, noise = 0.6, drift = 6, fps = 30, seed = 1 } = {}) {
  const next = random(seed);
  const samples = [];
  for (let t = 0; t < seconds; t += (1 / fps) * (0.8 + 0.4 * next())) {
    const phase = ((t * bpm) / 60) % 1;
    const beat = Math.exp(-((phase - 0.15) ** 2) / 0.006) + 0.3 * Math.exp(-((phase - 0.45) ** 2) / 0.004);
    const r = 180 - 2.5 * beat + drift * Math.sin(t * 0.4) + noise * (next() * 2 - 1) * 2;
    samples.push({ t, r, g: 20, b: 25 });
  }
  return samples;
}

test('a fingertip over the lens is mostly bright red; a room or a face is not', () => {
  assert.ok(isFinger({ r: 180, g: 20, b: 25 }));
  assert.ok(!isFinger({ r: 120, g: 110, b: 100 }), 'a grey room');
  assert.ok(!isFinger({ r: 30, g: 5, b: 5 }), 'too dark: the lens not lit');
  assert.ok(!isFinger({ r: 200, g: 150, b: 120 }), 'skin seen from afar, not a covered lens');
});

test('resampling gives evenly spaced values that follow the samples', () => {
  const out = resample([{ t: 0, v: 0 }, { t: 1, v: 30 }], 30);
  assert.equal(out.length, 31);
  assert.ok(Math.abs(out[15] - 15) < 1e-9);
  assert.deepEqual(resample([{ t: 0, v: 1 }]), []);
});

test('the rate of a fingertip is found within two beats a minute, at rest and after running', () => {
  for (const bpm of [48, 60, 72, 85, 100, 125, 150, 180]) {
    for (const seed of [1, 2, 3]) {
      const result = measure(fingertip(bpm, { seed }));
      assert.ok(result, `${bpm}`);
      assert.ok(Math.abs(result.bpm - bpm) <= 2, `${bpm} bpm (seed ${seed}): got ${result.bpm}`);
      assert.ok(isClear(result.quality), `${bpm}: quality ${result.quality}`);
    }
  }
});

test('the notch after each beat does not double the rate, and a slow drift does not halve it', () => {
  const result = measure(fingertip(64, { drift: 15 }));
  assert.ok(Math.abs(result.bpm - 64) <= 2, `got ${result.bpm}`);
});

test('noise alone gives no clear pulse', () => {
  const next = random(7);
  const samples = Array.from({ length: 450 }, (_, i) => ({ t: i / 30, r: 180 + (next() * 2 - 1) * 4, g: 20, b: 25 }));
  const result = measure(samples);
  assert.ok(!result || !isClear(result.quality), `quality ${result?.quality}`);
});

test('too little to go on gives nothing', () => {
  assert.equal(estimateBpm([1, 2, 3]), null);
  assert.equal(measure([]), null);
  assert.deepEqual(pulseWave([1, 2]), []);
});

test('across the whole range, every rate is found and called clear', () => {
  const wrong = [];
  for (let bpm = 40; bpm <= 190; bpm += 3) {
    for (const seed of [11, 12]) {
      const result = measure(fingertip(bpm, { seed }));
      if (!result || Math.abs(result.bpm - bpm) > 2 || !isClear(result.quality)) wrong.push(`${bpm}: ${result?.bpm} (${result?.quality.toFixed(2)})`);
    }
  }
  assert.deepEqual(wrong, []);
});
