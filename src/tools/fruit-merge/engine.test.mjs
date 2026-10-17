import assert from 'node:assert/strict';
import Matter from 'matter-js';
import { BOX, COOLDOWN, FRUITS, LAST, OVER_STEPS, VANISH_POINTS, createFruitMerge, points } from './engine.ts';

// Plays the fruit box headlessly: merging, the drop rules, the line and a
// whole game must work.
const run = (game, steps) => { for (let i = 0; i < steps; i++) game.step(); };
// A seeded random, so a whole game plays the same every time.
function seeded(seed) {
  return () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };
}

// Two cherries dropped on the same spot become a strawberry.
{
  const game = createFruitMerge(Matter, () => 0);
  const events = [];
  game.onEvent(event => events.push(event.type));
  assert.equal(game.state.current, 0);
  assert.ok(game.drop());
  run(game, 90);
  assert.ok(game.drop());
  run(game, 120);
  const fruits = game.fruits();
  assert.equal(fruits.length, 1, 'the two cherries merged');
  assert.equal(fruits[0].kind, 1);
  assert.equal(fruits[0].scale, 1, 'the strawberry grew to full size');
  assert.equal(game.state.score, points(1));
  assert.deepEqual(events, ['drop', 'drop', 'merge']);
}

// No second drop until the cooldown is over; the aim stays inside the box.
{
  const game = createFruitMerge(Matter, () => 0.99);
  assert.equal(game.state.current, 4, 'only the five smallest kinds are handed out');
  game.setAim(-100);
  assert.equal(game.state.aim, FRUITS[4].radius);
  game.setAim(10_000);
  assert.equal(game.state.aim, BOX.width - FRUITS[4].radius);
  assert.ok(game.drop());
  assert.ok(!game.drop() && !game.ready(), 'a drop straight after is refused');
  run(game, COOLDOWN);
  assert.ok(game.ready() && game.drop());
  assert.equal(game.state.drops, 2);
}

// Merges cascade, and two watermelons vanish for the last points.
{
  const game = createFruitMerge(Matter);
  game.spawn(LAST - 1, 180, BOX.height - 80);
  game.spawn(LAST - 1, 220, BOX.height - 260);
  run(game, 240);
  assert.deepEqual(game.fruits().map(f => f.kind), [LAST], 'two melons made a watermelon');
  game.spawn(LAST, BOX.width / 2, 120);
  run(game, 240);
  assert.equal(game.fruits().length, 0, 'two watermelons vanished');
  assert.equal(game.state.score, points(LAST) + VANISH_POINTS);
  assert.equal(game.state.maxKind, LAST);
}

// A fruit held above the line ends the game after OVER_STEPS, not before.
{
  const game = createFruitMerge(Matter);
  const over = [];
  game.onEvent(event => event.type === 'gameOver' && over.push(event));
  const { body } = game.spawn(2, BOX.width / 2, 60, 1, -1000);
  Matter.Body.setStatic(body, true);
  run(game, OVER_STEPS - 1);
  assert.ok(game.state.danger && !game.state.over, 'warned, not yet over');
  run(game, 1);
  assert.ok(game.state.over && !game.state.danger);
  assert.equal(over.length, 1);
  assert.ok(!game.drop(), 'no drops after the game is over');
}

// A falling fruit is not counted while it drops through the line.
{
  const game = createFruitMerge(Matter, () => 0.99);
  game.drop();
  run(game, 30);
  assert.ok(!game.state.danger);
}

// Dropping at random spots fills the box and ends the game.
{
  const random = seeded(7);
  const game = createFruitMerge(Matter, random);
  let steps = 0;
  while (!game.state.over && steps < 60 * 60 * 10) {
    if (game.ready()) { game.setAim(random() * BOX.width); game.drop(); }
    game.step();
    steps += 1;
  }
  assert.ok(game.state.over, `the game ended (${game.state.drops} drops, ${steps} steps)`);
  assert.ok(game.state.score > 50 && game.state.maxKind >= 4, `fruits merged on the way (score ${game.state.score}, best kind ${game.state.maxKind})`);
  for (const fruit of game.fruits()) {
    const { x, y } = fruit.body.position, r = game.radiusOf(fruit);
    assert.ok(x > r - 3 && x < BOX.width - r + 3 && y < BOX.height - r + 3, `fruit ${fruit.kind} stays in the box (${x.toFixed(1)}, ${y.toFixed(1)})`);
  }
}
