// Writes, checks and reviews the AI and data science problems (src/tools/ai-ds/data/<unit>.json; docs/plans/ai-ds-practice.md §4).
// For each set: Claude writes five problems (tiers 1, 1, 2, 2, 3); scripts/verify_ds.py checks their shape and recomputes the
// answer of every calculation (what fails goes back to Claude); then Codex solves them without the answers and says what is
// wrong. A problem Codex answers like the key and finds nothing wrong with is published (reviewedAt); the others go back to
// Claude with what Codex found, twice at most, and stay unpublished if they still do not pass.
//   node scripts/ai-ds-generate.mjs <unit|unit/item> ... [--jobs N]   write the sets that have no problems yet
//   node scripts/ai-ds-generate.mjs --review <unit|unit/item> ...      review the unpublished problems again (none are written)
// The models are called through lib/ai-ds-models.mjs.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AI_DS_CATALOG } from '../src/tools/ai-ds/catalog.ts';
import { claude, codex, exec, extractJSON, log, prompt, root, runQueue, today, wantedArgs } from './lib/ai-ds-models.mjs';

const messages = JSON.parse(readFileSync(new URL('messages/ja.json', root), 'utf8')).App.aiDs;
const bankPath = unit => new URL(`src/tools/ai-ds/data/${unit}.json`, root);
const readBank = unit => JSON.parse(readFileSync(bankPath(unit), 'utf8'));
const writeBank = (unit, bank) => writeFileSync(bankPath(unit), `${JSON.stringify(bank, null, 2)}\n`);
const TIERS = [1, 1, 2, 2, 3];

// verify_ds.py on candidate problems: the problems found, as text (empty when there are none).
async function verify(unit, problems) {
  const temp = mkdtempSync(join(tmpdir(), 'ai-ds-verify-'));
  const file = join(temp, 'candidate.json');
  writeFileSync(file, JSON.stringify({ unit, problems }));
  try {
    // verify_ds.py exits 1 when it finds something; what it found is still on stdout.
    const out = await exec('python3', [new URL('scripts/verify_ds.py', root).pathname, '--json', file], { anyCode: true });
    return JSON.parse(out.trim().split('\n').pop());
  } finally { rmSync(temp, { recursive: true, force: true }); }
}

function rulesFor(unit, item, existing, count, tiers) {
  const names = messages.units[unit].items[item.id];
  const check = item.check === 'calc' ? '計算（答えが数になる）' : '知識';
  return prompt('_write')
    .replaceAll('{{title}}', names.title).replaceAll('{{unit}}', messages.units[unit].title).replaceAll('{{topics}}', names.topics)
    .replaceAll('{{exams}}', item.exams.map(exam => messages.exams[exam]).join('・')).replaceAll('{{check}}', check)
    .replaceAll('{{count}}', String(count)).replaceAll('{{tiers}}', tiers.join(', '))
    .replaceAll('{{checkRules}}', prompt(item.check === 'calc' ? '_calc' : '_knowledge'))
    .replaceAll('{{existing}}', existing.length ? existing.map(p => `- ${p.question}`).join('\n') : '（なし）');
}

// Only what a problem is made of, in the order the bank keeps it.
const shape = (p, tier) => ({
  tier: p.tier ?? tier, question: p.question, choices: p.choices, answerIndex: p.answerIndex, explanation: p.explanation,
  ...(p.check && p.check.expr ? { check: { expr: p.check.expr, values: p.check.values, ...(p.check.tol ? { tol: p.check.tol } : {}) } } : {}),
});

