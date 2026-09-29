import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { expressionBanks } from './validate-math-arith.mjs';
import { bank as factorizationBank } from './validate-math-factorization.mjs';
import { formulaBanks } from './validate-math-formula.mjs';
import { bank as pythagorasBank } from './validate-math-pythagoras.mjs';
import { estimateDifficulty } from './lib/math-difficulty.mjs';
import { findUnit } from '../src/lib/math-catalog.ts';

// Explicit target only; importing never creates or resets any tables.
const targets = { local: ['--local'], dev: ['--remote'], prod: ['--remote', '--env', 'production'] };
const target = process.argv[2];
if (!Object.hasOwn(targets, target) || process.argv.length !== 3) throw new Error('Usage: node scripts/import-math.mjs local|dev|prod');
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
const expression = ({ expression, word, choices }) => ({ expression, word, choices });
const units = [
  ...Object.entries(expressionBanks).map(([unit, bank]) => ({ unit, bank, payload: expression })),
  ...Object.entries(formulaBanks).map(([unit, bank]) => ({ unit, bank, payload: ({ kind, question, given, choices }) => ({ kind, question, given, choices }) })),
  { unit: 'factorization', bank: factorizationBank, payload: ({ p, q, choices }) => ({ p, q, choices }) },
  { unit: 'pythagoras', bank: pythagorasBank, payload: ({ figure, choices }) => ({ figure, choices }) },
];
const statements = units.flatMap(({ unit, bank, payload }) => bank.problems.map(problem => {
  const difficulty = estimateDifficulty(findUnit(unit), problem);
  const values = [problem.id, unit, problem.item, problem.setId, problem.position, Number(problem.published), problem.answerIndex, JSON.stringify(payload(problem)), difficulty, problem.reviewedAt].map(quote).join(',');
  return `INSERT INTO math_problems (id, unit, item, set_id, position, published, answer_index, payload, difficulty, reviewed_at) VALUES (${values}) ON CONFLICT(id) DO UPDATE SET unit=excluded.unit, item=excluded.item, set_id=excluded.set_id, position=excluded.position, published=excluded.published, answer_index=excluded.answer_index, payload=excluded.payload, difficulty=excluded.difficulty, reviewed_at=excluded.reviewed_at;`;
}));
mkdirSync('.wrangler', { recursive: true });
const file = '.wrangler/math-import.sql';
writeFileSync(file, statements.join('\n') + '\n');
const result = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB', ...targets[target], '--file', file, '--yes'], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
