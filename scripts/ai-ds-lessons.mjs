// Writes, checks and reviews the AI and data science lessons (src/tools/ai-ds/lessons.json, the textbook text of an item page;
// the same way as math's lessons, scripts/math-lessons.mjs). Claude writes one in Japanese; scripts/verify_ds.py checks its
// shape and recomputes every worked example that has a check (what fails goes back to Claude); then Codex reviews it and
// lists what must be fixed, which goes back too, three rounds at most. Only a lesson Codex passes is saved, with reviewedAt;
// a lesson that does not pass is kept in .ai-ds-work/lesson-drafts.json with the last findings, and the page shows nothing.
//   node scripts/ai-ds-lessons.mjs <unit|unit/item> ... [--jobs N]   write the items that have no lesson (items with problems only)
//   --rewrite   write the named items again even if they have a lesson (or a draft that did not pass)
// An item with a draft that did not pass goes on from the draft and its last findings.
//   --all       also items that have no published problems yet
// The models are called through lib/ai-ds-models.mjs.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AI_DS_CATALOG } from '../src/tools/ai-ds/catalog.ts';
import { claude, codex, exec, log, prompt, root, runQueue, today, wantedArgs } from './lib/ai-ds-models.mjs';

const ROUNDS = 3;
const messages = JSON.parse(readFileSync(new URL('messages/ja.json', root), 'utf8')).App.aiDs;
const lessonsFile = new URL('src/tools/ai-ds/lessons.json', root);
const draftsFile = new URL('.ai-ds-work/lesson-drafts.json', root);
const readJSON = (file, fallback) => existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback;
const bank = unit => readJSON(new URL(`src/tools/ai-ds/data/${unit}.json`, root), { problems: [] }).problems;
const order = AI_DS_CATALOG.flatMap(unit => unit.items.map(item => `${unit.id}/${item.id}`));

// Lessons and drafts are written one at a time, in catalog order.
let saving = Promise.resolve();
function update(file, change) {
  saving = saving.then(() => {
    const data = change(readJSON(file, {}));
    const sorted = Object.fromEntries(Object.entries(data).sort(([a], [b]) => order.indexOf(a) - order.indexOf(b)));
    mkdirSync(new URL('.', file), { recursive: true });
    writeFileSync(file, `${JSON.stringify(sorted, null, 2)}\n`);
  });
  return saving;
}

// A lesson's own parts, in a fixed order, without what the model may add.
const body = lesson => ({
  sections: (lesson.sections ?? []).map(s => ({
    heading: s.heading, paragraphs: s.paragraphs,
    ...(s.formulas?.length ? { formulas: s.formulas } : {}), ...(s.after?.length ? { after: s.after } : {}),
  })),
  examples: (lesson.examples ?? []).map(e => ({
    prompt: e.prompt, steps: e.steps, answer: e.answer,
    ...(e.check?.expr ? { check: { expr: e.check.expr, value: e.check.value, ...(e.check.tol ? { tol: e.check.tol } : {}) } } : {}),
  })),
});

function parse(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('no JSON in the answer');
  return JSON.parse(text.slice(start, end + 1));
}

function rules(unit, item) {
  const names = messages.units[unit.id].items[item.id];
  const problems = bank(unit.id).filter(p => p.item === item.id && p.published).slice(0, 4);
  return prompt('_lesson')
    .replaceAll('{{title}}', names.title).replaceAll('{{unit}}', messages.units[unit.id].title).replaceAll('{{topics}}', names.topics)
    .replaceAll('{{exams}}', item.exams.map(exam => messages.exams[exam]).join('・'))
    .replaceAll('{{siblings}}', unit.items.filter(other => other.id !== item.id).map(other => messages.units[unit.id].items[other.id].title).join('、'))
    .replaceAll('{{problems}}', problems.length ? problems.map(p => `- ${p.question}（答え: ${p.choices[p.answerIndex]}）`).join('\n') : '（まだない）')
    .replaceAll('{{calc}}', item.check === 'calc' ? prompt('_lesson-calc') : '例題は知識・判断を問う形にし、答えが数になる例題を入れる場合だけ check を付ける（使える関数は問題と同じ: mean, var, entropy, softmax, f1 など）。');
}

