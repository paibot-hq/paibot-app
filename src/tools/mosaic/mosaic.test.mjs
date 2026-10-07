import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rectBox, regionBox, cellSize, usable, empty, add, undo, redo, clear, fit, savedName, penWidth } from './mosaic.ts';

const rect = (x1, y1, x2, y2, level = 3, shape = 'rect') => ({ shape, effect: 'mosaic', level, a: { x: x1, y: y1 }, b: { x: x2, y: y2 } });
const pen = (points, width = 20, level = 3) => ({ shape: 'pen', effect: 'mosaic', level, width, points });

test('a box is the same whichever corner it was dragged from', () => {
  assert.deepEqual(rectBox({ x: 10, y: 40 }, { x: 30, y: 20 }), { x: 10, y: 20, width: 20, height: 20 });
});

test('the box of a region is cut to the picture, and a pen stroke includes its width', () => {
  assert.deepEqual(regionBox(rect(-20, -5, 50, 500), 100, 100), { x: 0, y: 0, width: 50, height: 100 });
  assert.deepEqual(regionBox(pen([{ x: 50, y: 50 }, { x: 70, y: 50 }], 20), 200, 200), { x: 40, y: 40, width: 40, height: 20 });
  assert.deepEqual(regionBox(rect(150, 150, 180, 180), 100, 100), { x: 100, y: 100, width: 0, height: 0 });
});

test('the cells follow the region: a few across, so it cannot be read back, and never below a floor', () => {
  // A 400 px face in a 4000 px picture, level 3 (5 cells across): 80 px cells.
  assert.equal(cellSize(rect(0, 0, 400, 400), 4000, 3000), 80);
  // A region twice as large gets cells twice as large.
  assert.equal(cellSize(rect(0, 0, 800, 800), 4000, 3000), 160);
  // The shorter side counts.
  assert.equal(cellSize(rect(0, 0, 1000, 400), 4000, 3000), 80);
  // Coarser levels are larger, finer ones smaller, and level 1 still has few cells.
  const sizes = [1, 2, 3, 4, 5].map(level => cellSize(rect(0, 0, 600, 600, level), 4000, 3000));
  assert.deepEqual([...sizes].sort((a, b) => b - a), sizes.slice().reverse(), 'larger with the level');
  assert.equal(sizes[0], 75);
  // A tiny region still gets the floor (a 4000 px picture: 25 px), and a small picture's floor is 6.
  assert.equal(cellSize(rect(0, 0, 40, 40), 4000, 3000), 25);
  assert.equal(cellSize(rect(0, 0, 40, 40), 400, 300), 8);
  assert.equal(cellSize(rect(0, 0, 10, 10), 200, 200), 6);
  // A pen goes by its width, and a level out of range is brought in.
  assert.equal(cellSize(pen([{ x: 0, y: 0 }, { x: 900, y: 0 }], 200, 3), 4000, 3000), 40 < 25 ? 25 : 40);
  assert.equal(cellSize(rect(0, 0, 400, 400, 99), 4000, 3000), 133);
  assert.equal(cellSize(rect(0, 0, 400, 400, 0), 4000, 3000), 50);
});

test('a click or a tiny drag is not a region', () => {
  assert.equal(usable(rect(10, 10, 12, 12), 2000, 2000), false);
  assert.equal(usable(rect(10, 10, 200, 3), 2000, 2000), false);
  assert.equal(usable(rect(10, 10, 200, 100), 2000, 2000), true);
  assert.equal(usable(pen([{ x: 5, y: 5 }], 30), 2000, 2000), false);
  assert.equal(usable(pen([{ x: 5, y: 5 }, { x: 80, y: 5 }], 30), 2000, 2000), true);
});

test('undo and redo walk the history, a new region clears what was undone, and clear can be undone one by one', () => {
  const a = rect(0, 0, 50, 50), b = rect(10, 10, 60, 60), c = rect(20, 20, 70, 70);
  let h = add(add(add(empty, a), b), c);
  assert.deepEqual(h.done, [a, b, c]);
  h = undo(undo(h));
  assert.deepEqual([h.done, h.undone], [[a], [c, b]]);
  h = redo(h);
  assert.deepEqual([h.done, h.undone], [[a, b], [c]]);
  h = add(h, a);
  assert.deepEqual([h.done.length, h.undone.length], [3, 0], 'a new region clears the redo');
  assert.equal(undo(empty), empty);
  assert.equal(redo(empty), empty);
  const cleared = clear(add(add(empty, a), b));
  assert.deepEqual(cleared.done, []);
  assert.deepEqual(redo(cleared).done, [a], 'clear can be undone, oldest first');
  assert.equal(clear(empty), empty);
});

test('the picture is shown as large as the room allows and never enlarged', () => {
  assert.deepEqual(fit(4000, 3000, 800, 800), { width: 800, height: 600, scale: 0.2 });
  assert.deepEqual(fit(300, 200, 800, 800), { width: 300, height: 200, scale: 1 });
  assert.deepEqual(fit(1000, 4000, 800, 400), { width: 100, height: 400, scale: 0.1 });
  assert.equal(fit(1, 1, 0, 0).width, 1);
});

test('the saved name and the pen width', () => {
  assert.equal(savedName('holiday.JPG', 'png'), 'holiday-hidden.png');
  assert.equal(savedName('my.photo.jpeg', 'jpg'), 'my.photo-hidden.jpg');
  assert.equal(savedName('', 'png'), 'photo-hidden.png');
  assert.equal(penWidth(30, 0.25), 120);
  assert.equal(penWidth(0, 1), 1);
});
