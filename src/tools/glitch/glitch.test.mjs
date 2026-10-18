import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FLASHES_PER_SECOND, GLITCHES, INVERT_GAP, MODES, PALETTES, drawCells, invert, nextSegment, planGlitches, random, sceneSound, scanLines, slipRows, splitColours } from './glitch.ts';

const W = 20, H = 15;
const segment = (mode, seed = 3) => ({ start: 0, end: 1, mode, seed });
const colours = cells => { const set = new Set(); for (let i = 0; i < cells.length; i += 3) set.add(`${cells[i]},${cells[i + 1]},${cells[i + 2]}`); return set; };
const palette = intensity => new Set(PALETTES[intensity].map(c => c.join(',')));

test('scenes come one after another, never shorter than a third of a second, and gentle ones never flash', () => {
  const next = random(1);
  for (const intensity of ['mild', 'wild']) {
    const seen = new Set();
    let t = 0;
    for (let i = 0; i < 2000; i++) {
      const s = nextSegment(next, t, intensity, null);
      assert.equal(s.start, t);
      assert.ok(s.end - s.start >= 1 / FLASHES_PER_SECOND, `${intensity}: ${s.end - s.start}s`);
      seen.add(s.mode);
      t = s.end;
    }
    if (intensity === 'mild') assert.ok(!seen.has('flash'));
    else assert.deepEqual([...seen].sort(), [...MODES].sort());
  }
  assert.equal(nextSegment(next, 0, 'mild', 'moire').mode, 'moire');
});

test('every scene fills the grid, the same frame draws the same picture', () => {
  for (const intensity of ['mild', 'wild']) {
    for (const mode of MODES) {
      const cells = drawCells(segment(mode), intensity, 0.2, 5, W, H);
      assert.equal(cells.length, W * H * 3);
      assert.deepEqual(cells, drawCells(segment(mode), intensity, 0.2, 5, W, H));
    }
  }
});

test('the colour scenes use only their palette', () => {
  for (const intensity of ['mild', 'wild']) {
    for (const mode of ['flow', 'bars', 'mosaic', 'moire']) {
      for (const c of colours(drawCells(segment(mode, 9), intensity, 0.3, 2, W, H))) assert.ok(palette(intensity).has(c), `${intensity} ${mode}: ${c}`);
    }
  }
});

test('large areas change colour at most three times a second', () => {
  // Across a second at 24 frames a second, the bars, the mosaic and the flash take at most three new sets of colours.
  for (const mode of ['bars', 'mosaic', 'flash']) {
    const pictures = new Set();
    for (let frame = 0; frame < 24; frame++) {
      const cells = drawCells(segment(mode, 4), 'wild', frame / 24, frame, W, H);
      // The flash's specks change every frame; its main colour is what matters.
      pictures.add(mode === 'flash' ? mostCommon(cells) : cells.join());
    }
    assert.ok(pictures.size <= FLASHES_PER_SECOND, `${mode}: ${pictures.size} pictures in a second`);
  }
});

function mostCommon(cells) {
  const counts = new Map();
  for (let i = 0; i < cells.length; i += 3) { const k = `${cells[i]},${cells[i + 1]},${cells[i + 2]}`; counts.set(k, (counts.get(k) ?? 0) + 1); }
  return [...counts].sort((a, b) => b[1] - a[1])[0][0];
}

test('snow crackles every frame', () => {
  assert.notDeepEqual(drawCells(segment('snow'), 'wild', 0, 1, W, H), drawCells(segment('snow'), 'wild', 0, 2, W, H));
});

const picture = () => Uint8ClampedArray.from({ length: 4 * 3 * 4 }, (_, i) => (i * 37) % 256);

test('a row slipped sideways wraps round, and only the rows asked for move', () => {
  const data = picture(), before = data.slice();
  slipRows(data, 4, 1, 1, 1);
  assert.deepEqual(data.subarray(0, 16), before.subarray(0, 16));
  assert.deepEqual([...data.subarray(16, 20)], [...before.subarray(28, 32)]);
  assert.deepEqual([...data.subarray(20, 32)], [...before.subarray(16, 28)]);
  assert.deepEqual(data.subarray(32), before.subarray(32));
});

test('split colours move red one way and blue the other; inverting twice changes nothing', () => {
  const data = picture(), before = data.slice();
  splitColours(data, 4, 1);
  assert.equal(data[4], before[0]);      // red of pixel 1 came from pixel 0
  assert.equal(data[2], before[6]);      // blue of pixel 0 came from pixel 1
  assert.equal(data[1], before[1]);      // green stays
  const again = picture();
  invert(again); invert(again);
  assert.deepEqual(again, picture());
  const scanned = picture();
  scanLines(scanned, 4);
  assert.equal(scanned[0], Math.floor(before[0] * 0.72));
  assert.equal(scanned[16], before[16]);
});

test('the picture is inverted at most once a second, and never when gentle', () => {
  const all = new Set(GLITCHES);
  const next = random(2);
  let last = -Infinity, count = 0;
  for (let frame = 0; frame < 24 * 20; frame++) {
    const t = frame / 24;
    if (planGlitches(next, all, 'wild', 640, 480, t, last).invert) { assert.ok(t - last >= INVERT_GAP); last = t; count++; }
    assert.equal(planGlitches(next, all, 'mild', 640, 480, t, -Infinity).invert, false);
  }
  assert.ok(count > 3 && count <= 20, `${count} inversions in 20 seconds`);
  // Glitches that are off do not happen.
  for (let i = 0; i < 100; i++) {
    const plan = planGlitches(next, new Set(), 'wild', 640, 480, 10, -Infinity);
    assert.deepEqual([plan.slips.length, plan.split, plan.invert, plan.scan], [0, 0, false, false]);
  }
});

test('each scene has its sound, the same every time, in [-1, 1]; some are silent', () => {
  let silent = 0;
  for (let seed = 0; seed < 60; seed++) {
    for (const mode of MODES) {
      for (const intensity of ['mild', 'wild']) {
        const sound = sceneSound(segment(mode, seed), intensity, 0.3, 8000);
        if (!sound) { silent++; assert.notEqual(mode, 'flash'); continue; }
        assert.equal(sound.length, 2400);
        for (const v of sound) assert.ok(Number.isFinite(v) && v >= -1 && v <= 1);
        assert.deepEqual(sound, sceneSound(segment(mode, seed), intensity, 0.3, 8000));
      }
    }
  }
  assert.ok(silent > 20 && silent < 200, `${silent} silent`);
});
