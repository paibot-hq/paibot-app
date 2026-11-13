import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { context, root, promptFile, extractJSON, formatBank, saveWork, run, write, isFormulaUnit } from './math-pipeline.mjs';

// Writes the worked solution (`steps`) of formula problems that have none: an
// LLM proposes the lines, verify_math.py checks each one with SymPy, and lines
// that fail are dropped and retried (up to 3 rounds). Only verified steps are saved.
//   node scripts/math-steps.mjs <unit> [--redo]      (--redo also rewrites existing steps)
let temp;
try {
  const [unit, ...options] = process.argv.slice(2);
  assert.ok(unit && options.every(option => option === '--redo'), 'Usage: math:steps -- <unit> [--redo]');
  assert.ok(isFormulaUnit(unit), `${unit} is not a formula unit`);
  const redo = options.includes('--redo');
  const { path, bank } = context(unit);
  temp = mkdtempSync(join(tmpdir(), 'math-steps-'));
  let todo = bank.problems.filter(problem => redo || !problem.steps);
  const shown = problem => ({ id: problem.id, kind: problem.kind, question: problem.question, given: problem.given,
    ...Object.fromEntries(['divisor', 'bounds', 'which', 'progression'].filter(key => problem[key]).map(key => [key, problem[key]])),
    answer: problem.choices[problem.answerIndex] });
  for (let round = 1; round <= 3 && todo.length; round++) {
    const found = new Map();
    for (let start = 0; start < todo.length; start += 12) {
      const batch = todo.slice(start, start + 12);
      const prompt = [promptFile('_formula'), promptFile('_steps'), `次の問題それぞれに steps を付ける。\n${JSON.stringify(batch.map(shown), null, 2)}`].join('\n\n');
      // The model sometimes returns nothing; ask again before giving up.
      let raw = '';
      for (let attempt = 0; attempt < 3 && !raw.trim(); attempt++) raw = write(prompt, temp);
      let parsed;
      try { parsed = extractJSON(raw, 'steps'); } catch (error) { throw new Error(`${error.message}\nRaw output: ${saveWork(`steps-${unit}-raw`, raw, 'txt')}`); }
      for (const entry of parsed.steps) if (typeof entry.id === 'string' && Array.isArray(entry.steps)) found.set(entry.id, entry.steps);
    }
    const candidate = { ...bank, problems: bank.problems.map(problem => found.has(problem.id) ? { ...problem, steps: found.get(problem.id) } : problem) };
    const file = join(temp, `bank-${round}.json`);
    writeFileSync(file, formatBank(candidate));
    const env = { ...process.env, [`MATH_BANK_${unit.toUpperCase().replaceAll('-', '_')}`]: file };
    const result = run('uv', ['run', '--locked', 'python', '-c', `
import json, sys
sys.path.insert(0, 'scripts')
from verify_math import UNITS, verify_bank
bank = json.load(open(${JSON.stringify(file)}, encoding='utf-8'))
print(json.dumps(verify_bank(bank, UNITS[${JSON.stringify(unit)}][1])))`], root, env);
    const failed = new Set(JSON.parse(result.trim().split('\n').pop()).map(message => message.split(':')[0]));
    for (const problem of candidate.problems) if (failed.has(problem.id) || (found.has(problem.id) && !problem.steps?.length)) delete problem.steps;
    for (const problem of bank.problems) { const done = candidate.problems.find(other => other.id === problem.id); if (found.has(problem.id) && done.steps) problem.steps = done.steps; }
    todo = todo.filter(problem => !bank.problems.find(other => other.id === problem.id).steps || (redo && failed.has(problem.id)));
    console.log(`round ${round}: ${found.size} proposed, ${failed.size} failed, ${todo.length} left`);
    if (failed.size) console.log(`failed: ${[...failed].join(', ')}`);
  }
  writeFileSync(path, formatBank(bank));
  if (todo.length) { console.log(`Without steps: ${todo.map(problem => problem.id).join(', ')}`); process.exitCode = 1; }
  else console.log(`Steps added to every ${unit} problem`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { if (temp) rmSync(temp, { recursive: true, force: true }); }
