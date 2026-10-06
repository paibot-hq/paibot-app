import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SOLIDS, build, polyhedron, rotate, project, length, dot, faceNormal, brightness } from './polyhedra.ts';

// vertices, edges, faces, sides of each face
const known = { tetra: [4, 6, 4, 3], cube: [8, 12, 6, 4], octa: [6, 12, 8, 3], dodeca: [20, 30, 12, 5], icosa: [12, 30, 20, 3] };

test('each solid has the vertices, edges and faces it should, and Euler\'s formula holds', () => {
  for (const solid of SOLIDS) {
    const { vertices, edges, faces } = polyhedron(solid);
    const [v, e, f, sides] = known[solid];
    assert.deepEqual([vertices.length, edges.length, faces.length], [v, e, f], solid);
    assert.equal(vertices.length - edges.length + faces.length, 2, solid);
    for (const face of faces) assert.equal(face.length, sides, solid);
  }
});

test('the vertices are on the unit sphere, and all edges of a solid are equally long', () => {
  for (const solid of SOLIDS) {
    const { vertices, edges } = polyhedron(solid);
    for (const v of vertices) assert.ok(Math.abs(length(v) - 1) < 1e-9, solid);
    const lengths = edges.map(([a, b]) => length({ x: vertices[a].x - vertices[b].x, y: vertices[a].y - vertices[b].y, z: vertices[a].z - vertices[b].z }));
    for (const l of lengths) assert.ok(Math.abs(l - lengths[0]) < 1e-9, `${solid} edges differ`);
  }
});

test('each face is flat, faces outward, and every vertex lies behind it', () => {
  for (const solid of SOLIDS) {
    const { vertices, faces } = polyhedron(solid);
    for (const face of faces) {
      const normal = faceNormal(vertices, face);
      const d = dot(normal, vertices[face[0]]);
      assert.ok(d > 0, `${solid} face points inward`);
      for (const index of face) assert.ok(Math.abs(dot(normal, vertices[index]) - d) < 1e-9, `${solid} face is not flat`);
      vertices.forEach(v => assert.ok(dot(normal, v) <= d + 1e-9, `${solid} vertex in front of a face`));
    }
  }
});

test('rotation keeps lengths, a turn of zero changes nothing, and a quarter turn about the vertical axis moves x to -z', () => {
  const p = { x: 0.3, y: -0.5, z: 0.8 };
  const r = rotate(p, 1.1, -0.7);
  assert.ok(Math.abs(length(r) - length(p)) < 1e-12);
  const same = rotate(p, 0, 0);
  assert.deepEqual([same.x, same.y, same.z], [p.x, p.y, p.z]);
  const q = rotate({ x: 1, y: 0, z: 0 }, Math.PI / 2, 0);
  assert.ok(Math.abs(q.x) < 1e-12 && Math.abs(q.z + 1) < 1e-12);
});

test('perspective: the centre is in the middle, nearer is bigger, up is up on the screen', () => {
  const middle = project({ x: 0, y: 0, z: 0 }, 640);
  assert.deepEqual([middle.x, middle.y], [320, 320]);
  assert.ok(project({ x: 0, y: 0, z: -1 }, 640).scale > project({ x: 0, y: 0, z: 1 }, 640).scale);
  assert.ok(project({ x: 0, y: 1, z: 0 }, 640).y < 320);
});

test('a face turned to the light is brighter than one turned away', () => {
  assert.ok(brightness({ x: -0.4, y: 0.7, z: -0.6 }) > brightness({ x: 0.4, y: -0.7, z: 0.6 }));
  for (const n of [{ x: 1, y: 0, z: 0 }, { x: 0, y: -1, z: 0 }]) { const b = brightness(n); assert.ok(b >= 0.25 && b <= 1); }
});

test('prisms, pyramids and geodesic polyhedra have the counts their number gives, and Euler\'s formula holds', () => {
  for (let n = 3; n <= 20; n++) {
    const p = build('prism', n), y = build('pyramid', n);
    assert.deepEqual([p.vertices.length, p.edges.length, p.faces.length], [2 * n, 3 * n, n + 2], `prism ${n}`);
    assert.deepEqual([y.vertices.length, y.edges.length, y.faces.length], [n + 1, 2 * n, n + 1], `pyramid ${n}`);
  }
  for (let f = 1; f <= 5; f++) {
    const g = build('geodesic', f);
    assert.deepEqual([g.vertices.length, g.edges.length, g.faces.length], [10 * f * f + 2, 30 * f * f, 20 * f * f], `geodesic ${f}`);
    for (const v of g.vertices) assert.ok(Math.abs(length(v) - 1) < 1e-9);
  }
});

test('the faces of the made shapes are flat and face outward, with every vertex behind them', () => {
  const shapes = [build('prism', 7), build('prism', 20), build('pyramid', 3), build('pyramid', 11), build('geodesic', 1), build('geodesic', 3)];
  for (const { vertices, faces } of shapes) {
    for (const face of faces) {
      const normal = faceNormal(vertices, face);
      const d = dot(normal, vertices[face[0]]);
      assert.ok(d > 0, 'a face points inward');
      for (const index of face) assert.ok(Math.abs(dot(normal, vertices[index]) - d) < 1e-9, 'a face is not flat');
      for (const v of vertices) assert.ok(dot(normal, v) <= d + 1e-9, 'a vertex in front of a face');
    }
  }
});

test('every edge of a closed shape is shared by exactly two faces', () => {
  for (const shape of [build('prism', 9), build('pyramid', 6), build('geodesic', 4), build('dodeca')]) {
    const uses = new Map();
    for (const face of shape.faces) face.forEach((a, i) => { const b = face[(i + 1) % face.length]; const key = a < b ? `${a},${b}` : `${b},${a}`; uses.set(key, (uses.get(key) ?? 0) + 1); });
    for (const count of uses.values()) assert.equal(count, 2);
  }
});
