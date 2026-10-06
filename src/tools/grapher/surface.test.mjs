import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSurface, rotate, project, faceNormal, HEIGHT } from './surface.ts';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

test('a smooth surface is a full grid of faces, scaled into the box', () => {
  const s = buildSurface((x, y) => x * x + y * y, 5, 40);
  assert.equal(s.quads.length, 40 * 40);
  close(s.zMin, 0);
  close(s.zMax, 50);
  for (const q of s.quads) {
    assert.ok(q.t >= -1e-9 && q.t <= 1 + 1e-9);
    for (const p of q.points) assert.ok(Math.abs(p.x) <= 1 + 1e-9 && Math.abs(p.z) <= 1 + 1e-9 && Math.abs(p.y) <= HEIGHT + 1e-9);
  }
});

test('the height goes up with z: for z = x the higher x is, the larger t and the higher the face', () => {
  const s = buildSurface((x) => x, 4, 20);
  const left = s.quads.find(q => q.points[0].x < -0.9), right = s.quads.find(q => q.points[0].x > 0.85);
  assert.ok(right.t > left.t);
  assert.ok(right.points[0].y > left.points[0].y);
  close(s.zero, 0, 1e-9);
});

test('where the formula has no value there is a hole', () => {
  const half = buildSurface((x, y) => Math.sqrt(x), 5, 40);
  assert.ok(half.quads.length < 40 * 40 * 0.55 && half.quads.length > 40 * 40 * 0.4, `${half.quads.length}`);
  assert.equal(buildSurface(() => NaN, 5, 10).quads.length, 0);
  assert.equal(buildSurface(() => Infinity, 5, 10).quads.length, 0);
});

test('a pole is left out instead of squashing the rest of the surface flat', () => {
  const s = buildSurface((x, y) => 1 / (x * x + y * y), 5, 40);
  assert.ok(s.quads.length < 40 * 40 && s.quads.length > 40 * 40 * 0.9, `${s.quads.length}`);
  assert.ok(s.zMax < 1e4, `zMax ${s.zMax}`);
  const spike = buildSurface((x, y) => (x === 0 && y === 0 ? 1e9 : x + y), 5, 40);
  assert.ok(spike.zMax < 20, `a single spike is not drawn: ${spike.zMax}`);
  assert.equal(spike.quads.length, 40 * 40 - 4);
});

test('a flat surface does not divide by zero', () => {
  const s = buildSurface(() => 3, 5, 10);
  assert.equal(s.quads.length, 100);
  for (const q of s.quads) for (const p of q.points) assert.ok(Number.isFinite(p.y));
  const zero = buildSurface(() => 0, 5, 10);
  for (const q of zero.quads) assert.ok(Number.isFinite(q.t));
});

test('the zero plane stays inside the box', () => {
  assert.ok(Math.abs(buildSurface((x, y) => 100 + x, 5, 10).zero) <= HEIGHT);
  assert.ok(Math.abs(buildSurface((x, y) => -100 + x, 5, 10).zero) <= HEIGHT);
});

test('rotation keeps lengths, and a quarter turn about the vertical axis moves x to -z', () => {
  const p = { x: 0.3, y: -0.5, z: 0.8 };
  const r = rotate(p, 1.1, -0.7);
  close(Math.hypot(r.x, r.y, r.z), Math.hypot(p.x, p.y, p.z), 1e-12);
  const q = rotate({ x: 1, y: 0, z: 0 }, Math.PI / 2, 0);
  assert.ok(Math.abs(q.x) < 1e-12 && Math.abs(q.z + 1) < 1e-12);
});

test('perspective: the centre is in the middle, nearer is bigger, up is up on the screen, zoom enlarges', () => {
  const mid = project({ x: 0, y: 0, z: 0 }, 960, 640);
  assert.deepEqual([mid.x, mid.y], [480, 320]);
  assert.ok(Math.abs(project({ x: 1, y: 0, z: -1 }, 960, 640).x - 480) > Math.abs(project({ x: 1, y: 0, z: 1 }, 960, 640).x - 480));
  assert.ok(project({ x: 0, y: 1, z: 0 }, 960, 640).y < 320);
  assert.ok(Math.abs(project({ x: 1, y: 0, z: 0 }, 960, 640, 2).x - 480) > Math.abs(project({ x: 1, y: 0, z: 0 }, 960, 640).x - 480));
});

test('a face of a flat floor has a normal pointing straight up or down', () => {
  const s = buildSurface(() => 1, 5, 4);
  const n = faceNormal(s.quads[0]);
  close(Math.abs(n.y), 1, 1e-9);
});
