import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { context, root, promptFile, extractJSON, additions, formatBank, saveWork, run, blindProblem, isFormulaUnit } from './math-pipeline.mjs';

let temp;
try {
  const [unit, item, setId, ...options] = process.argv.slice(2);
  assert.ok(unit && item && setId, 'Usage: math:generate -- <unit> <item> <set> [--tier 1|2|3] [--count N] [--dry-run]');
  let count = 5, dryRun = false, tier = 2;
  for (let i = 0; i < options.length; i++) {
    if (options[i] === '--dry-run') dryRun = true;
    else if (options[i] === '--tier') { tier = Number(options[++i]); assert.ok([1, 2, 3].includes(tier), 'Tier is 1 (basic), 2 (standard) or 3 (advanced)'); }
    else if (options[i] === '--count') { count = Number(options[++i]); assert.ok(Number.isSafeInteger(count) && count > 0, 'Invalid count'); }
    else throw new Error(`Unknown option: ${options[i]}`);
  }
  const { set, bank, path, original } = context(unit, item, setId);
  assert.ok(set.rule, `Set ${item} ${setId} is coming soon: add its rule and prompt before generating problems`);
  const existing = bank.problems.map(p => unit === 'pythagoras' ? JSON.stringify(p.figure) : unit === 'factorization' ? blindProblem(unit, p).trinomial
    : isFormulaUnit(unit) ? (p.statement ? p.statement.ja.prompt : `${p.question}${p.given ? ` | ${p.given}` : ''}`) : `${p.expression}${p.word ? ` | ${p.word.ja.prompt}` : ''}`);
  const position = Math.max(0, ...bank.problems.filter(p => p.item === item && p.setId === setId).map(p => p.position)) + 1;
  const prompt = [promptFile('_rules'), ...(isFormulaUnit(unit) ? [promptFile(set.rule.startsWith('text-') ? '_statement' : '_formula')] : []), promptFile(unit), promptFile(set.rule),
    `${promptFile('_tiers')}\nこのセットの問題はすべてティア ${tier} にすること。`,
    `このセットの既存の問題（重複を避けること）。同じ単元の全問題:\n${existing.join('\n')}`,
    `${count}問作ること。追加先の position は ${position} から。問題順の条件は追加先の position に合わせること。id・setId・position・published・reviewedAt は出力しない。`].join('\n\n');
  temp = mkdtempSync(join(tmpdir(), 'math-generate-'));
  let raw;
  try { raw = run('agy', ['--sandbox', '--print-timeout', '10m', '-p', prompt], temp); }
  catch (error) { const saved = saveWork(`generate-${unit}-error`, error.message, 'txt'); throw new Error(`${error.message}\nSaved: ${saved}`); }
  let newProblems;
  try { newProblems = additions(unit, item, setId, bank, extractJSON(raw, 'problems'), count, undefined, tier); }
  catch (error) { throw new Error(`${error.message}\nRaw output: ${saveWork(`generate-${unit}-raw`, raw, 'txt')}`); }
  const combined = formatBank({ ...bank, problems: [...bank.problems, ...newProblems] });
  const candidate = join(temp, 'bank.json');
  writeFileSync(candidate, combined);
  // Check for concurrent edits before touching the source; restore only our own write.
  assert.equal(readFileSync(path, 'utf8'), original, 'Bank changed during generation; retry');
  if (!dryRun) writeFileSync(path, combined);
  try {
    const env = { ...process.env, [`MATH_BANK_${unit.toUpperCase().replaceAll('-', '_')}`]: dryRun ? candidate : path };
    const output = run(process.execPath, [`${root}scripts/validate-math-${{ expression: 'arith', factorization: 'factorization', pythagoras: 'pythagoras', formula: 'formula' }[context(unit).kind]}.mjs`], root, env);
    console.log(output.trim());
    console.log(run('uv', ['run', '--locked', 'python', `${root}scripts/verify_math.py`, unit], root, env).trim());
  } catch (error) {
    if (!dryRun && readFileSync(path, 'utf8') === combined) writeFileSync(path, original);
    const saved = saveWork(`generate-${unit}-failed`, JSON.stringify({ raw, problems: newProblems }, null, 2));
    throw new Error(`${error.message}\nGenerated result: ${saved}`);
  }
  if (dryRun) console.log(formatBank({ problems: newProblems }));
  else console.log(`Added ${count} unpublished problems to ${path}`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { if (temp) rmSync(temp, { recursive: true, force: true }); }
