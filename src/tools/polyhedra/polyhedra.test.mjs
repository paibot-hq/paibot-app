import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SOLIDS, polyhedron, rotate, project, length, dot, faceNormal, brightness } from './polyhedra.ts';

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
