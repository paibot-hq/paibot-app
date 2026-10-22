import test from 'node:test';
import assert from 'node:assert/strict';
import { COLORS, draw, points } from './logic.ts';
test('every prompt conflicts and successive inks differ, even at random boundaries', () => {
  for (const previous of COLORS) for (const value of [0, .25, .5, .75, .999999]) {
    const card = draw(previous, () => value);
    assert.ok(COLORS.includes(card.ink));
    assert.ok(COLORS.includes(card.word));
    assert.notEqual(card.ink, previous);
    assert.notEqual(card.word, card.ink);
  }
});
test('five consecutive answers increase the next award, capped at four times', () => {
  assert.deepEqual([0,4,5,9,10,14,15,100].map(points), [10,10,20,20,30,30,40,40]);
});
