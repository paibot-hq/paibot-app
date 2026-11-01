import katex from 'katex';
import { stepRows } from '../../src/lib/math-formula.ts';

// What a lesson (src/data/item-lessons.json) must look like for the page to show it: every text in ja, en and zh, the
// math in the prose inside $...$ and rendering, display formulas rendering, examples and mistakes in the formula
// grammar. Returns the problems found (empty when there are none); scripts/verify_lessons.py checks the math itself.
const LOCALES = ['ja', 'en', 'zh'];
const KINDS = ['value', 'factor', 'solve'];

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
  const line = (where, text) => check(where, () => { for (const row of stepRows(text)) for (const piece of row) render(`{}${piece}`); });
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
  });
  lesson.examples.forEach((example, index) => {
    const where = `examples[${index}]`;
    if (!KINDS.includes(example.kind)) problems.push(`${key} ${where}: kind must be one of ${KINDS.join(', ')}`);
    line(`${where}.question`, example.question);
    (example.steps ?? []).forEach((step, at) => line(`${where}.steps[${at}]`, step));
    prose(`${where}.note`, example.note);
  });
  lesson.mistakes.forEach((mistake, index) => {
    const where = `mistakes[${index}]`;
    if (mistake.question !== undefined) line(`${where}.question`, mistake.question);
    line(`${where}.wrong`, mistake.wrong);
    line(`${where}.right`, mistake.right);
    prose(`${where}.note`, mistake.note);
  });
  return problems;
}
