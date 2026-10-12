import assert from 'node:assert/strict';
import { createKoma, START_SPIN, DISH } from './engine.ts';

// A seeded random so the computer's wobble is the same every run.
function seeded(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
const run = (game, seconds, each) => { for (let i = 0; i < seconds * 60 && !game.result; i++) { each?.(game); game.step(); } };

// Left alone, both tops slow down and stay in the dish; the game ends by spin, never in a draw of nothing.
{
  const game = createKoma('easy', seeded(1));
  run(game, 120);
  assert.ok(game.result, 'a match always ends');
  assert.ok(game.tops.every(top => top.spin < START_SPIN), 'spinning costs spin');
}

// An idle player does worse than the normal and hard computers.
for (const level of ['easy', 'normal', 'hard']) {
  let computer = 0, player = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const game = createKoma(level, seeded(seed));
    run(game, 120);
    if (game.result?.winner === 1) computer++;
    if (game.result?.winner === 0) player++;
  }
  // Easy is allowed to lose to a player who does nothing; it still has to win sometimes.
  assert.ok(level === 'easy' ? computer > 0 : computer > player, `${level}: the computer beats an idle player (${computer} vs ${player} of 20)`);
}

// A top pushed past the rim falls out and loses.
{
  const game = createKoma('easy', seeded(2));
  game.tops[0].x = DISH - 1; game.tops[0].y = 0; game.tops[0].vx = 200; game.tops[0].vy = 0;
  game.step();
  assert.equal(game.tops[0].out, true);
  assert.deepEqual(game.result, { winner: 1, reason: 'fell' });
}

// A top whose spin runs out loses by stopping.
{
  const game = createKoma('easy', seeded(3));
  game.tops[1].spin = 0.01;
  game.step();
  assert.deepEqual(game.result, { winner: 0, reason: 'stopped' });
}

// Steering moves the top; a dash is fast, costs spin, and has a cooldown.
{
  const game = createKoma('easy', seeded(4));
  game.steer(1, 0);
  run(game, 0.3);
  assert.ok(game.tops[0].x > 0, 'steering right moves the top right');
  const spin = game.tops[0].spin;
  assert.equal(game.dash(0), true);
  assert.ok(game.tops[0].spin < spin - 3, 'a dash costs spin');
  assert.ok(Math.hypot(game.tops[0].vx, game.tops[0].vy) > 100, 'a dash is fast');
  assert.equal(game.dash(0), false, 'the dash needs time to recover');
  game.steer(-1, 0); // back toward the middle so the dash does not carry it out of the dish
  run(game, 1.2);
  assert.equal(game.dash(0), true, 'the dash comes back');
}

// A head-on hit costs spin on both sides and pushes them apart.
{
  const game = createKoma('easy', seeded(5));
  game.tops[0].x = -10; game.tops[0].y = 0; game.tops[0].vx = 120; game.tops[0].vy = 0;
  game.tops[1].x = 10; game.tops[1].y = 0; game.tops[1].vx = -120; game.tops[1].vy = 0;
  const events = game.step();
  assert.ok(events.some(event => event.type === 'hit'));
  assert.ok(game.tops[0].spin < START_SPIN - 5 && game.tops[1].spin < START_SPIN - 5, 'both lose spin');
  assert.ok(game.tops[0].vx < 0 && game.tops[1].vx > 0, 'they bounce apart');
}

// The one with more spin hits harder: the weaker top is thrown farther.
{
  const game = createKoma('easy', seeded(6));
  game.tops[0].spin = 100; game.tops[1].spin = 30;
  game.tops[0].x = -10; game.tops[0].y = 0; game.tops[0].vx = 100;
  game.tops[1].x = 10; game.tops[1].y = 0; game.tops[1].vx = -100;
  game.step();
  assert.ok(Math.abs(game.tops[1].vx) > Math.abs(game.tops[0].vx), 'the lighter top is thrown harder');
}
console.log('koma engine ok');
