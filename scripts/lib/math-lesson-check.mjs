import katex from 'katex';
import { evalExpression, splitTop, stepRows } from '../../src/lib/math-formula.ts';
import { implicitParts, layoutGraph } from '../../src/lib/math-lesson-graph.ts';
import { figureReading } from '../math-pipeline.mjs';

// What a lesson (src/data/item-lessons.json) must look like for the page to show it: every text in ja, en and zh, the
// math in the prose inside $...$ and rendering, display formulas rendering, examples and mistakes in the formula
// grammar. Returns the problems found (empty when there are none); scripts/verify_lessons.py checks the math itself.
const LOCALES = ['ja', 'en', 'zh'];
const KINDS = ['value', 'factor', 'solve'];

// What a figure shows, in words: the blind review reads this in place of the drawing (a shape's is the one the quiz
// problems' reviewer gets), and the label of every curve and point is there to be compared with the text around it.
export function figureText(figure) {
  if ('shape' in figure) return figureReading({ which: figure.shape, question: figure.numbers });
  const { graph } = figure, view = graph.view ?? { x: [-6, 6], y: [-6, 6] };
  const lines = [`座標平面。x は ${view.x[0]} から ${view.x[1]}、y は ${view.y[0]} から ${view.y[1]} の範囲。`];
  (graph.curves ?? []).forEach((curve, index) => {
    const what = curve.y !== undefined ? `y = ${curve.y}` : curve.x !== undefined ? `x = ${curve.x}（y 軸に平行な直線）` : curve.implicit;
    lines.push(`曲線${index}: ${what}${curve.dashed ? '（破線）' : ''}${curve.label ? `、図中の名前「${curve.label}」` : ''}`);
  });
  (graph.points ?? []).forEach(point => lines.push(`点 (${point.x}, ${point.y})${point.hollow ? '（白抜き）' : ''}${point.label ? `、図中の名前「${point.label}」` : ''}${point.on?.length ? `、曲線 ${point.on.join('・')} の上` : ''}`));
  if (graph.region) lines.push(`色をぬった領域: ${graph.region.lhs} ${graph.region.op} ${graph.region.rhs}`);
  return lines.join('\n');
}

// The lesson as the reviewer reads it: every figure carries `reading`, what it shows in words.
export function withReadings(lesson) {
  const copy = structuredClone(lesson);
  for (const section of copy.sections) for (const figure of section.figures ?? []) figure.reading = figureText(figure);
  for (const example of copy.examples) if (example.figure) example.figure.reading = figureText(example.figure);
  return copy;
}

