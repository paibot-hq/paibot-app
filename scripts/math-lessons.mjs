import { spawn } from 'node:child_process';
import { closeSync, existsSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { MATH_CATALOG } from '../src/lib/math-catalog.ts';
import { jpGrade } from '../src/lib/math-curriculum-jp.ts';
import { keyPoints } from '../src/lib/math-key-points.ts';
import { lessonProblems } from './lib/math-lesson-check.mjs';
import { blindProblem, context, extractJSON, promptFile, saveWork } from './math-pipeline.mjs';

// Writes the learning items' lessons (src/data/item-lessons.json, shown on the item page) and has them checked:
// Claude writes one; the format (lib/math-lesson-check.mjs) and the math (verify_lessons.py, SymPy) are checked and
// what fails goes back to Claude; then Antigravity reviews it, listing what must be fixed, and what it finds goes back
// too (MATH_LESSON_REVIEWERS=agy,codex adds Codex as a second reviewer). A lesson every reviewer passes gets reviewedAt,
// and only then does the page show it.
//   node scripts/math-lessons.mjs <unit|unit/item> ...   write the items that have no lesson, then review them
//   --review     only review the lessons not yet passed (none are written)
//   --rewrite    write the named items again even if they have a lesson
//   --jobs N     items worked on at once (default 3)
//   --drafts     take in hand-written lessons from .math-work/drafts/<unit>__<item>.json, check and review them once
//   --brief      print what the writer is told about each named item (no model is called)
const args = process.argv.slice(2);
const flag = name => args.includes(name);
const jobsAt = args.indexOf('--jobs');
const jobs = jobsAt >= 0 ? Number(args[jobsAt + 1]) : 3;
const wanted = args.filter((arg, index) => !arg.startsWith('--') && (jobsAt < 0 || index !== jobsAt + 1));
const ROUNDS = 3;
const FILE = new URL('../src/data/item-lessons.json', import.meta.url);
const messages = JSON.parse(readFileSync(new URL('../messages/ja.json', import.meta.url), 'utf8')).App.math;
const CLAUDE = process.env.CLAUDE_BIN ?? join(homedir(), '.claude/local/claude');
const today = new Date().toISOString().slice(0, 10);
const REVIEWERS = (process.env.MATH_LESSON_REVIEWERS ?? 'agy').split(',');
const draftPath = key => new URL(`../.math-work/drafts/${key.replace('/', '__')}.json`, import.meta.url).pathname;
const withoutReview = ({ reviewedAt, ...lesson }) => ({ sections: lesson.sections, examples: lesson.examples, mistakes: lesson.mistakes ?? [] });

const read = () => JSON.parse(readFileSync(FILE, 'utf8'));
// Read and write in one go, so that items finishing at once do not overwrite each other.
// A lock file keeps several runs of this script (one per writer) from overwriting each other's items.
const LOCK = `${FILE.pathname}.lock`;
const update = (key, change) => {
  const started = Date.now();
  for (;;) {
    try { closeSync(openSync(LOCK, 'wx')); break; }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (Date.now() - started > 30_000) { rmSync(LOCK, { force: true }); continue; } // left by a crashed run
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
    }
  }
  try {
    const lessons = read();
    change(lessons, key);
    writeFileSync(FILE, JSON.stringify(Object.fromEntries(Object.entries(lessons).sort(([a], [b]) => order(a) - order(b))), null, 2) + '\n');
  } finally { rmSync(LOCK, { force: true }); }
};
const allItems = MATH_CATALOG.flatMap(unit => unit.items.map(item => `${unit.id}/${item.id}`));
const order = key => allItems.indexOf(key);

