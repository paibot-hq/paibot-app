import assert from 'node:assert/strict';
import Matter from 'matter-js';
import { createGame } from '../src/lib/pachinko.ts';

// Plays the pachinko board headlessly with seeded randomness (one launch
// every 0.5 s, as the page does): launch power must matter, the attacker
// must only take balls while open, and a seed must replay identically.
function seeded(seed) {
  return () => {
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function play(power, seed, seconds, options) {
  const game = createGame(Matter, seeded(seed), options);
  const stats = { closedAttacker: 0, jackpots: 0, closes: 0, maxInFlight: 0 };
  // Balls already past the lid when it closes still land and count, like a
  // real attacker; 45 steps (0.75 s) is ample for them to finish falling.
  let closedAt = -Infinity;
  game.onEvent(event => {
    if (event.type === 'pocket' && event.pocket === 'attacker' && !game.state.open && steps - closedAt > 45) stats.closedAttacker++;
    if (event.type === 'result' && event.hit) stats.jackpots++;
    if (event.type === 'jackpotEnd') { stats.closes++; closedAt = steps; }
  });
  let steps = 0;
  for (; steps < seconds * 60 && !game.over(); steps++) {
    if (steps % 30 === 0) game.launch(power);
    game.step();
    stats.maxInFlight = Math.max(stats.maxInFlight, game.state.inFlight);
  }
  return { ...stats, balls: game.state.balls, seconds: steps / 60, over: game.over() };
}

// Skill: over two minutes, a good launch power usually keeps going and a weak
// one usually runs out (luck still decides a few games either way).
const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const good = seeds.map(seed => play(0.7, seed, 120));
const weak = seeds.map(seed => play(0.3, seed, 120));
const lasted = runs => runs.filter(run => !run.over).length;
assert.ok(lasted(good) >= 7, `power 0.7 should last 2 minutes in at least 7/10 games, got ${lasted(good)}`);
assert.ok(lasted(weak) <= 3, `power 0.3 should run out in at least 7/10 games, but ${lasted(weak)} lasted`);

for (const run of [...good, ...weak]) {
  assert.equal(run.closedAttacker, 0, 'the attacker takes balls only while open');
  // Launching every 0.5 s with a 12 s sweep, at most ~25 balls can be in play.
  assert.ok(run.maxInFlight <= 25, `balls never pile up (max ${run.maxInFlight})`);
}

// Every jackpot opens the attacker and closes it again.
const lucky = play(0.7, 4, 60, { hitChance: 1 });
assert.ok(lucky.jackpots >= 2 && lucky.closes >= lucky.jackpots - 1, `jackpots open and close: ${JSON.stringify(lucky)}`);
assert.equal(lucky.closedAttacker, 0);

assert.deepEqual(play(0.7, 5, 30), play(0.7, 5, 30), 'the same seed replays identically');

console.log(`PASS: pachinko over 2 minutes: power 0.7 lasts in ${lasted(good)}/10 games, power 0.3 in ${lasted(weak)}/10; attacker only takes balls while open; jackpots open and close; seeded replays match`);
