import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { context, promptFile, blindProblem, compareReviews, extractJSON, saveWork, run } from './math-pipeline.mjs';

// School years the formula units are written for (the review checks each problem suits them).
const FORMULA_GRADES = {
  decimal: '小学4〜5年生', fraction: '小学5〜6年生', exponents: '中学1年生', expression: '中学1〜2年生',
  'linear-equation': '中学1年生', simultaneous: '中学2年生', expansion: '中学3年生', sqrt: '中学3年生', quadratic: '中学3年生',
};

let temp;
try {
  const [unit, item, setId, ...extra] = process.argv.slice(2);
  assert.ok(unit && !extra.length && (item === undefined) === (setId === undefined), 'Usage: math:review -- <unit> [<item> <set>]');
  const { bank, catalog } = context(unit, item, setId);
  const problems = bank.problems.filter(p => item === undefined || (p.item === item && p.setId === setId));
  assert.ok(problems.length, 'No problems to review');
  const grade = ['factorization', 'pythagoras'].includes(unit) ? '中学3年生' : unit === 'signed' ? '中学1年生' : ['addition', 'multiplication', 'division'].includes(unit) ? '小学1〜4年生' : FORMULA_GRADES[unit] ?? '小学2〜4年生（基礎）、小学校高学年〜中学1年生（計算の順序・文章題ミックス）';
  const levels = problems.map(p => ({ id: p.id, grade: unit === 'arith' ? (['word-a'].includes(catalog.find(s => s.item === p.item && s.id === p.setId).rule) ? '小学2〜4年生' : '小学校高学年〜中学1年生') : grade }));
  const prompt = `${promptFile('_review').replaceAll('{{grade}}', grade)}\n${promptFile('_tiers')}\n各問題の tier は作成時に指定したティア。合っていなければ issues に「ティアが合わない（n が妥当）」と書く。\n対象学年:\n${JSON.stringify(levels)}\n問題:\n${JSON.stringify(problems.map(p => ({ ...blindProblem(unit, p), tier: p.tier })), null, 2)}`;
  temp = mkdtempSync(join(tmpdir(), 'math-review-'));
  const output = join(temp, 'review.json');
  run('codex', ['exec', '--sandbox', 'read-only', '--skip-git-repo-check', '-o', output, prompt], temp);
  const raw = readFileSync(output, 'utf8');
  let result;
  try { result = extractJSON(raw, 'reviews'); }
  catch (error) { throw new Error(`${error.message}\nRaw output: ${saveWork(`review-${unit}-raw`, raw, 'txt')}`); }
  const saved = saveWork(`review-${unit}`, JSON.stringify(result, null, 2) + '\n');
  console.log(`Review JSON: ${saved}`);
  const rows = compareReviews(unit, problems, result);
  console.table(rows.map(r => ({ ID: r.id, 照合: r.matches ? '一致' : '不一致', 'Codex の答え': r.answer, 'Codex の式（文章題）': r.wordExpression ?? '', 指摘事項: r.issues.join(' / ') })));
  if (rows.some(r => !r.matches || r.issues.length)) process.exitCode = 1;
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { if (temp) rmSync(temp, { recursive: true, force: true }); }
