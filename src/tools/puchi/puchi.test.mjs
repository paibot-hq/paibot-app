import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMBO_WINDOW, TIME_LIMIT, begin, bump, centerOf, createScene, createSheet, frequency, indexAt, layoutFor, lapsed, milestoneCrossed, newCombo, pointsFor, popBubble, prepare, press, pressNext, rankFor, semitones, step } from './engine.ts';

const seeded = seed => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const never = () => 0.99; // no gold bubbles, no rainbow
const sheetOf = (cols, rows, rng = never) => createSheet({ cols, rows, cell: 50, ox: 0, oy: 0 }, rng, 0, false);
// A scene that is already playing, on a sheet of plain bubbles.
const playing = () => {
  const scene = createScene(400, 400, never);
  scene.phase = 'playing';
  scene.sheet = sheetOf(8, 8); // already swollen
  return scene;
};
const run = (scene, seconds, rng = seeded(9)) => { const sounds = []; for (let t = 0; t < seconds; t += 0.05) sounds.push(...step(scene, 0.05, rng)); return sounds; };

test('the sheet is 8 x 8 on every screen, so that a score means the same on a phone and a desktop', () => {
  for (const width of [280, 390, 560]) {
    const layout = layoutFor(width, width);
    assert.deepEqual([layout.cols, layout.rows], [8, 8]);
    assert.ok(Math.abs(layout.cell * 8 - width) < 1e-9);
  }
});

test('a point is mapped to the bubble under it, and to none outside the sheet', () => {
  const layout = { cols: 4, rows: 3, cell: 50, ox: 0, oy: 10 };
  assert.equal(indexAt(layout, 5, 15), 0);
  assert.equal(indexAt(layout, 199, 159), 11);
  assert.equal(indexAt(layout, 60, 5), -1);
  assert.equal(indexAt(layout, 200, 50), -1);
  assert.deepEqual(centerOf(layout, 5), { x: 75, y: 85 });
});

test('a sheet has golds in a small share and at most one rainbow', () => {
  const sheet = createSheet(layoutFor(560, 560), seeded(7), 0);
  const golds = sheet.bubbles.filter(b => b.kind === 'gold').length, rainbows = sheet.bubbles.filter(b => b.kind === 'rainbow').length;
  assert.ok(golds > 0 && golds < sheet.bubbles.length * 0.2);
  assert.ok(rainbows <= 1);
  assert.equal(sheet.remaining, sheet.bubbles.length);
});

test('a plain bubble pops once; a popped bubble and one not yet swollen do nothing', () => {
  const sheet = sheetOf(4, 3);
  assert.equal(popBubble(sheet, 5, 1).length, 1);
  assert.equal(sheet.remaining, 11);
  assert.deepEqual(popBubble(sheet, 5, 2), []);
  assert.deepEqual(popBubble(sheet, 99, 2), []);
  const swelling = createSheet({ cols: 3, rows: 3, cell: 50, ox: 0, oy: 0 }, never, 0, true);
  assert.deepEqual(popBubble(swelling, 0, 0), [], 'a bubble that has not been born yet');
});

test('a golden bubble sets off the ones within two cells, nearer first, and a golden one among them goes on', () => {
  const sheet = sheetOf(9, 1);
  sheet.bubbles[4].kind = 'gold';
  const events = popBubble(sheet, 4, 0);
  assert.deepEqual(events.map(e => e.index).sort((a, b) => a - b), [2, 3, 4, 5, 6]);
  assert.equal(events[0].index, 4);
  assert.ok(events.every((e, i) => i === 0 || e.at >= events[i - 1].at));
  assert.ok(events.slice(1).every(e => e.chain));
  const chained = sheetOf(9, 1);
  chained.bubbles[2].kind = 'gold'; chained.bubbles[4].kind = 'gold';
  assert.deepEqual(popBubble(chained, 4, 0).map(e => e.index).sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6], 'the golden one at 2 reaches 0');
});

test('a rainbow bubble pops the whole sheet in a wave', () => {
  const sheet = sheetOf(6, 4);
  sheet.bubbles[0].kind = 'rainbow';
  const events = popBubble(sheet, 0, 0);
  assert.equal(events.length, 24);
  assert.equal(sheet.remaining, 0);
  assert.ok(events.at(-1).at > events[1].at);
});

test('the combo goes on within the window, starts again after it, and keeps its best', () => {
  const combo = newCombo();
  assert.equal(bump(combo, 0), 1);
  assert.equal(bump(combo, COMBO_WINDOW), 2);
  assert.equal(bump(combo, COMBO_WINDOW * 2), 3);
  assert.equal(bump(combo, COMBO_WINDOW * 4), 1, 'a pause');
  assert.equal(bump(combo, COMBO_WINDOW * 4 + 0.1), 2);
  assert.equal(combo.best, 3);
  combo.count = 9; combo.last = 10;
  assert.equal(bump(combo, 10.1), 10);
  assert.equal(combo.best, 10);
  assert.equal(lapsed(combo, 10.2), false);
  assert.equal(lapsed(combo, 12), true);
});

test('ten points a pop, ten more for every ten in a row', () => {
  assert.deepEqual([1, 9, 10, 19, 20, 50].map(pointsFor), [10, 10, 20, 20, 30, 60]);
});

test('a milestone is reported once, when the combo goes over it', () => {
  assert.equal(milestoneCrossed(9, 10), 10);
  assert.equal(milestoneCrossed(10, 11), null);
  assert.equal(milestoneCrossed(0, 30), 25, 'a jump over two gives the higher');
  assert.equal(milestoneCrossed(99, 100), 100);
});

