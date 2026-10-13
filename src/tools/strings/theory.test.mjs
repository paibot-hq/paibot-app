import assert from 'node:assert/strict';
import { MAX_SEMITONES, STRINGS, frequency, noteName, positionOf, pressed, semitonesAt, stringAt } from './theory.ts';
import { pluckSamples } from './pluck.ts';

function seeded(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// Names and pitches: the strings are G3 D4 A4 E5, a fifth apart, and A4 is 440 Hz.
assert.deepEqual(STRINGS.map(string => noteName(string.midi)), ['E5', 'A4', 'D4', 'G3']);
assert.ok(Math.abs(frequency(69) - 440) < 1e-9);
assert.ok(Math.abs(frequency(55) - 196) < 0.01);
assert.equal(noteName(61), 'C#4');

// The neck: the 12th fret is half the string, and a position and a pitch turn into each other.
assert.ok(Math.abs(positionOf(12) * (1 - 2 ** (-MAX_SEMITONES / 12)) - 0.5) < 1e-9);
assert.equal(positionOf(0), 0);
assert.ok(Math.abs(positionOf(MAX_SEMITONES) - 1) < 1e-9);
for (const s of [0, 1, 3.5, 7, 12, 14]) assert.ok(Math.abs(semitonesAt(positionOf(s)) - s) < 1e-9);
assert.ok(positionOf(2) - positionOf(1) < positionOf(1), 'frets get closer together up the neck');

// Where a finger lands. Mandolin: the fret above it. Violin: where it is, or the nearest semitone.
assert.equal(pressed('mandolin', -0.1, true), 0, 'behind the nut is the open string');
assert.equal(pressed('mandolin', positionOf(4.4), true), 5);
assert.equal(pressed('mandolin', positionOf(4) + 1e-6, true), 5, 'just over a fret line is the next fret');
assert.equal(pressed('mandolin', positionOf(0.3), true), 1);
assert.equal(pressed('mandolin', 1, true), MAX_SEMITONES);
assert.equal(pressed('violin', positionOf(4.4), true), 4);
assert.ok(Math.abs(pressed('violin', positionOf(4.4), false) - 4.4) < 1e-9);

// Which string a height is on, top to bottom.
assert.deepEqual([0, 0.2, 0.3, 0.6, 0.9, 1].map(stringAt), [0, 0, 1, 2, 3, 3]);

// A plucked string rings at the pitch asked for, and dies away.
for (const hz of [196, 440, 659.25]) {
  const sampleRate = 48000;
  const { data, f0 } = pluckSamples(sampleRate, hz, seeded(3));
  assert.ok(data.every(Number.isFinite), 'no bad samples');
  assert.ok(data.reduce((peak, x) => Math.max(peak, Math.abs(x)), 0) <= 1.0001, 'it does not clip');
  // The pitch the samples really have, from the first strong repeat; played at hz / f0 it lands on hz.
  const from = 2000, window = 4000;
  let best = 0, bestLag = 0;
  for (let lag = Math.floor(sampleRate / (f0 * 1.2)); lag < sampleRate / (f0 * 0.8); lag++) {
    let sum = 0;
    for (let i = 0; i < window; i++) sum += data[from + i] * data[from + i + lag];
    if (sum > best) { best = sum; bestLag = lag; }
  }
  assert.ok(Math.abs(sampleRate / bestLag - f0) / f0 < 0.025, `${hz}: the samples repeat at their own pitch (${sampleRate / bestLag} vs ${f0})`);
  assert.ok(Math.abs(f0 - hz) / hz < 0.03, 'and that is close to the note before it is played at hz / f0');
  const rms = (a, b) => Math.sqrt(data.slice(a, b).reduce((sum, x) => sum + x * x, 0) / (b - a));
  assert.ok(rms(data.length - 2000, data.length) < rms(0, 2000) * 0.3, 'it dies away');
}
// A low string rings longer than a high one.
assert.ok(pluckSamples(48000, 196, seeded(1)).data.length > pluckSamples(48000, 659, seeded(1)).data.length);
console.log('strings theory ok');