// Ask Claude, then have verify_ds.py check the result; what fails goes back to Claude, three times at most.
async function writeChecked(key, unit, ask, tiers, needsCheck) {
  let text = ask, problems = [], errors = [];
  for (let round = 0; round < 3; round++) {
    let raw;
    try { raw = extractJSON(await claude(text), 'problems').problems; } catch (error) { errors = [String(error.message)]; log(key, `no usable answer (${error.message})`); continue; }
    problems = raw.slice(0, tiers.length).map((p, at) => shape(p, tiers[at]));
    const numbered = problems.map((p, at) => ({ id: `${unit}-${String(at + 1).padStart(3, '0')}`, item: 'x', setId: '1', position: at + 1, published: false, ...p }));
    errors = problems.length === tiers.length ? (await verify(unit, numbered)).filter(e => !e.includes('unknown item')) : [`${tiers.length} problems were asked for, ${problems.length} came`];
    if (needsCheck) problems.forEach((p, at) => { if (!p.check) errors.push(`${unit}-${String(at + 1).padStart(3, '0')}: a calculation problem needs a check`); });
    if (!errors.length) return problems;
    log(key, `check failed: ${errors.join(' / ')}`);
    text = `${ask}\n\n前の答えは次の点で検査に通らなかった。直して、同じ形の JSON を全部出し直す:\n${errors.map(e => `- ${e.replace(/^\S+-\d{3}: /, (m) => `${Number(m.match(/\d{3}/)[0])}問目: `)}`).join('\n')}\n\n前の答え:\n${JSON.stringify({ problems })}`;
  }
  throw new Error(`still failing the check: ${errors.join(' / ')}`);
}

// Codex solves the problems without their answers. Returns, per problem, null if it passed or what was wrong.
async function review(problems) {
  const listed = problems.map((p, at) => `${at + 1}. ${p.question}\n${p.choices.map((c, i) => `   ${i + 1}) ${c}`).join('\n')}`).join('\n\n');
  let reviews;
  for (let attempt = 0; attempt < 2 && !reviews; attempt++) {
    try { reviews = extractJSON(await codex(prompt('_review').replaceAll('{{problems}}', listed)), 'reviews').reviews; } catch { /* ask again */ }
  }
  if (!reviews) throw new Error('no usable review');
  return problems.map((p, at) => {
    const r = reviews.find(entry => Number(entry.n) === at + 1);
    if (!r) return 'レビューの答えがない';
    const problemsFound = [];
    if (Number(r.answer) !== p.answerIndex + 1) problemsFound.push(`レビュー役は ${r.answer} 番を正解とした（作者の正解は ${p.answerIndex + 1} 番）`);
    if (r.ok === false || (r.issues && String(r.issues).trim())) problemsFound.push(String(r.issues || '問題あり'));
    return problemsFound.length ? problemsFound.join('。') : null;
  });
}

// Review, send what failed back to Claude, review again: twice at most. Returns the problems with `published` set.
async function reviewAndFix(key, unit, rules, problems, needsCheck) {
  let current = problems.map(p => ({ ...p }));
  let verdicts = await review(current);
  for (let round = 0; round < 2 && verdicts.some(Boolean); round++) {
    const failed = verdicts.map((v, at) => v ? at : -1).filter(at => at >= 0);
    log(key, `review: ${failed.length} to fix (${failed.map(at => `${at + 1}: ${verdicts[at]}`).join(' / ')})`);
    const ask = prompt('_fix').replaceAll('{{issues}}', failed.map((at, n) => `${n + 1}. ${verdicts[at]}`).join('\n'))
      .replaceAll('{{problems}}', JSON.stringify({ problems: failed.map(at => current[at]) })).replaceAll('{{rules}}', rules);
    let fixed;
    try { fixed = await writeChecked(key, unit, ask, failed.map(at => current[at].tier), needsCheck); } catch (error) { log(key, `fix failed: ${error.message}`); break; }
    failed.forEach((at, n) => { current[at] = fixed[n]; });
    const again = await review(failed.map(at => current[at]));
    failed.forEach((at, n) => { verdicts[at] = again[n]; });
  }
  verdicts.forEach((v, at) => { if (v) log(key, `left unpublished: ${at + 1}: ${v}`); });
  return current.map((p, at) => ({ ...p, published: !verdicts[at] }));
}