function exec(command, commandArgs, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    const timer = setTimeout(() => child.kill('SIGTERM'), 15 * 60_000);
    child.stdout.on('data', chunk => { out += chunk; });
    child.stderr.on('data', chunk => { err += chunk; });
    child.on('error', reject);
    child.on('close', code => { clearTimeout(timer); code === 0 ? resolve(out) : reject(new Error(`${command} failed (${code}): ${err.slice(-2000)}\n${out.slice(-4000)}`)); });
  });
}
async function ask(model, prompt) {
  const temp = mkdtempSync(join(tmpdir(), 'math-lessons-'));
  try {
    if (model === 'claude') return await exec(CLAUDE, ['-p', prompt, '--tools', '', '--output-format', 'text'], temp);
    if (model === 'agy') return await exec('agy', ['--sandbox', '--print-timeout', '10m', '-p', prompt], temp);
    const output = join(temp, 'answer.txt');
    await exec('codex', ['exec', '--sandbox', 'read-only', '--skip-git-repo-check', '-o', output, prompt], temp);
    return readFileSync(output, 'utf8');
  } finally { rmSync(temp, { recursive: true, force: true }); }
}
async function askJSON(model, prompt, key, label) {
  let raw = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    raw = await ask(model, prompt);
    try { return extractJSON(raw, key); } catch { /* ask again */ }
  }
  throw new Error(`${label}: no JSON from ${model}. Raw: ${saveWork('lesson-raw', raw, 'txt')}`);
}

// What the writer and the reviewers are told about an item.
function describe(key) {
  const [unitId, itemId] = key.split('/');
  const unit = MATH_CATALOG.find(entry => entry.id === unitId);
  const text = messages.units[unitId];
  let problems = [];
  try { problems = context(unitId, itemId, unit.items.find(item => item.id === itemId).sets[0].id).bank.problems.filter(p => p.item === itemId).slice(0, 4).map(p => blindProblem(unitId, p)); } catch { /* no bank yet */ }
  return {
    grade: messages.grades[jpGrade(unitId, itemId)] ?? '',
    summary: {
      単元: text.title, 単元の概要: text.summary, 項目: text.items[itemId].title, 学年: messages.grades[jpGrade(unitId, itemId)] ?? '',
      項目の説明: text.items[itemId].description, 要点: keyPoints(unitId, itemId).map(point => ({ 公式: point.tex, 説明: point.ja })),
      同じ単元のほかの項目: unit.items.filter(item => item.id !== itemId).map(item => text.items[item.id].title),
      練習問題の例: problems,
    },
  };
}
// A function as the replacement, so that "$'" and "$&" in a lesson's text are kept as written.
const fill = (template, values) => template.replace(/\{\{(\w+)\}\}/g, (match, name) => values[name] ?? match);
const grammar = promptFile('_formula').split('\n問題の形式')[0];
const exampleLesson = () => { const { reviewedAt, ...lesson } = read()['factorization/trinomial']; return JSON.stringify(lesson); };
const writePrompt = (key, extra) => `${fill(promptFile('_lesson'), { grammar, example: exampleLesson() })}

学習項目:
${JSON.stringify(describe(key).summary, null, 2)}${extra}`;

async function verify(key) {
  const format = lessonProblems(key, read()[key]);
  if (format.length) return format;
  try { await exec('uv', ['run', '--locked', '-q', 'python', 'scripts/verify_lessons.py', key], new URL('../', import.meta.url).pathname); return []; }
  catch (error) { return error.message.split('\n').filter(line => line.startsWith('FAIL: ')).map(line => line.slice(6)).concat(error.message.includes('FAIL: ') ? [] : [error.message]); }
}

async function review(key) {
  const { grade, summary } = describe(key);
  const { reviewedAt, ...lesson } = read()[key];
  const prompt = fill(promptFile('_lesson-review'), { grade, item: JSON.stringify(summary), lesson: JSON.stringify(lesson, null, 2) });
  const results = await Promise.all(REVIEWERS.map(async model => {
    try { return (await askJSON(model, prompt, 'issues', key)).issues.map(issue => ({ ...issue, reviewer: model })); }
    catch (error) { return [{ reviewer: model, failed: true, problem: `${model} could not review: ${(error.message.match(/"message":"([^"]+)/)?.[1] ?? error.message).slice(0, 300)}` }]; }
  }));
  return results.flat();
}

