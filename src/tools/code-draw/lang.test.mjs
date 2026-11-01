import { test } from 'node:test';
import assert from 'node:assert/strict';
import { run, translate, knobs, replaceNumber, codeLines, segments, samePicture, tokenize, MAX_STEPS } from './lang.ts';
import { STAGES, EXAMPLES } from './stages.ts';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);
const end = steps => steps[steps.length - 1].to;

test('the robot starts in the middle facing up; right turns clockwise', () => {
  const { steps, error } = run('forward 100 right 90 forward 50');
  assert.equal(error, null);
  close(steps[0].to.x, 0); close(steps[0].to.y, 100);
  close(end(steps).x, 50); close(end(steps).y, 100);
});

test('Japanese, English and Chinese words all work, full-width digits, brackets and spaces too', () => {
  const ja = run('くりかえす　４　［すすむ１００ みぎ ９０］');
  const en = run('repeat 4 [ fd 100 rt 90 ]');
  const zh = run('重复 4 { 前进 100 右转 90 }');
  for (const r of [ja, en, zh]) assert.equal(r.error, null);
  assert.ok(samePicture(segments(ja.steps), segments(en.steps)));
  assert.ok(samePicture(segments(zh.steps), segments(en.steps)));
  close(end(ja.steps).x, 0); close(end(ja.steps).y, 0);
});

test('i counts the rounds of the innermost loop, and the outer i comes back', () => {
  const { steps } = run('repeat 2 [ repeat 3 [ forward i ] forward i * 100 ]');
  const moves = steps.map(s => s.to.y - s.from.y);
  assert.deepEqual(moves, [1, 2, 3, 100, 1, 2, 3, 200]);
});

test('variables, arithmetic and precedence', () => {
  const { steps, error } = run('x = 10\nx = x + 5\nforward (x - 5) * 2 + 10 % 4 - -1');
  assert.equal(error, null);
  close(steps[0].to.y, 23);
});

test('pen up moves without drawing; color and width are kept on each line', () => {
  const { steps } = run('penup forward 10 pendown color red width 5 forward 10 color 120 forward 10');
  assert.deepEqual(steps.map(s => s.draw), [false, true, true]);
  assert.equal(steps[1].color, 'hsl(0 90% 62%)');
  assert.equal(steps[2].color, 'hsl(120 90% 62%)');
  assert.equal(steps[2].width, 5);
});

test('comments are skipped', () => {
  assert.equal(run('# a square\nforward 10 // and more\n').steps.length, 1);
});

test('errors say what is wrong and on which line', () => {
  assert.deepEqual(run('forward 10\njump 5').error, { code: 'unknownWord', line: 2, text: 'jump' });
  assert.deepEqual(run('forward\nright 90').error, { code: 'needNumber', line: 1, text: 'forward' });
  assert.deepEqual(run('repeat 4\nforward 10').error, { code: 'needOpen', line: 1 });
  assert.deepEqual(run('repeat 4 [\nforward 10').error, { code: 'unclosed', line: 1 });
  assert.deepEqual(run('forward 10 ]').error, { code: 'strayClose', line: 1 });
  assert.deepEqual(run('\nforward y').error, { code: 'unknownVariable', line: 2, text: 'y' });
  assert.deepEqual(run('forward 1 / 0').error, { code: 'badNumber', line: 1 });
  assert.deepEqual(run('forward 10 @').error, { code: 'badChar', line: 1, text: '@' });
  // What ran before a run-time error is kept, so it can be drawn.
  assert.equal(run('forward 10\nforward z').steps.length, 1);
});

test('a runaway loop stops with an error instead of freezing', () => {
  const r = run('repeat 1000 [ repeat 1000 [ forward 1 ] ]');
  assert.equal(r.error.code, 'tooMany');
  assert.ok(r.steps.length <= MAX_STEPS);
  assert.equal(run('repeat 100000000 [ ]').error.code, 'tooMany');
});

test('translate swaps only the command words', () => {
  const code = '# forward\nrepeat 4 [\n  forward 100 # comment\n  right 90\n]';
  assert.equal(translate(code, 'ja'), '# forward\nくりかえす 4 [\n  すすむ 100 # comment\n  みぎ 90\n]');
  assert.equal(translate(translate(code, 'zh'), 'en'), code);
  assert.equal(translate('color white color yellow', 'ja'), 'いろ しろ いろ きいろ');
  assert.equal(translate('color white', 'zh'), '颜色 白');
});

test('knobs find each number with a range that suits its command, and write a new value back', () => {
  const code = 'repeat 4 [ forward 100 right 90 ]\ncolor i * 3';
  const list = knobs(code);
  assert.deepEqual(list.map(k => [k.value, k.command, k.min, k.max]), [[4, 'repeat', 1, 72], [100, 'forward', 0, 300], [90, 'right', 0, 360], [3, 'color', 0, 360]]);
  assert.equal(replaceNumber(code, list[2], 144), 'repeat 4 [ forward 100 right 144 ]\ncolor i * 3');
  // Positions are in the original text even when full-width digits are typed.
  const wide = 'すすむ　１００';
  assert.equal(replaceNumber(wide, knobs(wide)[0], 5), 'すすむ　5');
});

test('Latin variable names may contain digits; Japanese words stop before them', () => {
  assert.deepEqual(tokenize('x2 すすむ10').map(t => t.kind), ['word', 'word', 'num']);
});

test('codeLines counts lines that do something', () => {
  assert.equal(codeLines('# hi\n\nforward 10\n  # x\nright 9 # turn\n'), 2);
});

test('the same picture is recognised however it is drawn', () => {
  const square = segments(run('repeat 4 [ forward 100 right 90 ]').steps);
  assert.ok(samePicture(square, segments(run('forward 50 forward 50 right 90 forward 100 right 90 forward 100 right 90 forward 100').steps)));
  // Backwards, and the other way round.
  assert.ok(samePicture(square, segments(run('right 90 forward 100 left 90 forward 100 left 90 forward 100 left 90 forward 100').steps)));
  assert.ok(!samePicture(square, segments(run('repeat 3 [ forward 100 right 90 ]').steps)));
  assert.ok(!samePicture(square, segments(run('repeat 4 [ forward 100 right 90 ] forward 150').steps)));
  assert.ok(!samePicture(square, segments(run('repeat 4 [ forward 110 right 90 ]').steps)));
});

test('every challenge answer runs, matches itself, fits on the canvas and has the stated length', () => {
  for (const stage of STAGES) {
    const { steps, error } = run(stage.answer);
    assert.equal(error, null, stage.id);
    assert.ok(segments(steps).length > 0, stage.id);
    for (const s of steps) assert.ok(Math.abs(s.to.x) < 190 && Math.abs(s.to.y) < 190, `${stage.id} fits`);
    assert.equal(codeLines(stage.answer), stage.lines, stage.id);
  }
});

test('every example runs, fits on the canvas and reads the same in each language', () => {
  for (const example of EXAMPLES) {
    const { steps, error } = run(example.code);
    assert.equal(error, null, example.id);
    for (const s of steps) assert.ok(Math.abs(s.to.x) < 200 && Math.abs(s.to.y) < 200, `${example.id} fits`);
    for (const locale of ['ja', 'zh']) assert.equal(run(translate(example.code, locale)).steps.length, steps.length);
  }
});
