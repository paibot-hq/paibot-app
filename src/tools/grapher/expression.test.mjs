import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compile, realPower, clean } from './expression.ts';

const value = (text, x = 0, y = 0) => { const c = compile(text, ['x', 'y']); assert.ok(c.ok, `${text}: ${c.error}`); return c.evaluate(x, y); };
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`);
const error = text => { const c = compile(text, ['x', 'y']); assert.equal(c.ok, false, text); return c.error; };

test('numbers, the four operations and brackets, with the usual precedence', () => {
  close(value('1 + 2 * 3'), 7);
  close(value('(1 + 2) * 3'), 9);
  close(value('10 / 4 - 1'), 1.5);
  close(value('2 - 3 - 4'), -5);
  close(value('8 / 2 / 2'), 2);
  close(value('.5 + 1.25'), 1.75);
  close(value('1e3 + 2e-1'), 1000.2);
});

test('powers go right to left, and a minus before a power applies to the whole power', () => {
  close(value('2^3^2'), 512);
  close(value('-x^2', 3), -9);
  close(value('(-x)^2', 3), 9);
  close(value('2^-x', 2), 0.25);
  close(value('x^2 + 1', 3), 10);
});

test('multiplication can be left out', () => {
  close(value('2x', 4), 8);
  close(value('2(x + 1)', 4), 10);
  close(value('(x + 1)(x - 1)', 4), 15);
  close(value('x(x + 1)', 3), 12);
  close(value('2pi'), 2 * Math.PI);
  close(value('x sin(x)', Math.PI / 2), Math.PI / 2);
  close(value('xy', 3, 4), 12);
  close(value('3x^2y', 2, 5), 60);
  close(value('1/2x', 6), 3);
});

test('functions and constants', () => {
  close(value('sin(pi/2)'), 1);
  close(value('cos(0) + tan(0)'), 1);
  close(value('sqrt(16)'), 4);
  close(value('abs(-3)'), 3);
  close(value('ln(e)'), 1);
  close(value('log(1000)'), 3);
  close(value('log(8, 2)'), 3);
  close(value('exp(1)'), Math.E);
  close(value('floor(2.7) + ceil(2.1) + round(2.5) + sign(-4)'), 2 + 3 + 3 - 1);
  close(value('asin(1)'), Math.PI / 2);
  close(value('cosh(0)'), 1);
  close(value('cbrt(-8)'), -2);
  close(value('SIN(PI)'), Math.sin(Math.PI));
});

test('real roots of negative numbers', () => {
  close(realPower(-8, 1 / 3), -2);
  close(realPower(-8, 2 / 3), 4);
  assert.ok(Number.isNaN(realPower(-4, 0.5)));
  close(value('x^(1/3)', -27), -3);
  assert.ok(Number.isNaN(value('x^0.5', -4)));
  close(realPower(-2, 3), -8);
});

test('what people type: leading y =, full-width characters, × ÷ − π', () => {
  close(value('y = x^2', 3), 9);
  close(value('f(x) = 2x', 3), 6);
  close(value('２ｘ＋１', 3), 7);
  close(value('6 ÷ 3 × x', 5), 10);
  close(value('5 − x', 2), 3);
  close(value('π'), Math.PI);
  assert.equal(clean('  y = x'), 'x');
});

test('mistakes are reported with a code, never thrown', () => {
  assert.equal(error(''), 'empty');
  assert.equal(error('   '), 'empty');
  assert.equal(error('y ='), 'empty');
  assert.equal(error('2 +'), 'unexpected');
  assert.equal(error('* 3'), 'unexpected');
  assert.equal(error('2 $ 3'), 'unexpected');
  assert.equal(error('(1 + 2'), 'brackets');
  assert.equal(error('1 + 2)'), 'brackets');
  assert.equal(error('foo(1)'), 'unknownName');
  assert.equal(error('sin x'), 'needBrackets');
  assert.equal(error('log(1, 2, 3)'), 'arguments');
  assert.equal(error('sin()'), 'unexpected');
  assert.equal(compile('x', ['x']).ok, true);
  assert.equal(compile('y', ['x']).ok, false, 'y is not a variable of a curve y = f(x)');
});

test('it does not run anything it should not', () => {
  for (const text of ['constructor', 'process.exit()', 'alert(1)', '__proto__', 'x.y', 'this']) assert.equal(compile(text).ok, false, text);
});

test('values outside the domain are NaN or infinite, not errors', () => {
  const c = compile('1/x');
  assert.equal(c.evaluate(0), Infinity);
  assert.ok(Number.isNaN(compile('sqrt(x)').evaluate(-1)));
  assert.ok(Number.isNaN(compile('ln(x)').evaluate(-1)));
});
