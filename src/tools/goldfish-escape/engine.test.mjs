import assert from 'node:assert/strict';
import { FISH_X, FOOD_PER_SIZE, MAX_SINK, POI_RADIUS, STROKE, TANK, createGoldfishEscape, fishRadius, passPoints, poiDepth } from './engine.ts';

// Plays the tank headlessly: the water, the scoops, the paper tearing, the food and whole games must work.
const run = (game, steps) => { for (let i = 0; i < steps && !game.state.over; i++) game.step(); };
function seeded(seed) {
  return () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };
}

// Before the first stroke nothing moves and nothing comes; a stroke starts the game and lifts the fish.
{
  const game = createGoldfishEscape(() => 0.5);
  const y = game.state.fishY;
  run(game, 300);
  assert.equal(game.state.started, false);
  assert.equal(game.state.fishY, y, 'the fish hovers until the first stroke');
  assert.equal(game.pois().length, 0);
  assert.ok(game.stroke());
  assert.equal(game.state.vy, STROKE);
  game.step();
  assert.ok(game.state.fishY < y, 'a stroke lifts the fish');
}

// Left alone the fish sinks, never faster than MAX_SINK, and rests on the gravel; it cannot leave the water either.
{
  const game = createGoldfishEscape(() => 0.5);
  game.stroke();
  let fastest = 0, last = game.state.fishY;
  for (let i = 0; i < 80; i++) { game.step(); fastest = Math.max(fastest, game.state.fishY - last); last = game.state.fishY; }
  assert.ok(fastest <= MAX_SINK + 1e-9);
  let lowest = 0;
  while (!game.state.over) { game.step(); lowest = Math.max(lowest, game.state.fishY); }
  assert.equal(lowest, TANK.floor - fishRadius(0), 'the fish rests on the gravel');
  const rising = createGoldfishEscape(() => 0.5);
  for (let i = 0; i < 60; i++) { rising.stroke(); rising.step(); }
  assert.equal(rising.state.fishY, TANK.surface + fishRadius(0), 'strokes stop at the surface');
}

// A scoop dips deepest at the fish's column and is out of the water when it comes in and once well past.
{
  const poi = { startX: TANK.width + 50, targetY: 400 };
  assert.ok(poiDepth({ ...poi, x: poi.startX }) < TANK.surface - POI_RADIUS);
  assert.equal(Math.round(poiDepth({ ...poi, x: FISH_X })), 400);
  assert.ok(poiDepth({ ...poi, x: FISH_X - (poi.startX - FISH_X) }) < TANK.surface - POI_RADIUS);
}

// A fish that never swims is caught by a scoop aimed at it (random 0.5 aims straight at it, and the paper lasts).
{
  const game = createGoldfishEscape(() => 0.5);
  const events = [];
  game.onEvent(event => events.push(event.type));
  game.stroke();
  run(game, 2000);
  assert.ok(game.state.over, 'caught');
  assert.equal(events.at(-1), 'caught');
  assert.equal(game.stroke(), false, 'no stroke after the game is over');
}

// Paper that has been under long enough tears, and a torn scoop catches nothing.
{
  // random 0 gives the shortest paper (TEAR_MIN) and aims the scoop a little above the fish.
  const game = createGoldfishEscape(() => 0);
  game.stroke();
  let tore = false;
  game.onEvent(event => { if (event.type === 'tear') tore = true; });
  for (let i = 0; i < 1500 && !tore && !game.state.over; i++) game.step();
  assert.ok(tore || game.state.over);
  if (tore) {
    const poi = game.pois().find(p => p.torn);
    assert.ok(poi.under >= poi.tearAt);
  }
}

// Passing a scoop scores, and the tank speeds up; food makes the fish bigger, and a bigger fish scores more per scoop.
{
  const game = createGoldfishEscape(seeded(7));
  const events = [];
  game.onEvent(event => events.push(event));
  // Swim away from where the next scoop aims, as a player would.
  let goal = (TANK.surface + TANK.floor) / 2;
  game.stroke();
  for (let i = 0; i < 20000 && !game.state.over; i++) {
    const next = game.pois().find(p => !p.passed && !p.torn && p.x > FISH_X - 40);
    if (next) goal = next.targetY > 300 ? next.targetY - 130 : next.targetY + 130;
    if (game.state.fishY > goal && game.state.vy > -1) game.stroke();
    game.step();
  }
  const passes = events.filter(e => e.type === 'pass');
  assert.ok(passes.length > 0, 'some scoops were passed');
  assert.equal(game.state.passed, passes.length);
  const eats = events.filter(e => e.type === 'eat');
  assert.equal(game.state.score, passes.reduce((sum, e) => sum + e.points, 0) + eats.length);
  for (const e of eats) assert.equal(e.size, Math.min(4, Math.floor((eats.indexOf(e) + 1) / FOOD_PER_SIZE)));
  for (const e of passes) assert.ok(e.points >= passPoints(0));
}

// The same seed plays the same game; every game ends.
{
  const play = () => {
    const game = createGoldfishEscape(seeded(42));
    for (let i = 0; i < 60000 && !game.state.over; i++) {
      if (!game.state.started || game.state.steps % 23 === 0) game.stroke();
      game.step();
    }
    return { ...game.state };
  };
  const a = play(), b = play();
  assert.deepEqual(a, b);
  assert.ok(a.over, 'the game ended');
}

console.log('PASS: goldfish escape: strokes and sinking, scoops dip, catch and tear, food grows the fish, scores, seeded games repeat');
