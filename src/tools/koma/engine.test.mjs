import assert from 'node:assert/strict';
import { createKoma, START_SPIN, DISH } from './engine.ts';
import { PRESETS } from './shape.ts';

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
  assert.ok(Math.hypot(game.tops[0].vx, game.tops[0].vy) > 60, 'a dash is fast');
  assert.equal(game.dash(0), false, 'the dash needs time to recover');
  game.steer(-1, 0); // back toward the middle so the dash does not carry it out of the dish
  run(game, 1.2);
  assert.equal(game.dash(0), true, 'the dash comes back');
}

// A dash alone never takes a top out of the dish, wherever it is and whichever way it goes.
{
  for (const shape of ['standard', 'sharp', 'flat']) for (let angle = 0; angle < 360; angle += 30) {
    const game = createKoma('easy', seeded(9), [PRESETS[shape], PRESETS.standard], false);
    const top = game.tops[0];
    const radius = DISH - 20; // near the rim
    top.x = Math.cos((angle * Math.PI) / 180) * radius; top.y = Math.sin((angle * Math.PI) / 180) * radius;
    game.tops[1].x = -top.x; game.tops[1].y = -top.y; // the other top is out of the way
    game.steer(Math.cos((angle * Math.PI) / 180), Math.sin((angle * Math.PI) / 180)); // straight at the rim
    assert.equal(game.dash(0), true);
    game.steer(0, 0); // the dash alone: the hand is off the controls
    run(game, 3);
    assert.equal(top.out, false, `${shape} at ${angle} degrees stays in the dish after a dash`);
  }
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
// The shape of a top is felt in play: a heavy one throws a light one harder than it is thrown back.
{
  const game = createKoma('easy', seeded(7), [PRESETS.sharp, PRESETS.heavy], false);
  const [light, heavy] = game.tops;
  light.x = -14; light.y = 0; light.vx = 100;
  heavy.x = 14; heavy.y = 0; heavy.vx = -100;
  game.step();
  assert.ok(Math.abs(light.vx) > Math.abs(heavy.vx), 'the light one is thrown back harder');
}

// The four starting shapes hold their own against each other (fixed seeds, the computer playing both sides): none beats another by a wall.
{
  const names = Object.keys(PRESETS);
  for (let a = 0; a < names.length; a++) for (let b = a + 1; b < names.length; b++) {
    let wins = 0;
    const games = 60;
    for (let i = 1; i <= games; i++) {
      const swap = i % 2 === 1;
      const game = createKoma('normal', seeded(i * 31 + 7), swap ? [PRESETS[names[b]], PRESETS[names[a]]] : [PRESETS[names[a]], PRESETS[names[b]]], true);
      while (!game.result && game.time < 120) game.step();
      const winner = game.result.winner;
      wins += winner === 'draw' ? 0.5 : winner === (swap ? 1 : 0) ? 1 : 0;
    }
    const rate = wins / games;
    assert.ok(rate > 0.15 && rate < 0.85, `${names[a]} against ${names[b]}: ${Math.round(rate * 100)}%`);
  }
}
console.log('koma engine ok');