export function lessonProblems(key, lesson) {
  const problems = [];
  const check = (where, action) => { try { action(); } catch (error) { problems.push(`${key} ${where}: ${error.message}`); } };
  const render = tex => katex.renderToString(tex, { throwOnError: true });
  const prose = (where, text) => {
    for (const locale of LOCALES) check(`${where}.${locale}`, () => {
      const value = text?.[locale];
      if (typeof value !== 'string' || !value.trim()) throw new Error('missing text');
      if ((value.match(/\$/g) ?? []).length % 2) throw new Error(`unpaired $ in "${value}"`);
      for (const [, tex] of value.matchAll(/\$([^$]+)\$/g)) render(tex);
      if (/[\^_\\]/.test(value.replace(/\$[^$]+\$/g, ''))) throw new Error(`math must be inside $...$ ("${value}")`);
    });
  };
  const figure = (where, fig) => {
    prose(`${where}.caption`, fig?.caption);
    if (typeof fig?.shape === 'string') check(where, () => {
      const numbers = splitTop(fig.numbers ?? '', ',').map(part => evalExpression(part));
      if (!numbers.length || numbers.some(number => !Number.isFinite(number))) throw new Error(`numbers must be a list of numbers, "${fig.numbers}"`);
      const reading = figureReading({ which: fig.shape, question: fig.numbers });
      if (/NaN|undefined/.test(reading)) throw new Error(`${fig.shape} needs other numbers than "${fig.numbers}": ${reading}`);
    });
    else if (fig?.graph) check(where, () => {
      const { graph } = fig, [xMin, xMax] = graph.view?.x ?? [-6, 6], [yMin, yMax] = graph.view?.y ?? [-6, 6];
      if (!(xMin < xMax && yMin < yMax)) throw new Error('view needs x and y ranges, smaller first');
      const curves = graph.curves ?? [], points = graph.points ?? [];
      if (curves.length > 4 || points.length > 8) throw new Error('at most 4 curves and 8 points');
      if (!curves.length && !points.length && !graph.region) throw new Error('a graph needs a curve, a point or a region');
      curves.forEach((curve, index) => {
        if ([curve.y, curve.x, curve.implicit].filter(value => value !== undefined).length !== 1) throw new Error(`curves[${index}] is one of y, x or implicit`);
        if (curve.implicit !== undefined) implicitParts(curve.implicit);
      });
      const laid = layoutGraph(graph);
      laid.curves.forEach((curve, index) => { if (!curve.d) throw new Error(`curves[${index}] is not in the window`); });
      if (graph.region && !laid.region) throw new Error('the region is empty in the window');
      points.forEach((point, index) => {
        if (!(point.x >= xMin && point.x <= xMax && point.y >= yMin && point.y <= yMax)) throw new Error(`points[${index}] is outside the window`);
        for (const on of point.on ?? []) if (!curves[on]) throw new Error(`points[${index}].on: no curve ${on}`);
      });
    });
    else problems.push(`${key} ${where}: a figure has a shape (with numbers) or a graph`);
  };
  const line = (where, text, style) => check(where, () => { for (const row of stepRows(text, style)) for (const piece of row) render(`{}${piece}`); });
  const style = (where, value) => {
    if (value !== undefined && !['times', 'box', 'ratio', 'mixed'].includes(value)) problems.push(`${key} ${where}: unknown formula style`);
  };
  if (!Array.isArray(lesson?.sections) || !lesson.sections.length) problems.push(`${key}: needs sections`);
  if (!Array.isArray(lesson?.examples) || !lesson.examples.length) problems.push(`${key}: needs examples`);
  if (!Array.isArray(lesson?.mistakes)) problems.push(`${key}: needs mistakes (may be empty)`);
  if (problems.length) return problems;
  lesson.sections.forEach((section, index) => {
    const where = `sections[${index}]`;
    prose(`${where}.heading`, section.heading);
    if (!Array.isArray(section.paragraphs) || !section.paragraphs.length) problems.push(`${key} ${where}: needs paragraphs`);
    [...(section.paragraphs ?? []), ...(section.after ?? [])].forEach((paragraph, at) => prose(`${where}.paragraphs[${at}]`, paragraph));
    (section.formulas ?? []).forEach((formula, at) => check(`${where}.formulas[${at}]`, () => render(formula)));
    (section.figures ?? []).forEach((fig, at) => figure(`${where}.figures[${at}]`, fig));
  });
  lesson.examples.forEach((example, index) => {
    const where = `examples[${index}]`;
    if (!KINDS.includes(example.kind)) problems.push(`${key} ${where}: kind must be one of ${KINDS.join(', ')}`);
    style(`${where}.style`, example.style);
    if (example.prompt !== undefined) prose(`${where}.prompt`, example.prompt);
    line(`${where}.question`, example.question, example.style);
    (example.steps ?? []).forEach((step, at) => line(`${where}.steps[${at}]`, step, example.style));
    prose(`${where}.note`, example.note);
    if (example.figure) figure(`${where}.figure`, example.figure);
  });
  lesson.mistakes.forEach((mistake, index) => {
    const where = `mistakes[${index}]`;
    style(`${where}.style`, mistake.style);
    if (mistake.question !== undefined) line(`${where}.question`, mistake.question, mistake.style);
    line(`${where}.wrong`, mistake.wrong, mistake.style);
    line(`${where}.right`, mistake.right, mistake.style);
    prose(`${where}.note`, mistake.note);
  });
  return problems;
}
