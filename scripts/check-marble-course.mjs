import assert from 'node:assert/strict';
import Matter from 'matter-js';
import { buildCourse, STEP_MS } from '../src/lib/marble-course.ts';

// Plays the marble machine's course headlessly with the same fixed step as
// the page: the chain must reach the bell, in order, and replay identically.
function play(start = true) {
  const course = buildCourse(Matter);
  const times = {};
  course.onEvent(event => { times[event] = +(steps * STEP_MS / 1000).toFixed(2); });
  let steps = 0;
  if (start) course.start();
  for (; steps < 20_000 / STEP_MS && !course.events.includes('goal'); steps++) course.step();
  const positions = Matter.Composite.allBodies(course.engine.world).map(body => [body.position.x, body.position.y, body.angle]);
  return { events: course.events, times, positions };
}

const idle = play(false);
assert.deepEqual(idle.events, [], 'nothing moves before start');

const run = play();
assert.deepEqual(run.events, ['start', 'spring', 'domino', 'ballB', 'goal'], `chain order: ${run.events.join(' > ')}`);
assert.ok(run.times.goal <= 15, `reaches the bell in ${run.times.goal}s (limit 15s)`);
assert.deepEqual(play().positions, run.positions, 'a second run ends in exactly the same state');

console.log(`PASS: marble course runs start > spring ${run.times.spring}s > dominoes ${run.times.domino}s > ball B ${run.times.ballB}s > bell ${run.times.goal}s, identically every time`);
