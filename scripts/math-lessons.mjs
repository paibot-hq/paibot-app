import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MATH_CATALOG } from '../src/lib/math-catalog.ts';
import { jpGrade } from '../src/lib/math-curriculum-jp.ts';
import { keyPoints } from '../src/lib/math-key-points.ts';
import { lessonProblems, withReadings } from './lib/math-lesson-check.mjs';
import { lessonStore } from './lib/math-lesson-store.mjs';
import { applyLessonEdits } from './lib/math-lesson-edits.mjs';
import { blindProblem, context, extractJSON, promptFile, saveWork } from './math-pipeline.mjs';

// Writes the learning items' lessons (src/data/item-lessons.json, shown on the item page) and has them checked:
// the writer (Claude by default; MATH_LESSON_WRITER=deepseek uses the DeepSeek API) writes one; the format
// (lib/math-lesson-check.mjs) and the math (verify_lessons.py, SymPy) are checked and what fails goes back to it; then
// Antigravity reviews it, listing what must be fixed, and what it finds goes back too (MATH_LESSON_REVIEWERS=agy,codex
// adds Codex as a second reviewer). A lesson every reviewer passes gets reviewedAt, and only then does the page show it.
//   node scripts/math-lessons.mjs <unit|unit/item> ...   write the items that have no lesson, then review them
//   --review     only review the lessons not yet passed (none are written)
//   --rewrite    write the named items again even if they have a lesson
//   --figures    add figures (shapes, graphs) to the lessons the named items already have: Claude adds them where they
//                help, and the lesson is checked and reviewed again; if it does not pass, the lesson as it was is kept
//   --jobs N     items worked on at once (default 3)
// Drafts and feedback persist in .math-work/lesson-drafts.json. --review resumes them;
// displayed lessons change only after all checks and reviewers pass.
const args = process.argv.slice(2);
const flag = name => args.includes(name);
const jobsAt = args.indexOf('--jobs');
const jobs = jobsAt >= 0 ? Number(args[jobsAt + 1]) : 3;
const wanted = args.filter((arg, index) => !arg.startsWith('--') && (jobsAt < 0 || index !== jobsAt + 1));
const ROUNDS = Number(process.env.MATH_LESSON_ROUNDS ?? 3);
const FILE = process.env.MATH_LESSON_DATA_FILE ? pathToFileURL(resolve(process.env.MATH_LESSON_DATA_FILE)) : new URL('../src/data/item-lessons.json', import.meta.url);
const messages = JSON.parse(readFileSync(new URL('../messages/ja.json', import.meta.url), 'utf8')).App.math;
const CLAUDE = process.env.CLAUDE_BIN ?? join(homedir(), '.claude/local/claude');
const OPENCODE = process.env.OPENCODE_BIN ?? 'opencode';
const today = new Date().toISOString().slice(0, 10);
const WRITER = process.env.MATH_LESSON_WRITER ?? 'claude';
const REVIEWERS = (process.env.MATH_LESSON_REVIEWERS ?? 'agy').split(',');

const allItems = MATH_CATALOG.flatMap(unit => unit.items.map(item => `${unit.id}/${item.id}`));
const order = key => allItems.indexOf(key);
const draftsFile = process.env.MATH_LESSON_DRAFTS_FILE ? resolve(process.env.MATH_LESSON_DRAFTS_FILE) : fileURLToPath(new URL('../.math-work/lesson-drafts.json', import.meta.url));
const store = lessonStore(fileURLToPath(FILE), draftsFile, (a, b) => order(a) - order(b));
const read = store.published;
let quotaBlocked = false;

