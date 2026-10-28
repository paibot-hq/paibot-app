import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitCircle, judge, rankFor, turnsAround } from './judge.ts';

const SIDE = 400;
// A circle drawn as `n` points over `turns` turns, each point pushed out by `wobble(angle)` times the radius.
const drawn = ({ cx = 200, cy = 200, r = 120, n = 120, turns = 1, start = 0, wobble = () => 0 } = {}) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = start + (2 * Math.PI * turns * i) / n;
    const rr = r * (1 + wobble(a));
    return { x: cx + rr * Math.cos(a), y: cy + rr * Math.sin(a) };
  });

test('the fitted circle of points on a circle is that circle', () => {
  const fit = fitCircle(drawn({ cx: 150, cy: 230, r: 90 }));
  assert.ok(Math.abs(fit.cx - 150) < 1e-6 && Math.abs(fit.cy - 230) < 1e-6 && Math.abs(fit.r - 90) < 1e-6);
});

test('points on a line have no circle', () => {
  assert.equal(fitCircle(Array.from({ length: 20 }, (_, i) => ({ x: i * 10, y: i * 5 }))), null);
});

test('the turns are counted with their direction', () => {
  assert.ok(Math.abs(turnsAround(drawn(), 200, 200) - 1) < 1e-9);
  assert.ok(Math.abs(turnsAround(drawn({ turns: -0.5 }), 200, 200) + 0.5) < 1e-9);
});

test('a perfect circle scores 100 and S, either way round', () => {
  for (const turns of [1, -1]) {
    const result = judge(drawn({ turns }), SIDE);
    assert.equal(result.ok, true);
    assert.equal(result.score, 100);
    assert.equal(result.rank, 'S');
  }
});

test('the more it wobbles, the lower the score', () => {
  const scores = [0.01, 0.03, 0.06, 0.12].map(amount => judge(drawn({ wobble: a => amount * Math.sin(5 * a) }), SIDE).score);
  for (let i = 1; i < scores.length; i++) assert.ok(scores[i] < scores[i - 1], `${scores}`);
  assert.ok(scores[0] > 95 && scores[3] < 75, `${scores}`);
});

test('an ellipse is not a circle', () => {
  const ellipse = Array.from({ length: 121 }, (_, i) => {
    const a = (2 * Math.PI * i) / 120;
    return { x: 200 + 150 * Math.cos(a), y: 200 + 100 * Math.sin(a) };
  });
  const result = judge(ellipse, SIDE);
  assert.equal(result.ok, true);
  assert.ok(result.score < 60, `${result.score}`);
});

test('a gap between the ends costs points; going a little past the start does not', () => {
  const closed = judge(drawn(), SIDE).score;
  const gapped = judge(drawn({ turns: 0.92 }), SIDE);
  assert.ok(gapped.ok && gapped.score < closed - 10, `${gapped.score}`);
  assert.equal(judge(drawn({ turns: 1.1 }), SIDE).score, 100);
});

test('a stroke that is too short, too small, not closed or goes round twice is not judged', () => {
  assert.equal(judge(drawn({ n: 5 }), SIDE).problem, 'short');
  assert.equal(judge(drawn({ r: 30 }), SIDE).problem, 'small');
  assert.equal(judge(drawn({ turns: 0.6 }), SIDE).problem, 'open');
  assert.equal(judge(drawn({ turns: 2, n: 240 }), SIDE).problem, 'laps');
});

test('the ranks', () => {
  assert.deepEqual([99, 95, 94.9, 90, 85, 70, 10].map(rankFor), ['S', 'S', 'A', 'A', 'B', 'C', 'D']);
});
