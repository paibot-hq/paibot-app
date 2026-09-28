import assert from 'node:assert/strict';
import Matter from 'matter-js';
import { createPinball } from '../src/lib/pinball.ts';

// Plays the pinball table headlessly: the plunger, the flippers and the
// three-ball game must work, and flipping must actually keep the ball alive.
const settle = game => { for (let i = 0; i < 30; i++) game.step(); };
function launch(game, charge) {
  game.setPlunger(true);
  for (let i = 0; i < Math.round(charge * 60); i++) game.step();
  game.setPlunger(false);
}

// A weak shot falls back onto the plunger; nothing is lost.
{
  const game = createPinball(Matter);
  settle(game);
  assert.ok(game.onPlunger(), 'a new ball waits on the plunger');
  launch(game, 0.3);
  for (let i = 0; i < 240; i++) game.step();
  assert.ok(game.onPlunger() && game.state.ballsLeft === 3, 'a weak shot returns to the plunger');
}

// A strong shot leaves the lane and scores on the table.
{
  const game = createPinball(Matter);
  settle(game);
  launch(game, 0.9);
  let left = false;
  for (let i = 0; i < 300; i++) { game.step(); if (game.ball && game.ball.position.x < 420) left = true; }
  assert.ok(left && game.state.score > 0, `a strong shot reaches the table and scores (${game.state.score})`);
}

// Flippers swing up while held and fall back when released.
{
  const game = createPinball(Matter);
  const [flipper] = game.flippers;
  game.setFlipper('left', true);
  for (let i = 0; i < 8; i++) game.step();
  assert.ok(Math.abs(flipper.body.angle - flipper.up) < 1e-6, 'held flipper reaches its up angle within 8 steps');
  game.setFlipper('left', false);
  for (let i = 0; i < 12; i++) game.step();
  assert.ok(Math.abs(flipper.body.angle - flipper.rest) < 1e-6, 'released flipper returns to rest within 12 steps');
}

// Three balls per game; a naive tapping player keeps each ball far longer
// than not flipping at all.
function playGame(tapFlippers) {
  const game = createPinball(Matter);
  const cool = [0, 0];
  let steps = 0;
  for (; steps < 60 * 300 && !game.state.over; steps++) {
    const ball = game.ball;
    if (ball && game.onPlunger() && !game.state.charging) game.setPlunger(true);
    if (game.state.charging && game.state.charge >= 0.9) game.setPlunger(false);
    if (tapFlippers && ball) {
      for (const [i, side] of [[0, 'left'], [1, 'right']]) {
        const near = ball.position.y > 600 && ball.position.y < 700
          && (i === 0 ? ball.position.x > 100 && ball.position.x < 221 : ball.position.x >= 221 && ball.position.x < 345);
        cool[i] = Math.max(0, cool[i] - 1);
        if (near && cool[i] === 0) cool[i] = 30;
        game.setFlipper(side, cool[i] > 20);
      }
    }
    game.step();
  }
  return { over: game.state.over, ballsLeft: game.state.ballsLeft, seconds: steps / 60, score: game.state.score };
}
const idle = playGame(false);
const tapping = playGame(true);
assert.ok(idle.over && idle.ballsLeft === 0, 'the game ends after three drained balls');
assert.ok(tapping.seconds >= idle.seconds * 2, `flipping keeps balls alive longer: ${tapping.seconds.toFixed(1)}s vs ${idle.seconds.toFixed(1)}s`);
assert.deepEqual(playGame(true), tapping, 'the same inputs replay identically');

console.log(`PASS: pinball plunger, flippers and three-ball game; a tapping player lasts ${tapping.seconds.toFixed(0)}s (${tapping.score} pts) vs ${idle.seconds.toFixed(0)}s without flipping; replays identically`);