// verify_ds.py on one candidate lesson: what it found, as a list of text.
async function verify(key, lesson) {
  const temp = mkdtempSync(join(tmpdir(), 'ai-ds-lesson-'));
  const file = join(temp, 'candidate.json');
  writeFileSync(file, JSON.stringify({ [key]: lesson }));
  try {
    const out = await exec('python3', [new URL('scripts/verify_ds.py', root).pathname, '--lessons', file], { anyCode: true });
    return JSON.parse(out.trim().split('\n').pop());
  } finally { rmSync(temp, { recursive: true, force: true }); }
}

async function review(unit, item, lesson) {
  const names = messages.units[unit.id].items[item.id];
  const text = prompt('_lesson-review').replaceAll('{{title}}', names.title).replaceAll('{{unit}}', messages.units[unit.id].title)
    .replaceAll('{{topics}}', names.topics).replaceAll('{{lesson}}', JSON.stringify(lesson, null, 2));
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const issues = parse(await codex(text)).issues;
      if (Array.isArray(issues)) return issues.map(i => `[${i.where}] ${i.problem}${i.fix ? `（直し方: ${i.fix}）` : ''}`);
    } catch { /* ask again */ }
  }
  throw new Error('no usable review');
}

async function ask(text) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try { return body(parse(await claude(text))); } catch { /* ask again */ }
  }
  throw new Error('no usable lesson from Claude');
}

async function work({ unit, item }) {
  const key = `${unit.id}/${item.id}`;
  if (readJSON(lessonsFile, {})[key] && !flags.has('--rewrite')) { log(key, 'already has a lesson, skipped'); return; }
  const first = rules(unit, item);
  // A lesson that did not pass goes on from its draft and the last findings, unless --rewrite.
  const draft = flags.has('--rewrite') ? null : readJSON(draftsFile, {})[key];
  let lesson, findings;
  if (draft) { ({ lesson, findings } = draft); log(key, `going on from the draft (${findings.length} findings)`); }
  else { log(key, 'writing'); lesson = await ask(first); findings = []; }
  for (let round = 1; round <= ROUNDS; round++) {
    if (findings.length) {
      lesson = await ask(prompt('_lesson-fix').replaceAll('{{issues}}', findings.map(f => `- ${f}`).join('\n'))
        .replaceAll('{{lesson}}', JSON.stringify(lesson, null, 2)).replaceAll('{{rules}}', first));
      log(key, `rewritten (round ${round})`);
    }
    findings = (await verify(key, lesson)).map(e => e.replace(`${key}: `, ''));
    if (findings.length) { log(key, `check failed: ${findings.join(' / ')}`); continue; }
    findings = await review(unit, item, lesson);
    if (!findings.length) {
      await update(lessonsFile, data => ({ ...data, [key]: { ...lesson, reviewedAt: today } }));
      await update(draftsFile, data => { delete data[key]; return data; });
      log(key, `passed review (round ${round}); saved`);
      return;
    }
    log(key, `review found ${findings.length}: ${findings.join(' / ').slice(0, 400)}`);
  }
  await update(draftsFile, data => ({ ...data, [key]: { lesson, findings } }));
  throw new Error(`not passed after ${ROUNDS} rounds; kept in .ai-ds-work/lesson-drafts.json`);
}

const { jobs, flags, wanted } = wantedArgs(process.argv.slice(2));
if (!wanted.length) { console.error('Usage: node scripts/ai-ds-lessons.mjs <unit|unit/item> ... [--rewrite] [--all] [--jobs N]'); process.exit(1); }
const todo = AI_DS_CATALOG.flatMap(unit => unit.items.map(item => ({ unit, item })))
  .filter(({ unit, item }) => wanted.includes(unit.id) || wanted.includes(`${unit.id}/${item.id}`))
  .filter(({ unit, item }) => flags.has('--all') || bank(unit.id).some(p => p.item === item.id && p.published));
if (!todo.length) { console.error(`Nothing matches ${wanted.join(' ')} (items with published problems only, unless --all)`); process.exit(1); }
const failures = await runQueue(todo, jobs, work, ({ unit, item }) => `${unit.id}/${item.id}`);
if (failures) { console.error(`${failures} lesson(s) not passed`); process.exit(1); }
