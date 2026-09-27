import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { bank as arithBank, signedBank } from './check-math-arith.mjs';
import { bank as factorizationBank } from './check-math-factorization.mjs';

// Explicit target only; importing never creates or resets any tables.
const targets = { local: ['--local'], dev: ['--remote'], prod: ['--remote', '--env', 'production'] };
const target = process.argv[2];
if (!Object.hasOwn(targets, target) || process.argv.length !== 3) throw new Error('Usage: node scripts/import-math.mjs local|dev|prod');
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
const units = [
  { unit: 'arith', bank: arithBank, payload: ({ expression, word, choices }) => ({ expression, word, choices }) },
  { unit: 'signed', bank: signedBank, payload: ({ expression, word, choices }) => ({ expression, word, choices }) },
  { unit: 'factorization', bank: factorizationBank, payload: ({ p, q, choices }) => ({ p, q, choices }) },
];
const statements = units.flatMap(({ unit, bank, payload }) => bank.problems.map(problem => {
  const values = [problem.id, unit, problem.setId, problem.position, Number(problem.published), problem.answerIndex, JSON.stringify(payload(problem)), problem.reviewedAt].map(quote).join(',');
  return `INSERT INTO math_problems (id, unit, set_id, position, published, answer_index, payload, reviewed_at) VALUES (${values}) ON CONFLICT(id) DO UPDATE SET unit=excluded.unit, set_id=excluded.set_id, position=excluded.position, published=excluded.published, answer_index=excluded.answer_index, payload=excluded.payload, reviewed_at=excluded.reviewed_at;`;
}));
mkdirSync('.wrangler', { recursive: true });
const file = '.wrangler/math-import.sql';
writeFileSync(file, statements.join('\n') + '\n');
const result = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB', ...targets[target], '--file', file, '--yes'], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
