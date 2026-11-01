import { test } from 'node:test';
import assert from 'node:assert/strict';
import { format, inspect } from '../../src/lib/js-inspect.ts';

test('values print the way Node prints them', () => {
  assert.equal(format(['a', 1, true, null, undefined]), 'a 1 true null undefined');
  assert.equal(inspect({ a: 1, b: 'x', c: [1, 2] }), "{ a: 1, b: 'x', c: [ 1, 2 ] }");
  assert.equal(inspect([]), '[]');
  assert.equal(inspect({}), '{}');
  assert.equal(inspect(new Map([['k', 1]])), "Map(1) { 'k' => 1 }");
  assert.equal(inspect(new Set([1, 2])), 'Set(2) { 1, 2 }');
  assert.equal(inspect(10n), '10n');
  assert.equal(inspect(-0), '-0');
  assert.equal(inspect(function named() {}), '[Function: named]');
  assert.equal(inspect(class Box {}), '[class: Box]');
  assert.equal(inspect({ 'a-b': 1 }), "{ 'a-b': 1 }");
  assert.equal(inspect(new Uint8Array([1, 2])), 'Uint8Array(2) [ 1, 2 ]');
  assert.equal(inspect(new Error('boom')), 'Error: boom');
});

test('class instances carry their name; deep and circular values stop', () => {
  class Point { constructor() { this.x = 1; this.y = 2; } }
  assert.equal(inspect(new Point()), 'Point { x: 1, y: 2 }');
  assert.equal(inspect({ a: { b: { c: { d: { e: 1 } } } } }), '{ a: { b: { c: [Object] } } }');
  const loop = { name: 'loop' };
  loop.self = loop;
  assert.equal(inspect(loop), "{ name: 'loop', self: [Circular] }");
});

test('long values break onto lines; long arrays are cut', () => {
  const text = inspect({ first: 'a'.repeat(40), second: 'b'.repeat(40) });
  assert.equal(text, `{\n  first: '${'a'.repeat(40)}',\n  second: '${'b'.repeat(40)}'\n}`);
  assert.match(inspect(Array.from({ length: 150 }, (_, i) => i)), /\.\.\. 50 more items\n\]$/);
});
