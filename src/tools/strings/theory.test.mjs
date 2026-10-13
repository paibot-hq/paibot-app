import assert from 'node:assert/strict';
import { frequency, noteName, positionOf, pressed, semitonesAt, stringAt } from './theory.ts';
import { INSTRUMENTS, INSTRUMENT_IDS } from './instruments.ts';
import { pluckSamples, STANDARD_PLUCK } from './pluck.ts';

function seeded(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
const open = (id, course) => INSTRUMENTS[id].strings[course].midi;
const name = (id, course) => noteName(open(id, course));

// Names and pitches: A4 is 440 Hz.
assert.ok(Math.abs(frequency(69) - 440) < 1e-9);
assert.ok(Math.abs(frequency(55) - 196) < 0.01);
assert.equal(noteName(61), 'C#4');

// The standard tunings, top string of the picture first.
assert.deepEqual(INSTRUMENTS.mandolin.strings.map((s, i) => name('mandolin', i)), ['E5', 'A4', 'D4', 'G3']);
assert.deepEqual(INSTRUMENTS.guitar.strings.map((s, i) => name('guitar', i)), ['E4', 'B3', 'G3', 'D3', 'A2', 'E2']);
assert.deepEqual(INSTRUMENTS.bass.strings.map((s, i) => name('bass', i)), ['G2', 'D2', 'A1', 'E1']);
assert.deepEqual(INSTRUMENTS.cello.strings.map((s, i) => name('cello', i)), ['A3', 'D3', 'G2', 'C2']);
assert.deepEqual(INSTRUMENTS.ukulele.strings.map((s, i) => name('ukulele', i)), ['A4', 'E4', 'C4', 'G4'], 'a ukulele is re-entrant: its G is above its C');
assert.deepEqual(INSTRUMENTS.shamisen.strings.map((s, i) => name('shamisen', i)), ['C4', 'F3', 'C3']);
// A violin family is tuned in fifths, a bass in fourths, a guitar in fourths with one third.
for (const id of ['mandolin', 'violin', 'viola', 'cello']) {
  const midis = INSTRUMENTS[id].strings.map(s => s.midi);
  for (let i = 1; i < midis.length; i++) assert.equal(midis[i - 1] - midis[i], 7, `${id} is in fifths`);
}
for (const id of ['bass', 'doublebass']) {
  const midis = INSTRUMENTS[id].strings.map(s => s.midi);
  for (let i = 1; i < midis.length; i++) assert.equal(midis[i - 1] - midis[i], 5, `${id} is in fourths`);
}

// Every instrument is complete: strings, a sound, a look, and a way to be plucked or bowed.
for (const id of INSTRUMENT_IDS) {
  const spec = INSTRUMENTS[id];
  assert.equal(spec.id, id);
  assert.ok(spec.strings.length >= 3 && spec.strings.length <= 6, `${id} has a number of strings`);
  assert.ok(spec.reach >= 12 && spec.reach <= 17);
  assert.ok(spec.sound.level > 0 && spec.look.wood);
  if (spec.sound.kind === 'bow') assert.equal(spec.pizzicato?.kind, 'pluck', `${id} can also be plucked`);
  else assert.ok(spec.sound.halfLife > 0 && spec.sound.shift > 0 && spec.sound.shift <= 0.5);
  for (const string of spec.strings) assert.ok(string.midi >= 24 && string.midi <= 84);
}

// The neck: the 12th fret is half the string, and a position and a pitch turn into each other.
for (const reach of [12, 14, 15, 17]) {
  assert.equal(positionOf(0, reach), 0);
  assert.ok(Math.abs(positionOf(reach, reach) - 1) < 1e-9);
  for (const s of [0, 1, 3.5, 7, 12]) if (s <= reach) assert.ok(Math.abs(semitonesAt(positionOf(s, reach), reach) - s) < 1e-9);
}
assert.ok(Math.abs(positionOf(12, 14) * (1 - 2 ** (-14 / 12)) - 0.5) < 1e-9);
assert.ok(positionOf(2, 14) - positionOf(1, 14) < positionOf(1, 14), 'frets get closer together up the neck');

// Where a finger lands. Fretted: the fret above it. Fretless: where it is, or the nearest semitone.
const mandolin = INSTRUMENTS.mandolin, violin = INSTRUMENTS.violin, guitar = INSTRUMENTS.guitar, banjo = INSTRUMENTS.banjo;
const press = (spec, course, u, snap = true) => pressed(spec, spec.strings[course], u, snap);
assert.equal(press(mandolin, 0, -0.1), 0, 'behind the nut is the open string');
assert.equal(press(mandolin, 0, positionOf(4.4, 14)), 5);
assert.equal(press(mandolin, 0, positionOf(4, 14) + 1e-6), 5, 'just over a fret line is the next fret');
assert.equal(press(mandolin, 0, positionOf(0.3, 14)), 1);
assert.equal(press(mandolin, 0, 1), 14);
assert.equal(press(guitar, 5, positionOf(2.5, 15)), 3);
assert.equal(press(violin, 0, positionOf(4.4, 14)), 4);
assert.ok(Math.abs(press(violin, 0, positionOf(4.4, 14), false) - 4.4) < 1e-9);
// A banjo's 5th string starts at the 5th fret: before it, it is open; after it, it counts from there.
assert.equal(press(banjo, 4, positionOf(3.5, 17)), 0);
assert.equal(press(banjo, 4, positionOf(5, 17) - 1e-6), 0);
assert.equal(press(banjo, 4, positionOf(6.5, 17)), 2);
assert.equal(press(banjo, 3, positionOf(6.5, 17)), 7, 'the other strings count from the nut');

// Which string a height is on, top to bottom, for any number of strings.
assert.deepEqual([0, 0.2, 0.3, 0.6, 0.9, 1].map(v => stringAt(v, 4)), [0, 0, 1, 2, 3, 3]);
assert.deepEqual([0, 0.5, 0.99, 1].map(v => stringAt(v, 6)), [0, 3, 5, 5]);

// A plucked string rings at the pitch asked for, and dies away, whatever the instrument's pluck is like.
const shamisenPluck = { halfLife: 0.5, shift: 0.2, smooth: 0.1, pick: 0.1 };
for (const [hz, pluck] of [[196, STANDARD_PLUCK], [440, STANDARD_PLUCK], [659.25, STANDARD_PLUCK], [82.4, { ...STANDARD_PLUCK, halfLife: 1.5, shift: 0.42 }], [262, shamisenPluck], [196, shamisenPluck]]) {
  const sampleRate = 48000;
  const { data, f0 } = pluckSamples(sampleRate, hz, seeded(3), 2.6, pluck);
  assert.ok(data.every(Number.isFinite), 'no bad samples');
  assert.ok(data.reduce((peak, x) => Math.max(peak, Math.abs(x)), 0) <= 1.0001, 'it does not clip');
  // The pitch the samples really have, from the first strong repeat; played at hz / f0 it lands on hz.
  const from = 3000, window = 4000;
  let best = 0, bestLag = 0;
  for (let lag = Math.floor(sampleRate / (f0 * 1.2)); lag < sampleRate / (f0 * 0.8); lag++) {
    let sum = 0;
    for (let i = 0; i < window; i++) sum += data[from + i] * data[from + i + lag];
    if (sum > best) { best = sum; bestLag = lag; }
  }
  assert.ok(Math.abs(sampleRate / bestLag - f0) / f0 < 0.025, `${hz}: the samples repeat at their own pitch (${sampleRate / bestLag} vs ${f0})`);
  assert.ok(Math.abs(f0 - hz) / hz < 0.03, 'and that is close to the note before it is played at hz / f0');
  const rms = (a, b) => Math.sqrt(data.slice(a, b).reduce((sum, x) => sum + x * x, 0) / (b - a));
  assert.ok(rms(data.length - 2000, data.length) < rms(3000, 5000) * 0.5, 'it dies away');
}
// A low string rings longer than a high one, and a brighter pluck keeps more of its high harmonics.
assert.ok(pluckSamples(48000, 196, seeded(1)).data.length > pluckSamples(48000, 659, seeded(1)).data.length);
{
  const roughness = ({ data }) => { let sum = 0; for (let i = 1; i < 6000; i++) sum += Math.abs(data[i] - data[i - 1]); return sum; };
  const dull = pluckSamples(48000, 330, seeded(5), 2.6, { ...STANDARD_PLUCK, shift: 0.5 });
  const bright = pluckSamples(48000, 330, seeded(5), 2.6, { ...STANDARD_PLUCK, shift: 0.2 });
  assert.ok(roughness(bright) > roughness(dull) * 1.1, 'a small shift is the brighter sound');
}
console.log('strings theory ok');
