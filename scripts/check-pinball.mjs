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

// Ball saver: a ball lost right after its launch comes back once; the next loss counts.
{
  const game = createPinball(Matter);
  const events = [];
  game.onEvent(event => events.push(event.type));
  settle(game);
  launch(game, 0.9);
  const dropIntoDrain = () => { Matter.Body.setPosition(game.ball, { x: 221, y: 745 }); Matter.Body.setVelocity(game.ball, { x: 0, y: 5 }); };
  for (let i = 0; i < 20; i++) game.step();
  dropIntoDrain();
  for (let i = 0; i < 90; i++) game.step();
  assert.ok(events.includes('saved') && game.state.ballsLeft === 3 && game.onPlunger(), 'an early drain is saved and the ball returns to the plunger');
  launch(game, 0.9);
  for (let i = 0; i < 20; i++) game.step();
  dropIntoDrain();
  for (let i = 0; i < 10; i++) game.step();
  assert.equal(game.state.ballsLeft, 2, 'the saver works once per ball');
}

// Kickback: fires a ball in the left outlane back up once, then needs relighting.
{
  const game = createPinball(Matter);
  let kicks = 0;
  game.onEvent(event => { if (event.type === 'kickback') kicks++; });
  const dropIntoLeftOutlane = () => { Matter.Body.setPosition(game.ball, { x: 23, y: 660 }); Matter.Body.setVelocity(game.ball, { x: 0, y: 4 }); };
  for (let i = 0; i < 5; i++) game.step();
  dropIntoLeftOutlane();
  let rose = false;
  for (let i = 0; i < 60; i++) { game.step(); if (game.ball && game.ball.position.y < 500) rose = true; }
  assert.ok(kicks === 1 && rose && !game.state.kickback, 'the kickback sends the ball back up once');
  dropIntoLeftOutlane();
  for (let i = 0; i < 60; i++) game.step();
  assert.equal(kicks, 1, 'an unlit kickback lets the ball go');
}

// Three balls per game; a naive tapping player keeps each ball far longer
// than not flipping at all.
function playGame(tapFlippers, events = {}) {
  const game = createPinball(Matter);
  game.onEvent(event => { events[event.type] = (events[event.type] ?? 0) + 1; });
  const cool = [0, 0];
  let steps = 0;
  for (; steps < 60 * 300 && !game.state.over; steps++) {
    const ball = game.ball;
    if (ball && game.onPlunger() && !game.state.charging) game.setPlunger(true);
    if (game.state.charging && game.state.charge >= 1) game.setPlunger(false);
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
const seen = {};
const tapping = playGame(true, seen);
// Every feature is reachable in real play, not only when placed by hand.
for (const type of ['bumper', 'sling', 'lanesBonus', 'targetsBonus', 'inlane', 'kickback']) assert.ok(seen[type], `a tapping game reaches ${type}`);
assert.ok(idle.over && idle.ballsLeft === 0, 'the game ends after three drained balls');
assert.ok(tapping.seconds >= idle.seconds * 2, `flipping keeps balls alive longer: ${tapping.seconds.toFixed(1)}s vs ${idle.seconds.toFixed(1)}s`);
assert.deepEqual(playGame(true), tapping, 'the same inputs replay identically');

console.log(`PASS: pinball plunger, flippers, ball saver, kickback and three-ball game; every feature reached in play; a tapping player lasts ${tapping.seconds.toFixed(0)}s (${tapping.score} pts) vs ${idle.seconds.toFixed(0)}s without flipping; replays identically`);
