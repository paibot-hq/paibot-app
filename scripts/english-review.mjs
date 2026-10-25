import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { extractJSON, run, saveWork } from './math-pipeline.mjs';
import { ENGLISH_UNITS, gradeOfLevel, levelLabel, findEnglishItem } from '../src/tools/english/catalog.ts';
import { REVIEWERS, bankPath, banks, reviewPassed, validateBank } from './validate-english.mjs';

// The blind review of English problems (docs/plans/english-practice.md): two models other than the one that wrote them,
// Codex and Antigravity, each on its own. A problem passes a reviewer when, in two steps,
//   1. shown only the sentence and the four choices, it picks the key, finds no other choice that also makes a correct,
//      natural sentence, and finds the vocabulary and grammar right for the level; then
//   2. shown the key, the explanation and the translation, it finds them correct.
// The results are written into the bank (problem.review.<reviewer>); with --publish, problems both reviewers passed are
// published. Usage: node scripts/english-review.mjs <unit> [<item> <set>] [--only codex|agy] [--publish]
const GRADES = JSON.parse(readFileSync(new URL('../messages/ja.json', import.meta.url), 'utf8')).App.english.grades;
const levelOf = (unit, p) => { const level = findEnglishItem(unit, p.item).level; return `英検${GRADES[gradeOfLevel(level)]}レベル(CEFR-J ${levelLabel(level)})`; };

const BLIND = `あなたは英語教材の校閲者です。中学生〜大人の日本人学習者向けの4択の英語問題を、答えを知らない状態で解いて点検します。
各問題の stem の ___ に入る語句を choices から選んでください。choices の番号は 0 から 3 です。
各問題について、次を JSON で答えてください。
- choiceIndex: 正しいと考える選択肢の番号
- alsoCorrect: choiceIndex 以外で、___ に入れても文法的に正しく自然な英文になる選択肢の番号の配列(なければ [])。文脈がある問題は文脈も考える。少しでも成り立つ余地があれば入れる
- levelOk: 問題文と選択肢の語彙・文法が、指定のレベル(level)の学習者に合っているか(true/false)
- issues: 問題文や選択肢の不自然さ、誤り、あいまいさなど、気になる点(日本語の文字列の配列。なければ [])
出力は {"reviews": [{"id": "...", "choiceIndex": 0, "alsoCorrect": [], "levelOk": true, "issues": []}, ...]} の JSON だけにしてください。`;

const EXPLAINED = `あなたは英語教材の校閲者です。中学生〜大人の日本人学習者向けの4択の英語問題について、正解(answer)と、日本語の解説(explanation)、要点(point)、正解を入れた英文の日本語訳(translation)を点検します。
解説・要点・訳に、英語の事実の誤り、正解と合わない説明、誤答の選択肢についての誤った説明、学習者に誤解を与える書き方、英文の意味と合わない訳がないかを見てください。
各問題について {"id": "...", "ok": true/false, "issues": [日本語の文字列]} を返し、全体を {"reviews": [...]} の JSON だけで出力してください。ok は問題がなければ true。`;

function ask(reviewer, prompt, temp) {
  if (reviewer === 'agy') return run('agy', ['--sandbox', '--print-timeout', '10m', '-p', prompt], temp);
  const output = join(temp, `${reviewer}-${Date.now()}.json`);
  run('codex', ['exec', '--sandbox', 'read-only', '--skip-git-repo-check', '-o', output, prompt], temp);
  return readFileSync(output, 'utf8');
}
function parse(reviewer, raw, problems) {
  let result;
  try { result = extractJSON(raw, 'reviews'); }
  catch (error) { throw new Error(`${reviewer}: ${error.message}\nRaw output: ${saveWork(`english-review-${reviewer}-raw`, raw, 'txt')}`); }
  assert.equal(result.reviews.length, problems.length, `${reviewer}: review count`);
  const byId = new Map(result.reviews.map(review => [review.id, review]));
  for (const p of problems) assert.ok(byId.has(p.id), `${reviewer}: no review of ${p.id}`);
  return byId;
}

