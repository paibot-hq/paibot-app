import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_ITEMS, colour, ease, parseItems, pick, segmentAt, stopAngle } from './wheel.ts';

test('items are typed one to a line: trimmed, blanks and repeats dropped, limited in number', () => {
  assert.deepEqual(parseItems('a\n b \n\n a\r\nc'), ['a', 'b', 'c']);
  assert.deepEqual(parseItems(''), []);
  assert.equal(parseItems(Array.from({ length: 80 }, (_, i) => `item ${i}`).join('\n')).length, MAX_ITEMS);
});

test('a pick is fair: every item comes up about equally often, and none is out of range', () => {
  let seed = 12345;
  const word = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed; };
  for (const count of [1, 2, 3, 7, 10]) {
    const hits = new Array(count).fill(0);
    for (let i = 0; i < 7000; i++) hits[pick(count, word)]++;
    assert.ok(hits.every(n => n > 0), `${count}: every item can be picked`);
    if (count > 1) assert.ok(Math.max(...hits) / Math.min(...hits) < 1.3, `${count}: ${hits}`);
  }
  // A word in the biased tail (4294967295 for 5 items) is thrown away and another is drawn.
  const words = [4294967295, 4294967295, 8];
  assert.equal(pick(5, () => words.shift()), 3);
  assert.equal(words.length, 0);
});

test('a spin stops with the pointer on the chosen segment, however it is offset', () => {
  for (const count of [2, 3, 5, 8, 13, 50]) for (let index = 0; index < count; index++) for (const offset of [-0.5, -0.25, 0, 0.3, 0.5]) {
    const angle = stopAngle(index, count, 5, offset);
    assert.ok(angle >= 5 * 360 - 1e-9, 'at least the whole turns');
    assert.equal(segmentAt(angle, count), index, `${count} items, #${index}, offset ${offset}`);
  }
});

test('with no offset the pointer is at the middle of the segment', () => {
  const count = 4, width = 90;
  const angle = stopAngle(1, count, 0, 0);
  assert.equal(((angle + 1.5 * width) % 360), 0);
});

test('colours differ between neighbours, even for two items', () => {
  assert.notEqual(colour(0, 2), colour(1, 2));
  const all = Array.from({ length: 10 }, (_, i) => colour(i, 10));
  assert.equal(new Set(all).size, 10);
  assert.ok(all.every(value => /^hsl\(/.test(value)));
});

test('the ease starts fast and ends at rest', () => {
  assert.equal(ease(0), 0);
  assert.equal(ease(1), 1);
  assert.ok(ease(0.5) > 0.9);
  assert.equal(ease(2), 1);
  assert.equal(ease(-1), 0);
});
