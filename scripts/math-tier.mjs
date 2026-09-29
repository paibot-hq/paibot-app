import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { context, promptFile, blindProblem, extractJSON, formatBank, run, saveWork } from './math-pipeline.mjs';
import { jpGrade } from '../src/lib/math-curriculum-jp.ts';

// Asks Codex which tier (1 basic, 2 standard, 3 advanced; see
// math-prompts/_tiers.md) each problem of a unit is, within its learning item
// and grade, and writes the answers into the bank's `tier` fields. For problems
// made before tiers existed; new ones get their tier when generated. Review the
// diff before committing.
//   node scripts/math-tier.mjs <unit> [--only-missing]
let temp;
try {
  const [unit, ...options] = process.argv.slice(2);
  assert.ok(unit && options.every(option => option === '--only-missing'), 'Usage: node scripts/math-tier.mjs <unit> [--only-missing]');
  const { bank, path, original } = context(unit);
  const ja = JSON.parse(readFileSync(new URL('../messages/ja.json', import.meta.url), 'utf8')).App.math.units[unit];
  const problems = bank.problems.filter(p => !options.includes('--only-missing') || p.tier === undefined);
  assert.ok(problems.length, 'No problems to judge');
  const listed = problems.map(p => ({ ...blindProblem(unit, p), item: ja.items[p.item].title, grade: jpGrade(unit, p.item) }));
  const prompt = [promptFile('_rules').split('\n')[0], promptFile('_tiers'),
    '各問題の tier（1〜3）を判定してください。同じ学習項目の問題どうしで比べてよい。grade は日本の学年（e=小学、m=中学、h=高校の科目、u=大学）。',
    '出力は JSON のみ: {"tiers":[{"id":"...","tier":2,"reason":"短い理由"}]}',
    JSON.stringify(listed, null, 2)].join('\n\n');
  temp = mkdtempSync(join(tmpdir(), 'math-tier-'));
  const output = join(temp, 'tiers.json');
  run('codex', ['exec', '--sandbox', 'read-only', '--skip-git-repo-check', '-o', output, prompt], temp);
  const raw = readFileSync(output, 'utf8');
  const { tiers } = extractJSON(raw, 'tiers');
  saveWork(`tier-${unit}`, raw);
  const byId = new Map(tiers.map(t => [t.id, t]));
  for (const p of problems) {
    const judged = byId.get(p.id);
    assert.ok(judged && [1, 2, 3].includes(judged.tier), `No tier for ${p.id}`);
    p.tier = judged.tier;
    console.log(`${p.id}\t${p.item}/${p.setId}\t${judged.tier}\t${judged.reason ?? ''}`);
  }
  assert.equal(readFileSync(path, 'utf8'), original, 'Bank changed while judging; retry');
  // tier right after position, as math:generate writes it.
  bank.problems = bank.problems.map(({ id, item, setId, position, tier, ...rest }) => ({ id, item, setId, position, tier, ...rest }));
  writeFileSync(path, formatBank(bank));
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { if (temp) rmSync(temp, { recursive: true, force: true }); }