let temp;
try {
  const args = process.argv.slice(2);
  const publish = args.includes('--publish');
  const onlyAt = args.indexOf('--only');
  const reviewers = onlyAt >= 0 ? [args[onlyAt + 1]] : REVIEWERS;
  const [unit, item, setId, ...extra] = args.filter((arg, index) => !arg.startsWith('--') && (onlyAt < 0 || index !== onlyAt + 1));
  assert.ok(ENGLISH_UNITS.includes(unit) && !extra.length && (item === undefined) === (setId === undefined), 'Usage: node scripts/english-review.mjs <unit> [<item> <set>] [--only codex|agy] [--publish]');
  assert.ok(reviewers.every(reviewer => REVIEWERS.includes(reviewer)), `--only takes ${REVIEWERS.join(' or ')}`);
  const bank = banks[unit];
  const problems = bank.problems.filter(p => item === undefined || (p.item === item && p.setId === setId));
  assert.ok(problems.length, 'No problems to review');
  temp = mkdtempSync(join(tmpdir(), 'english-review-'));
  const blind = problems.map(p => ({ id: p.id, level: levelOf(unit, p), stem: p.stem, choices: p.choices }));
  const explained = problems.map(p => ({ id: p.id, stem: p.stem, choices: p.choices, answer: p.choices[p.answerIndex], explanation: p.explanation.ja, point: p.point.ja, translation: p.translation.ja }));
  const today = new Date().toISOString().slice(0, 10);
  for (const reviewer of reviewers) {
    const solved = parse(reviewer, ask(reviewer, `${BLIND}\n問題:\n${JSON.stringify(blind, null, 2)}`, temp), problems);
    const checked = parse(reviewer, ask(reviewer, `${EXPLAINED}\n問題:\n${JSON.stringify(explained, null, 2)}`, temp), problems);
    for (const p of problems) {
      const a = solved.get(p.id), b = checked.get(p.id);
      const issues = [
        ...(a.choiceIndex !== p.answerIndex ? [`別の答えを選んだ: ${p.choices[a.choiceIndex] ?? a.choiceIndex}`] : []),
        ...((a.alsoCorrect ?? []).filter(index => index !== p.answerIndex).map(index => `他にも成り立つ: ${p.choices[index] ?? index}`)),
        ...(a.levelOk === false ? ['レベルに合わない'] : []),
        ...(Array.isArray(a.issues) ? a.issues : []),
        ...(b.ok === false ? ['解説・訳に問題がある'] : []),
        ...(Array.isArray(b.issues) ? b.issues : []),
      ];
      const ok = a.choiceIndex === p.answerIndex && !(a.alsoCorrect ?? []).some(index => index !== p.answerIndex) && a.levelOk !== false && b.ok !== false && !issues.length;
      p.review = { ...p.review, [reviewer]: { ok, issues, at: today } };
    }
  }
  for (const p of problems) {
    if (reviewPassed(p)) p.reviewedAt = today;
    if (publish && reviewPassed(p)) p.published = true;
  }
  validateBank(unit, bank);
  writeFileSync(bankPath(unit), JSON.stringify(bank, null, 2) + '\n');
  console.table(problems.map(p => ({ ID: p.id, 問題: p.stem, 正解: p.choices[p.answerIndex], ...Object.fromEntries(REVIEWERS.map(r => [r, p.review?.[r] ? (p.review[r].ok ? 'OK' : 'NG') : '-'])), 指摘: REVIEWERS.flatMap(r => p.review?.[r]?.issues ?? []).join(' / '), 公開: p.published ? '公開' : '' })));
  if (problems.some(p => !reviewPassed(p))) process.exitCode = 1;
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { if (temp) rmSync(temp, { recursive: true, force: true }); }