function exec(command, commandArgs, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '', failure = '';
    const timer = setTimeout(() => { failure = 'model call timed out after 15 minutes'; child.kill('SIGTERM'); }, 15 * 60_000);
    child.stdout.on('data', chunk => { out += chunk; });
    child.stderr.on('data', chunk => {
      err += chunk;
      const quota = err.match(/Go usage limit exceeded|weekly limit|individual quota reached/i);
      if (quota && !failure) { failure = quota[0]; child.kill('SIGTERM'); }
    });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => { clearTimeout(timer); code === 0 && !failure ? resolve(out) : reject(new Error(`${command} failed (${code}): ${failure || `${err.slice(-2000)}\n${out.slice(-4000)}`}`)); });
  });
}
// A model that fails (a usage limit, a dropped connection) is asked again after a pause: 1, 4, then 10 minutes.
async function ask(model, prompt) {
  if (quotaBlocked) throw new Error('Batch stopped because a model reached its usage quota');
  for (const minutes of [1, 4, 10]) {
    try { return await askOnce(model, prompt); }
    catch (error) {
      if (/weekly limit|individual quota reached|usage limit|quota (?:exhausted|exceeded)/i.test(error.message)) {
        quotaBlocked = true;
        throw error;
      }
      console.error(`${model} failed, again in ${minutes} min: ${error.message.slice(0, 200).replace(/\s+/g, ' ')}`);
      await new Promise(resolve => setTimeout(resolve, minutes * 60_000));
      if (quotaBlocked) throw new Error('Batch stopped because a model reached its usage quota');
    }
  }
  return askOnce(model, prompt);
}
async function askDeepSeek(prompt) {
  const auth = join(homedir(), '.local/share/opencode/auth.json');
  const key = process.env.DEEPSEEK_API_KEY ?? JSON.parse(readFileSync(auth, 'utf8')).deepseek?.key;
  if (!key) throw new Error('No DeepSeek API key: set DEEPSEEK_API_KEY or sign in to DeepSeek in OpenCode');
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.MATH_LESSON_MODEL ?? 'deepseek-flash',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 16_000,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`deepseek ${response.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return data.choices?.[0]?.message?.content ?? '';
}
async function askOnce(model, prompt) {
  const temp = mkdtempSync(join(tmpdir(), 'math-lessons-'));
  try {
    if (model === 'claude') return await exec(CLAUDE, ['-p', prompt, '--tools', '', '--output-format', 'text'], temp);
    // Claude Opus as a reviewer: a separate call with a model other than the writer's, for when Antigravity's quota is used up.
    if (model === 'opus') return await exec(CLAUDE, ['-p', prompt, '--tools', '', '--model', 'opus', '--output-format', 'text'], temp);
    if (model === 'agy') return await exec('agy', ['--sandbox', '--print-timeout', '10m', '-p', prompt], temp);
    if (model === 'deepseek') return await askDeepSeek(prompt);
    if (model === 'opencode' || model.startsWith('opencode/') || model.startsWith('opencode-go/')) {
      return await exec(OPENCODE, ['run', '--title', `Math lesson ${model}`, '--print-logs', '--log-level', 'ERROR', '-m', model === 'opencode' ? (process.env.MATH_OPENCODE_MODEL ?? 'opencode/deepseek-v4.1-flash-free') : model, prompt], temp);
    }
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
const writePrompt = (key, extra) => `${fill(promptFile('_lesson'), { grammar, figures: promptFile('_lesson-figures'), example: exampleLesson() })}

学習項目:
${JSON.stringify(describe(key).summary, null, 2)}${extra}`;

async function fixLesson(key, candidate, feedback) {
  const rules = fill(promptFile('_lesson'), { grammar, figures: promptFile('_lesson-figures'), example: '' }).split('\n出力形式（')[0];
  const prompt = fill(promptFile('_lesson-fix'), { rules, item: JSON.stringify(describe(key).summary), feedback, lesson: JSON.stringify(candidate, null, 2) });
  let invalid = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const answer = await askJSON(WRITER, `${prompt}${invalid}`, 'edits', key);
    try { return applyLessonEdits(candidate, answer.edits); }
    catch (error) { invalid = `\n前の編集操作を適用できませんでした: ${error.message}。パスと操作を直して、編集操作だけを返してください。`; }
  }
  throw new Error(`${key}: writer returned invalid lesson edits`);
}

async function verify(key, lesson) {
  const format = lessonProblems(key, lesson);
  if (format.length) return format;
  const temporary = mkdtempSync(join(tmpdir(), 'math-lesson-check-'));
  const candidate = join(temporary, 'candidate.json');
  writeFileSync(candidate, JSON.stringify({ [key]: lesson }));
  try { await exec('uv', ['run', '--locked', '-q', 'python', 'scripts/verify_lessons.py', '--file', candidate, key], new URL('../', import.meta.url).pathname); return []; }
  catch (error) { return error.message.split('\n').filter(line => line.startsWith('FAIL: ')).map(line => line.slice(6)).concat(error.message.includes('FAIL: ') ? [] : [error.message]); }
  finally { rmSync(temporary, { recursive: true, force: true }); }
}

async function review(key, candidate) {
  const { grade, summary } = describe(key);
  const { reviewedAt, ...lesson } = withReadings(candidate);
  const prompt = fill(promptFile('_lesson-review'), { grade, item: JSON.stringify(summary), lesson: JSON.stringify(lesson, null, 2) });
  const results = await Promise.all(REVIEWERS.map(async model => {
    try { return (await askJSON(model, prompt, 'issues', key)).issues.map(issue => ({ ...issue, reviewer: model })); }
    catch (error) { return [{ reviewer: model, failed: true, problem: `${model} could not review: ${(error.message.match(/"message":"([^"]+)/)?.[1] ?? error.message).slice(0, 300)}` }]; }
  }));
  return results.flat();
}

const countFigures = lesson => lesson.sections.reduce((n, section) => n + (section.figures?.length ?? 0), 0) + lesson.examples.filter(example => example.figure).length;
const body = lesson => ({ sections: lesson.sections, examples: lesson.examples, mistakes: lesson.mistakes ?? [] });

async function work(key) {
  const log = message => console.log(`${key}: ${message}`);
  const exists = Boolean(read()[key]);
  const backup = exists ? structuredClone(read()[key]) : null;
  const saved = flag('--review') ? store.draft(key) : null;
  let candidate = saved?.lesson ?? backup;
  let feedback = saved?.feedback ?? '';
  if (flag('--figures')) {
    if (!exists) return { key, status: 'no lesson' };
    const added = await askJSON(WRITER, writePrompt(key, `\n\n次の本文は完成しているが、図がない、または足りない。図があると分かりやすくなる説明に図を足した本文全体を、同じ形式で出力する。図が要らない項目は、本文をそのまま出力する。図を足すこと以外では文章や式を変えない（図の数値と本文の数値が食い違うときだけ直す）。\n\n現在の本文:\n${JSON.stringify(body(backup))}`), 'sections', key);
    if (countFigures(added) <= countFigures(backup)) return { key, status: 'no figure needed' };
    candidate = body(added);
    store.stage(key, candidate);
    log(`figures added (${countFigures(added)})`);
  } else if (!flag('--review') && (!exists || flag('--rewrite'))) {
    const lesson = await askJSON(WRITER, writePrompt(key, ''), 'sections', key);
    candidate = body(lesson);
    store.stage(key, candidate);
    log('written');
  } else if (!saved && (!exists || backup.reviewedAt)) return { key, status: exists ? 'already reviewed' : 'no lesson' };
  store.stage(key, candidate, feedback);
  for (let round = 1; round <= ROUNDS; round++) {
    if (feedback) {
      const fixed = await fixLesson(key, candidate, feedback);
      candidate = body(fixed);
      feedback = '';
      store.stage(key, candidate);
      log(`rewritten (round ${round})`);
    }
    const problems = await verify(key, candidate);
    if (problems.length) { feedback = problems.map(problem => `- ${problem}`).join('\n'); store.stage(key, candidate, feedback); log(`check failed: ${problems.length}`); continue; }
    const issues = await review(key, candidate);
    // A reviewer that could not answer is not a finding: stop rather than have the lesson rewritten for nothing.
    const failed = issues.filter(issue => issue.failed);
    if (failed.length) {
      log(failed.map(issue => issue.problem).join(' / '));
      return { key, status: 'review failed' };
    }
    if (!issues.length) {
      store.publish(key, candidate, today);
      log(`passed review (${REVIEWERS.join(', ')})`);
      return { key, status: 'passed' };
    }
    feedback = issues.map(issue => `- [${issue.where}] ${issue.problem}${issue.fix ? `（直し方: ${issue.fix}）` : ''}`).join('\n');
    store.stage(key, candidate, feedback);
    log(`review found ${issues.length}: ${saveWork(`lesson-review-${key.replace('/', '-')}`, JSON.stringify(issues, null, 2))}`);
  }
  return { key, status: 'not passed', feedback };
}

const keys = wanted.flatMap(name => name.includes('/') ? [name] : allItems.filter(key => key.startsWith(`${name}/`)));
for (const key of keys) if (!allItems.includes(key)) { console.error(`Unknown item: ${key}`); process.exit(1); }
if (!keys.length) { console.error('Usage: npm run math:lessons -- <unit|unit/item> ... [--review] [--rewrite] [--jobs N]'); process.exit(1); }
const results = [];
const queue = [...keys];
await Promise.all(Array.from({ length: Math.max(1, jobs) }, async () => {
  for (let key = queue.shift(); key; key = queue.shift()) {
    if (quotaBlocked) { queue.unshift(key); break; }
    try { results.push(await work(key)); }
    catch (error) { console.error(`${key}: ${error.message}`); results.push({ key, status: 'error' }); }
  }
}));
console.table(results.map(({ key, status }) => ({ key, status })));
if (quotaBlocked) console.error(`Usage quota reached; ${queue.length} queued items not attempted. Drafts and published lessons are preserved.`);
for (const result of results.filter(result => result.feedback)) console.log(`\n${result.key} (last findings):\n${result.feedback}`);
process.exitCode = results.every(result => ['passed', 'already reviewed', 'no figure needed'].includes(result.status)) ? 0 : 1;
