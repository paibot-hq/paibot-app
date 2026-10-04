import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PLAN, clock, minutes, next, progress, remaining, seconds } from './pomodoro.ts';

test('focus, short break, focus ... and a long break after every fourth focus session', () => {
  let state = { phase: 'focus', done: 0 };
  const seen = [];
  for (let i = 0; i < 9; i++) { seen.push(state.phase); state = next(state.phase, state.done, DEFAULT_PLAN); }
  assert.deepEqual(seen, ['focus', 'short', 'focus', 'short', 'focus', 'short', 'focus', 'long', 'focus']);
  // The ninth step finished a fifth focus session (the state after the loop is the break that follows it).
  assert.deepEqual(state, { phase: 'short', done: 5 });
});

test('a plan with a different rhythm', () => {
  const plan = { focus: 50, short: 10, long: 30, every: 2 };
  assert.deepEqual(next('focus', 1, plan), { phase: 'long', done: 2 });
  assert.deepEqual(next('focus', 0, plan), { phase: 'short', done: 1 });
  assert.deepEqual(next('long', 2, plan), { phase: 'focus', done: 2 });
  assert.equal(seconds('focus', plan), 3000);
  assert.deepEqual(next('focus', 0, { ...plan, every: 0 }), { phase: 'long', done: 1 });
});

test('the time left comes from the clock and never goes below zero', () => {
  assert.equal(remaining(10_000, 0), 10);
  assert.equal(remaining(10_000, 9_001), 1);
  assert.equal(remaining(10_000, 10_000), 0);
  assert.equal(remaining(10_000, 99_999), 0);
  assert.equal(remaining(10_001, 0), 11);
});

test('the clock and the ring', () => {
  assert.equal(clock(1500), '25:00');
  assert.equal(clock(59), '00:59');
  assert.equal(clock(61), '01:01');
  assert.equal(clock(-3), '00:00');
  assert.equal(progress(750, 1500), 0.5);
  assert.equal(progress(0, 1500), 1);
  assert.equal(progress(2000, 1500), 0);
  assert.equal(progress(5, 0), 1);
});

test('typed minutes are kept in range', () => {
  assert.equal(minutes(25, 1), 25);
  assert.equal(minutes(0, 25), 1);
  assert.equal(minutes(999, 25), 180);
  assert.equal(minutes(Number.NaN, 25), 25);
  assert.equal(minutes(12.6, 25), 13);
});
