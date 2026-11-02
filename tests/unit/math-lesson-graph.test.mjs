import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutGraph } from '../../src/lib/math-lesson-graph.ts';
import { figureText, lessonProblems } from '../../scripts/lib/math-lesson-check.mjs';

const caption = text => ({ ja: text, en: text, zh: text });
const lesson = figure => ({ sections: [{ heading: caption('h'), paragraphs: [caption('p')], figures: [figure] }], examples: [{ kind: 'value', question: '1 + 1', steps: ['1 + 1 = 2'], note: caption('n') }], mistakes: [] });
const graph = body => ({ caption: caption('c'), graph: body });

test('a graph is laid out: ticks, curves, points and a region', () => {
  const layout = layoutGraph({
    view: { x: [-3, 5], y: [-3, 8] },
    curves: [{ y: 'x^2 - 2*x', label: 'y = x² − 2x' }, { x: '3', dashed: true }, { implicit: 'x^2 + y^2 = 4' }],
    points: [{ x: 1, y: -1, label: '(1, −1)' }],
    region: { lhs: 'y', op: '>', rhs: 'x^2' },
  });
  assert.ok(layout.curves.every(curve => curve.d), 'every curve has a path');
  assert.ok(layout.curves[0].d.length > 100 && layout.curves[2].d.length > 100, 'a parabola and a circle are many segments, a vertical line only one');
  assert.ok(layout.curves[0].label, 'the parabola is labelled');
  assert.equal(layout.curves[1].dashed, true);
  assert.ok(layout.region.length > 20);
  assert.ok(layout.axisX !== null && layout.axisY !== null, 'the axes are in the window');
  assert.deepEqual(layout.ticksX.map(tick => tick.label), ['−3', '−2', '−1', '1', '2', '3', '4', '5']);
  assert.equal(layout.points.length, 1);
});

test('the window shapes the figure: equal scales, π ticks, stretched when very tall', () => {
  const square = layoutGraph({ view: { x: [-4, 4], y: [-4, 4] }, curves: [{ y: 'x' }] });
  assert.equal(square.width, square.height);
  const trig = layoutGraph({ view: { x: [-2 * Math.PI, 2 * Math.PI], y: [-2, 2], pi: true }, curves: [{ y: 'sin(x)' }] });
  assert.deepEqual(trig.ticksX.map(tick => tick.label), ['−2π', '−3π/2', '−π', '−π/2', 'π/2', 'π', '3π/2', '2π']);
  assert.ok(trig.height < trig.width);
  const tall = layoutGraph({ view: { x: [0, 1], y: [0, 100] }, curves: [{ y: '100*x' }] });
  assert.ok(tall.height <= Math.round(1.2 * 308) + 52, 'a tall window is stretched into the page, not made taller');
  assert.equal(tall.axisX, layoutGraph({ view: { x: [0, 1], y: [0, 100] } }).axisX);
});

test('curves leave a gap where they run off or jump', () => {
  const tan = layoutGraph({ view: { x: [-3, 3], y: [-4, 4] }, curves: [{ y: 'tan(x)' }] });
  assert.ok((tan.curves[0].d.match(/M/g) ?? []).length >= 2, 'tan(x) breaks at its asymptotes');
  const exp = layoutGraph({ view: { x: [-3, 3], y: [-1, 9] }, curves: [{ y: 'exp(x)' }, { y: 'ln(x)' }] });
  assert.ok(exp.curves.every(curve => curve.d), 'exp and ln are drawn');
});

test('a lesson figure is checked', () => {
  const ok = [
    graph({ curves: [{ y: '2*x + 1', label: 'y = 2x + 1' }], points: [{ x: 1, y: 3, on: [0] }] }),
    { caption: caption('c'), shape: 'angle-triangle', numbers: '50, 60' },
    { caption: caption('c'), shape: 'rect-area', numbers: '4, 3' },
  ];
  for (const figure of ok) assert.deepEqual(lessonProblems('k', lesson(figure)), []);
  const bad = {
    'outside the window': graph({ view: { x: [-2, 2], y: [-2, 2] }, curves: [{ y: 'x' }], points: [{ x: 5, y: 5 }] }),
    'is not in the window': graph({ view: { x: [-2, 2], y: [-2, 2] }, curves: [{ y: '100 + x' }] }),
    'one of y, x or implicit': graph({ curves: [{ y: 'x', x: '1' }] }),
    'no curve 3': graph({ curves: [{ y: 'x' }], points: [{ x: 1, y: 1, on: [3] }] }),
    'view needs': graph({ view: { x: [3, -3], y: [-6, 6] }, curves: [{ y: 'x' }] }),
    'at most 4 curves': graph({ curves: [{ y: 'x' }, { y: 'x + 1' }, { y: 'x + 2' }, { y: 'x + 3' }, { y: 'x + 4' }] }),
    'needs other numbers': { caption: caption('c'), shape: 'angle-triangle', numbers: '50' },
    'No reading for figure': { caption: caption('c'), shape: 'no-such-shape', numbers: '1' },
    'missing text': { caption: { ja: 'c', en: 'c' }, shape: 'rect-area', numbers: '4, 3' },
    'a figure has a shape': { caption: caption('c') },
  };
  for (const [expected, figure] of Object.entries(bad)) {
    const found = lessonProblems('k', lesson(figure)).join('\n');
    assert.ok(found.includes(expected), `expected "${expected}" in: ${found}`);
  }
});

test('what a figure shows is told to the reviewer in words', () => {
  assert.match(figureText({ caption: caption('c'), shape: 'angle-triangle', numbers: '50, 60' }), /50°、60°/);
  const text = figureText(graph({ curves: [{ y: 'x^2', label: 'y = x²' }, { implicit: 'x^2 + y^2 = 4', dashed: true }], points: [{ x: 1, y: 1, label: 'A(1, 1)', on: [0] }], region: { lhs: 'y', op: '>=', rhs: 'x' } }));
  for (const part of ['y = x^2', '図中の名前「y = x²」', 'x^2 + y^2 = 4（破線）', '点 (1, 1)', '曲線 0 の上', 'y >= x']) assert.ok(text.includes(part), `${part} in ${text}`);
});