async function work(key) {
  const log = message => console.log(`${key}: ${message}`);
  // --drafts: the lesson was written by hand (or by an agent) in .math-work/drafts/<unit>__<item>.json; it is taken
  // in as it is, checked and reviewed once, and what is found is reported instead of being sent to Claude.
  if (flag('--drafts')) {
    const path = draftPath(key);
    if (!existsSync(path)) return { key, status: 'no draft' };
    const draft = JSON.parse(readFileSync(path, 'utf8'));
    if (read()[key]?.reviewedAt && JSON.stringify(withoutReview(read()[key])) === JSON.stringify(withoutReview(draft))) return { key, status: 'already reviewed' };
    update(key, lessons => { lessons[key] = { sections: draft.sections, examples: draft.examples, mistakes: draft.mistakes ?? [] }; });
  }
  const exists = Boolean(read()[key]);
  if (flag('--drafts')) { /* taken in above */ } else if (!flag('--review') && (!exists || flag('--rewrite'))) {
    const lesson = await askJSON('claude', writePrompt(key, ''), 'sections', key);
    update(key, lessons => { lessons[key] = { sections: lesson.sections, examples: lesson.examples, mistakes: lesson.mistakes ?? [] }; });
    log('written');
  } else if (!exists || read()[key].reviewedAt) return { key, status: exists ? 'already reviewed' : 'no lesson' };
  let feedback = '';
  for (let round = 1; round <= ROUNDS; round++) {
    if (feedback && flag('--drafts')) break;
    if (feedback) {
      const current = read()[key];
      const fixed = await askJSON('claude', writePrompt(key, `\n\n次の本文には直すべき点がある。指摘をすべて直した本文全体を、同じ形式で出力する。\n指摘:\n${feedback}\n\n現在の本文:\n${JSON.stringify({ sections: current.sections, examples: current.examples, mistakes: current.mistakes })}`), 'sections', key);
      update(key, lessons => { lessons[key] = { sections: fixed.sections, examples: fixed.examples, mistakes: fixed.mistakes ?? [] }; });
      log(`rewritten (round ${round})`);
    }
    const problems = await verify(key);
    if (problems.length) { feedback = problems.map(problem => `- ${problem}`).join('\n'); log(`check failed: ${problems.length}`); continue; }
    const issues = await review(key);
    // A reviewer that could not answer is not a finding: stop rather than have the lesson rewritten for nothing.
    const failed = issues.filter(issue => issue.failed);
    if (failed.length) { log(failed.map(issue => issue.problem).join(' / ')); return { key, status: 'review failed' }; }
    if (!issues.length) {
      update(key, lessons => { lessons[key].reviewedAt = today; });
      log(`passed review (${REVIEWERS.join(', ')})`);
      return { key, status: 'passed' };
    }
    feedback = issues.map(issue => `- [${issue.where}] ${issue.problem}${issue.fix ? `（直し方: ${issue.fix}）` : ''}`).join('\n');
    log(`review found ${issues.length}: ${saveWork(`lesson-review-${key.replace('/', '-')}`, JSON.stringify(issues, null, 2))}`);
  }
  return { key, status: 'not passed', feedback };
}

const keys = wanted.flatMap(name => name.includes('/') ? [name] : allItems.filter(key => key.startsWith(`${name}/`)));
for (const key of keys) if (!allItems.includes(key)) { console.error(`Unknown item: ${key}`); process.exit(1); }
if (!keys.length) { console.error('Usage: npm run math:lessons -- <unit|unit/item> ... [--review] [--rewrite] [--drafts] [--brief] [--jobs N]'); process.exit(1); }
if (flag('--brief')) { for (const key of keys) console.log(`=== ${key}\n${writePrompt(key, '')}\n`); process.exit(0); }
const results = [];
const queue = [...keys];
await Promise.all(Array.from({ length: Math.max(1, jobs) }, async () => {
  for (let key = queue.shift(); key; key = queue.shift()) {
    try { results.push(await work(key)); }
    catch (error) { console.error(`${key}: ${error.message}`); results.push({ key, status: 'error' }); }
  }
}));
console.table(results.map(({ key, status }) => ({ key, status })));
for (const result of results.filter(result => result.feedback)) console.log(`\n${result.key} (last findings):\n${result.feedback}`);
process.exitCode = results.every(result => ['passed', 'already reviewed'].includes(result.status)) ? 0 : 1;
