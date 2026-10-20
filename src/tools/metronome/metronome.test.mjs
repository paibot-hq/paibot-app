import assert from 'node:assert/strict';
import { MAX_BPM, MIN_BPM, clampBpm, schedule, tap, tempoName } from './metronome.ts';

// The tempo stays in range, whatever is typed.
assert.equal(clampBpm(10), MIN_BPM);
assert.equal(clampBpm(999), MAX_BPM);
assert.equal(clampBpm(120.6), 121);
assert.equal(clampBpm(Number.NaN), 120);

// Names of tempos at the edges of their ranges.
assert.equal(tempoName(30), 'grave');
assert.equal(tempoName(40), 'largo');
assert.equal(tempoName(60), 'larghetto');
assert.equal(tempoName(76), 'andante');
assert.equal(tempoName(75), 'adagio');
assert.equal(tempoName(120), 'allegro');
assert.equal(tempoName(300), 'prestissimo');

// Tap tempo: the first tap gives nothing, then the average of the gaps; a long pause starts over.
{
  let state = tap([], 0);
  assert.equal(state.bpm, null);
  state = tap(state.taps, 500);
  assert.equal(state.bpm, 120);
  state = tap(state.taps, 1000);
  state = tap(state.taps, 1500);
  assert.equal(state.bpm, 120);
  state = tap(state.taps, 1500 + 600); // a slower tap pulls the average, but only a little
  assert.ok(state.bpm < 120 && state.bpm > 105);
  const after = tap(state.taps, 1500 + 600 + 3000);
  assert.equal(after.bpm, null, 'after a pause the count starts again');
  assert.equal(after.taps.length, 1);
  assert.equal(tap([0], 1).bpm, MAX_BPM, 'taps faster than the top tempo are held at it');
  assert.equal(tap([0], 2000).bpm, MIN_BPM, 'the slowest tap that still counts gives the bottom of the range');
}

// Scheduling: clicks fall on the beat, in order, with the count wrapping at the end of the bar.
{
  const clock = { next: 1, beat: 0 };
  const first = schedule(clock, 1, 2.1, 120, 4); // 0.5 s per beat: 1.0, 1.5, 2.0, 2.5, 3.0
  assert.deepEqual(first.map(click => click.time), [1, 1.5, 2, 2.5, 3]);
  assert.deepEqual(first.map(click => click.beat), [0, 1, 2, 3, 0]);
  // Asking again for the same moment schedules nothing twice.
  assert.deepEqual(schedule(clock, 1, 2.1, 120, 4), []);
  // A faster tempo changes the gap from the next click on.
  const faster = schedule(clock, 3.4, 1.2, 240, 4);
  assert.ok(faster.length >= 4 && Math.abs(faster[1].time - faster[0].time - 0.25) < 1e-9);
  // Fewer beats in the bar than the count has reached: it wraps.
  const short = { next: 10, beat: 5 };
  assert.deepEqual(schedule(short, 10, 0.1, 120, 3).map(click => click.beat), [2]);
  // Late: no burst of catch-up clicks.
  const late = { next: 0, beat: 0 };
  const caught = schedule(late, 100, 0.2, 120, 4);
  assert.ok(caught.length <= 1 && caught[0].time >= 100);
}
console.log('metronome ok');
