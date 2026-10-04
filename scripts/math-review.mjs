import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { context, promptFile, blindProblem, compareReviews, extractJSON, saveWork, run } from './math-pipeline.mjs';
import { jpGrade } from '../src/lib/math-curriculum-jp.ts';

// Each problem's school year comes from its learning item (Japan's curriculum
// table), so a unit spanning years (expansion: 中3 and 数学II) is judged per item.
const GRADE_NAMES = JSON.parse(readFileSync(new URL('../messages/ja.json', import.meta.url), 'utf8')).App.math.grades;
const gradeOf = (unit, item) => GRADE_NAMES[jpGrade(unit, item)] ?? '不明';

let temp;
try {
  const [unit, item, setId, ...extra] = process.argv.slice(2);
  assert.ok(unit && !extra.length && (item === undefined) === (setId === undefined), 'Usage: math:review -- <unit> [<item> <set>]');
  const { bank, catalog } = context(unit, item, setId);
  const problems = bank.problems.filter(p => item === undefined || (p.item === item && p.setId === setId));
  assert.ok(problems.length, 'No problems to review');
  const levels = problems.map(p => ({ id: p.id, grade: gradeOf(unit, p.item) }));
  const grade = [...new Set(levels.map(level => level.grade))].join('・');
  const prompt = `${promptFile('_review').replaceAll('{{grade}}', grade)}\n${promptFile('_tiers')}\n各問題の tier は作成時に指定したティア。合っていなければ issues に「ティアが合わない（n が妥当）」と書く。\n対象学年:\n${JSON.stringify(levels)}\n問題:\n${JSON.stringify(problems.map(p => ({ ...blindProblem(unit, p), tier: p.tier })), null, 2)}`;
  temp = mkdtempSync(join(tmpdir(), 'math-review-'));
  const output = join(temp, 'review.json');
  // Codex is the independent reviewer; MATH_REVIEWER=agy uses the generator's own model instead
  // (for when Codex is unavailable), which checks the display and tier but is less independent.
  let raw;
  if (process.env.MATH_REVIEWER === 'agy') raw = run('agy', ['--sandbox', '--print-timeout', '10m', '-p', prompt], temp);
  else { run('codex', ['exec', '--sandbox', 'read-only', '--skip-git-repo-check', '-o', output, prompt], temp); raw = readFileSync(output, 'utf8'); }
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
