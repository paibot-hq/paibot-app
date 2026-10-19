import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIRECTIONS, SIZE, biggest, canMove, emptyCells, fromRows, move, random, slide, spawn, start, toRows, total } from './board.ts';

const rowsAfter = (rows, direction) => toRows(slide(fromRows(rows), direction).state);

test('tiles slide as far as they go', () => {
  assert.deepEqual(rowsAfter([[0, 0, 0, 2], [0, 0, 0, 0], [0, 4, 0, 0], [8, 0, 0, 0]], 'left'), [[2, 0, 0, 0], [0, 0, 0, 0], [4, 0, 0, 0], [8, 0, 0, 0]]);
  assert.deepEqual(rowsAfter([[2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], 'right')[0], [0, 0, 0, 2]);
  assert.deepEqual(rowsAfter([[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [2, 0, 0, 0]], 'up').map(r => r[0]), [2, 0, 0, 0]);
  assert.deepEqual(rowsAfter([[2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], 'down').map(r => r[0]), [0, 0, 0, 2]);
});

test('two of a kind merge into double, the score goes up by the new number', () => {
  const r = slide(fromRows([[2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]), 'left');
  assert.deepEqual(toRows(r.state)[0], [4, 0, 0, 0]);
  assert.equal(r.state.score, 4);
});

test('a tile merges once a move: four of a kind make two, three make one and one left over, from the side moved towards', () => {
  assert.deepEqual(rowsAfter([[2, 2, 2, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], 'left')[0], [4, 4, 0, 0]);
  assert.deepEqual(rowsAfter([[2, 2, 2, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], 'left')[0], [4, 2, 0, 0]);
  assert.deepEqual(rowsAfter([[2, 2, 2, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], 'right')[0], [0, 0, 2, 4]);
  assert.deepEqual(rowsAfter([[2, 2, 4, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], 'left')[0], [4, 4, 0, 0], 'the 4 made does not merge with the 4 beside it');
  assert.deepEqual(rowsAfter([[4, 2, 2, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], 'left')[0], [4, 4, 0, 0]);
  assert.deepEqual(rowsAfter([[2, 0, 2, 4], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], 'left')[0], [4, 4, 0, 0]);
  assert.deepEqual(rowsAfter([[2, 4, 8, 16], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], 'left')[0], [2, 4, 8, 16], 'nothing in common');
});

test('a move that changes nothing is not a move and spawns nothing', () => {
  const state = fromRows([[2, 4, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  const r = move(state, 'left', random(1));
  assert.equal(r.moved, false);
  assert.equal(r.state, state);
});

test('a move that changes something spawns one tile, a 2 or a 4, in an empty place', () => {
  const next = random(5);
  const state = fromRows([[0, 0, 0, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  const r = move(state, 'left', next);
  assert.ok(r.moved);
  assert.equal(r.state.tiles.filter(t => !t.gone).length, 2);
  const fresh = r.state.tiles.find(t => t.fresh);
  assert.ok(fresh && (fresh.value === 2 || fresh.value === 4));
  const others = r.state.tiles.filter(t => t !== fresh);
  assert.ok(!others.some(t => t.row === fresh.row && t.col === fresh.col), 'in an empty place');
});

test('the new tile is a 2 about nine times in ten', () => {
  const next = random(11);
  let fours = 0;
  const N = 4000;
  for (let i = 0; i < N; i++) { const s = spawn({ tiles: [], score: 0, nextId: 1 }, next); if (s.tiles[0].value === 4) fours++; }
  assert.ok(fours / N > 0.07 && fours / N < 0.13, `${fours / N}`);
});

test('a new game has two tiles and no score', () => {
  const s = start(random(3));
  assert.equal(s.tiles.length, 2);
  assert.equal(s.score, 0);
  assert.equal(emptyCells(s.tiles).length, SIZE * SIZE - 2);
});

test('the sum of the tiles is kept by a slide, and goes up only by what is spawned', () => {
  const next = random(21);
  let state = start(next);
  for (let i = 0; i < 400; i++) {
    const direction = DIRECTIONS[Math.floor(next() * 4)];
    const before = total(state);
    const slid = slide(state, direction);
    if (slid.moved) assert.equal(total(slid.state), before, 'merging keeps the sum');
    const r = move(state, direction, next);
    if (r.moved) assert.ok([2, 4].includes(total(r.state) - before));
    state = r.state;
    if (!canMove(state)) break;
  }
});

test('no tile ever leaves the board, none shares a place, and every value is a power of two', () => {
  const next = random(33);
  let state = start(next);
  for (let i = 0; i < 600 && canMove(state); i++) {
    state = move(state, DIRECTIONS[Math.floor(next() * 4)], next).state;
    const live = state.tiles.filter(t => !t.gone);
    const places = new Set(live.map(t => `${t.row},${t.col}`));
    assert.equal(places.size, live.length);
    for (const t of live) {
      assert.ok(t.row >= 0 && t.row < SIZE && t.col >= 0 && t.col < SIZE);
      assert.ok(t.value >= 2 && (t.value & (t.value - 1)) === 0, `${t.value}`);
    }
  }
});

test('a merged-away tile is kept at the place it merged to, for one move', () => {
  const r = slide(fromRows([[2, 0, 0, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]), 'left');
  const gone = r.state.tiles.filter(t => t.gone);
  assert.equal(gone.length, 1);
  assert.deepEqual([gone[0].row, gone[0].col], [0, 0]);
  assert.ok(r.state.tiles.some(t => t.merged && t.value === 4));
  // The next move drops it.
  assert.equal(slide(r.state, 'down').state.tiles.filter(t => t.gone).length, 0);
});

test('the game is over when the board is full and no two beside each other match', () => {
  const stuck = fromRows([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]]);
  assert.equal(canMove(stuck), false);
  const matchBelow = fromRows([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [2, 2, 4, 2]]);
  assert.equal(canMove(matchBelow), true);
  const room = fromRows([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 0]]);
  assert.equal(canMove(room), true);
});

test('the biggest tile', () => {
  assert.equal(biggest(fromRows([[2, 8, 0, 0], [0, 0, 128, 0], [0, 0, 0, 0], [0, 0, 0, 0]])), 128);
  assert.equal(biggest({ tiles: [], score: 0, nextId: 1 }), 0);
});

test('the same seed plays the same game', () => {
  const play = seed => { const next = random(seed); let s = start(next); for (let i = 0; i < 30; i++) s = move(s, DIRECTIONS[i % 4], next).state; return toRows(s).join('|') + s.score; };
  assert.equal(play(7), play(7));
  assert.notEqual(play(7), play(8));
});