test('the pitch climbs a pentatonic scale for two octaves and stays there', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(semitones), [0, 2, 4, 7, 9, 12]);
  assert.equal(semitones(11), 24);
  assert.equal(semitones(500), 24);
  assert.ok(Math.abs(frequency(1) - 392) < 1e-9);
  assert.ok(Math.abs(frequency(11) - 1568) < 1e-6);
});

test('stepping the scene pops what is due, scores, builds the combo and asks for the sounds', () => {
  const scene = playing();
  assert.ok(press(scene, 0)); assert.ok(press(scene, 1));
  const sounds = step(scene, 0.016, seeded(3));
  assert.equal(sounds.filter(s => s.type === 'pop').length, 2);
  assert.equal(scene.pops, 2);
  assert.equal(scene.score, 20);
  assert.equal(scene.combo.count, 2);
  assert.ok(scene.particles.length > 0 && scene.rings.length === 2);
});

test('a golden bubble pops its neighbours over the next frames, each one counted', () => {
  const scene = playing();
  scene.sheet.bubbles[10].kind = 'gold';
  press(scene, 10);
  const total = scene.queue.length;
  assert.ok(total > 5);
  for (let i = 0; i < 40; i++) step(scene, 0.016, seeded(i));
  assert.equal(scene.pops, total);
  assert.ok(scene.combo.best >= total, 'they follow so closely that they are one combo');
});

test('a milestone gives its sound, a flash and a shake; none of them when motion is to be calm', () => {
  const scene = playing();
  scene.combo.count = 9; scene.combo.last = 0; scene.time = 0.1;
  press(scene, 0);
  const sounds = step(scene, 0.016, seeded(1));
  assert.ok(sounds.some(s => s.type === 'milestone' && s.value === 10));
  assert.ok(scene.flash > 0 && scene.shake > 0);
  scene.calm = true;
  scene.combo.count = 24; scene.combo.last = scene.time; press(scene, 1);
  step(scene, 0.016, seeded(1));
  assert.equal(scene.flash, 0);
  assert.equal(scene.shake, 0);
});

test('a cleared sheet gives the bonus once and is made again after a moment', () => {
  const scene = playing();
  for (let i = 0; i < 64; i++) press(scene, i);
  const sounds = step(scene, 0.016, seeded(2));
  assert.equal(sounds.filter(s => s.type === 'clear').length, 1);
  // 64 pops in one combo: 9 at 10 points, then 10 each at 20, 30, 40, 50 and 60, and 5 at 70 - plus 100 for the sheet.
  assert.equal(scene.score, 9 * 10 + 10 * (20 + 30 + 40 + 50 + 60) + 5 * 70 + 100);
  step(scene, 0.5, seeded(2));
  assert.equal(scene.sheets, 1);
  step(scene, 0.6, seeded(2));
  assert.equal(scene.sheets, 2);
  assert.equal(scene.sheet.remaining, scene.sheet.bubbles.length);
  assert.equal(step(scene, 0.016, seeded(2)).filter(s => s.type === 'clear').length, 0);
});

test('with the keyboard the next bubble in reading order is popped', () => {
  const scene = playing();
  assert.ok(pressNext(scene));
  assert.ok(scene.sheet.bubbles[0].popped);
  assert.ok(pressNext(scene));
  assert.ok(scene.sheet.bubbles[1].popped);
});

test('a run waits for the start, counts down 3-2-1, runs 30 seconds and ends', () => {
  const scene = createScene(400, 400, never);
  assert.equal(scene.phase, 'ready');
  assert.equal(press(scene, 0), false, 'no popping before the start');
  begin(scene);
  assert.equal(scene.phase, 'countdown');
  assert.equal(press(scene, 0), false);
  const countdown = run(scene, 3.2);
  assert.deepEqual(countdown.filter(s => s.type === 'tick').map(s => s.n), [2, 1]);
  assert.equal(countdown.filter(s => s.type === 'go').length, 1);
  assert.equal(scene.phase, 'playing');
  assert.ok(press(scene, 0));
  run(scene, 10);
  assert.ok(Math.abs(scene.timeLeft - (TIME_LIMIT - 10)) < 0.5, 'about 20 seconds left');
  const rest = run(scene, 21);
  assert.equal(scene.phase, 'over');
  assert.equal(scene.timeLeft, 0);
  assert.equal(rest.filter(s => s.type === 'end').length, 1);
  assert.equal(press(scene, 5), false, 'no popping after the end');
});

test('a new run starts from nothing, with a fresh sheet', () => {
  const scene = createScene(400, 400, never);
  begin(scene); run(scene, 3.2);
  press(scene, 0); press(scene, 1);
  run(scene, 31);
  assert.equal(scene.phase, 'over');
  assert.ok(scene.score > 0);
  prepare(scene, never);
  assert.equal(scene.phase, 'ready');
  assert.deepEqual([scene.score, scene.pops, scene.combo.best, scene.timeLeft], [0, 0, 0, TIME_LIMIT]);
  assert.equal(scene.sheet.remaining, 64);
});

test('ranks go from C to S by score', () => {
  assert.deepEqual([0, 2999, 3000, 7999, 8000, 15999, 16000, 50000].map(rankFor), ['C', 'C', 'B', 'B', 'A', 'A', 'S', 'S']);
});
