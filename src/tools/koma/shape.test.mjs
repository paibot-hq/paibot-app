import assert from 'node:assert/strict';
import { LEVELS, MAX_RADIUS, MIN_RADIUS, PRESETS, parseProfile, profileFromStroke, scoresOf, solidOf, specOf } from './shape.ts';

// A drawn stroke becomes a profile: the outermost the stroke reaches at each height.
{
  // Up the right side of a cone: tip at the bottom axis, wide at the top.
  const cone = profileFromStroke([{ x: 0.05, y: 0 }, { x: 1, y: 1 }]);
  assert.equal(cone.length, LEVELS);
  assert.ok(cone[LEVELS - 2] > cone[2] + 5, 'a cone widens upward');
  assert.ok(cone.every(r => r >= MIN_RADIUS && r <= MAX_RADIUS), 'every radius is inside the drawing box');
  // Drawing the same outline downward gives the same solid.
  const down = profileFromStroke([{ x: 1, y: 1 }, { x: 0.05, y: 0 }]);
  assert.deepEqual(down.map(r => +r.toFixed(6)), cone.map(r => +r.toFixed(6)));
  // A stroke that stops half way leaves the upper half thin, and one that starts above the bottom goes on down.
  const half = profileFromStroke([{ x: 0.6, y: 0.2 }, { x: 0.6, y: 0.5 }]);
  assert.ok(half[LEVELS - 1] <= MIN_RADIUS + 1e-9, 'nothing above the stroke');
  assert.ok(half[0] > 5, 'the lowest point is held down to the tip');
  // A loop that doubles back keeps the outer edge.
  const loop = profileFromStroke([{ x: 0.2, y: 0 }, { x: 0.9, y: 0.5 }, { x: 0.3, y: 0.55 }, { x: 0.4, y: 1 }]);
  assert.ok(loop[10] > 11, 'the outer edge counts, not the line that comes back');
  assert.equal(profileFromStroke([{ x: 0.5, y: 0.5 }]), null, 'a dot is not a shape');
}

// Stored shapes are checked before they are trusted.
{
  assert.deepEqual(parseProfile([...PRESETS.heavy]), PRESETS.heavy);
  assert.equal(parseProfile(null), null);
  assert.equal(parseProfile([1, 2, 3]), null, 'wrong length');
  assert.equal(parseProfile(Array(LEVELS).fill('9')), null, 'not numbers');
  assert.equal(parseProfile(Array(LEVELS).fill(Number.NaN)), null);
  assert.ok(parseProfile(Array(LEVELS).fill(999)).every(r => r === MAX_RADIUS), 'out of range is clamped');
}

// The solid: a cylinder's volume and inertia are known.
{
  const cylinder = solidOf(Array(LEVELS).fill(10));
  assert.ok(Math.abs(cylinder.volume - Math.PI * 100 * 26) / (Math.PI * 100 * 26) < 0.01);
  assert.ok(Math.abs(cylinder.inertia - (Math.PI * 100 * 26 * 100) / 2) / ((Math.PI * 100 * 26 * 100) / 2) < 0.01);
  assert.ok(Math.abs(cylinder.centerHeight - 13) < 0.1);
}

// The standard top is the yardstick, and the other shapes differ from it the way their drawing says.
{
  const standard = specOf(PRESETS.standard);
  for (const key of ['mass', 'decay', 'drag', 'steer', 'resist']) assert.ok(Math.abs(standard[key] - 1) < 1e-9, `${key} of the standard top is 1`);
  assert.deepEqual(Object.values(scoresOf(PRESETS.standard)).slice(0, 3), [50, 50, 50]);
  const heavy = specOf(PRESETS.heavy), sharp = specOf(PRESETS.sharp), flat = specOf(PRESETS.flat);
  assert.ok(heavy.mass > 1.5 && heavy.steer < 0.8, 'a heavy top is heavy and slow to steer');
  assert.ok(sharp.mass < 1 && sharp.drag < 1, 'a pointed top is light and slides');
  assert.ok(flat.radius > standard.radius, 'a flat disc is wide');
  // Whatever is drawn, the numbers stay in the range the engine can handle.
  for (const extreme of [Array(LEVELS).fill(MIN_RADIUS), Array(LEVELS).fill(MAX_RADIUS)]) {
    const spec = specOf(extreme);
    assert.ok(spec.mass >= 0.35 && spec.mass <= 3 && spec.radius >= 5 && spec.radius <= MAX_RADIUS);
    assert.ok(Number.isFinite(spec.decay) && spec.decay > 0 && spec.wobbleAt >= 18 && spec.wobbleAt <= 55);
  }
}
console.log('koma shape ok');