// One write lock per unit: sets of the same unit are saved one at a time.
const locks = new Map();
async function save(unit, item, setId, problems) {
  const previous = locks.get(unit) ?? Promise.resolve();
  let release;
  locks.set(unit, new Promise(resolve => { release = resolve; }));
  await previous;
  try {
    const bank = readBank(unit);
    let next = Math.max(0, ...bank.problems.map(p => Number(p.id.slice(-3)))) + 1;
    const kept = bank.problems.filter(p => !(p.item === item && p.setId === setId && !p.published));
    const position = Math.max(0, ...kept.filter(p => p.item === item && p.setId === setId).map(p => p.position));
    const added = problems.map((p, at) => ({
      id: p.id ?? `${unit}-${String(next++).padStart(3, '0')}`, item, setId, position: p.position ?? position + at + 1,
      tier: p.tier, published: p.published, ...(p.published ? { reviewedAt: today } : {}),
      question: p.question, choices: p.choices, answerIndex: p.answerIndex, explanation: p.explanation, ...(p.check ? { check: p.check } : {}),
    }));
    bank.problems = [...kept, ...added].sort((a, b) => a.id.localeCompare(b.id));
    writeBank(unit, bank);
    return added;
  } finally { release(); }
}

async function writeSet(unit, item, setId) {
  const key = `${unit}/${item.id}/${setId}`;
  const existing = readBank(unit).problems;
  if (existing.some(p => p.item === item.id && p.setId === setId)) { log(key, 'already has problems, skipped'); return; }
  log(key, 'writing');
  const rules = rulesFor(unit, item, existing, TIERS.length, TIERS);
  const written = await writeChecked(key, unit, rules, TIERS, item.check === 'calc');
  log(key, 'checked; reviewing');
  const reviewed = await reviewAndFix(key, unit, rules, written, item.check === 'calc');
  const saved = await save(unit, item.id, setId, reviewed);
  log(key, `saved ${saved.filter(p => p.published).length}/${saved.length} published`);
}

async function reviewSet(unit, item, setId) {
  const key = `${unit}/${item.id}/${setId}`;
  const pending = readBank(unit).problems.filter(p => p.item === item.id && p.setId === setId && !p.published);
  if (!pending.length) return;
  log(key, `reviewing ${pending.length} unpublished`);
  const rules = rulesFor(unit, item, readBank(unit).problems.filter(p => p.published), pending.length, pending.map(p => p.tier));
  const reviewed = await reviewAndFix(key, unit, rules, pending.map(p => shape(p, p.tier)), item.check === 'calc');
  const saved = await save(unit, item.id, setId, reviewed.map((p, at) => ({ ...p, id: pending[at].id, position: pending[at].position })));
  log(key, `saved ${saved.filter(p => p.published).length}/${saved.length} published`);
}

const { jobs, flags, wanted } = wantedArgs(process.argv.slice(2));
const reviewOnly = flags.has('--review');
if (!wanted.length) { console.error('Usage: node scripts/ai-ds-generate.mjs [--review] <unit|unit/item> ... [--jobs N]'); process.exit(1); }
const todo = AI_DS_CATALOG.flatMap(unit => unit.items.flatMap(item => item.sets.map(set => ({ unit: unit.id, item, setId: set.id }))))
  .filter(({ unit, item }) => wanted.includes(unit) || wanted.includes(`${unit}/${item.id}`));
if (!todo.length) { console.error(`Nothing matches ${wanted.join(' ')}`); process.exit(1); }

const failures = await runQueue(todo, jobs, next => (reviewOnly ? reviewSet : writeSet)(next.unit, next.item, next.setId), next => `${next.unit}/${next.item.id}/${next.setId}`);
if (failures) { console.error(`${failures} set(s) failed`); process.exit(1); }
