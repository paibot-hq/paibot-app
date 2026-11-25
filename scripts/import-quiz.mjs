import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { bank } from './validate-quiz.mjs';
import { wranglerConfigArgs } from './lib/wrangler-target.mjs';

// Explicit target only; importing never creates or resets any tables.
// The deployment target in void.config.ts, then where its database is (scripts/lib/wrangler-target.mjs).
const targets = { local: ['dev', '--local'], dev: ['dev', '--remote'], prod: ['production', '--remote'] };
const target = process.argv[2];
if (!Object.hasOwn(targets, target) || process.argv.length !== 3) throw new Error('Usage: node scripts/import-quiz.mjs local|dev|prod');
const [, ...where] = targets[target];
const wranglerConfig = (await wranglerConfigArgs(targets[target][0])).slice(0, where.includes('--local') ? 4 : 2);
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
const statements = bank.questions.map(q => {
  const values = [q.id, q.category, Number(q.published), q.answerIndex, JSON.stringify(q.translations), q.source, q.reviewedAt].map(quote).join(',');
  return `INSERT INTO quiz_questions (id, category, published, answer_index, translations, source, reviewed_at) VALUES (${values}) ON CONFLICT(id) DO UPDATE SET category=excluded.category, published=excluded.published, answer_index=excluded.answer_index, translations=excluded.translations, source=excluded.source, reviewed_at=excluded.reviewed_at;`;
});
mkdirSync('.wrangler', { recursive: true });
const file = '.wrangler/quiz-import.sql';
writeFileSync(file, statements.join('\n') + '\n');
const result = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB', ...where, ...wranglerConfig, '--file', file, '--yes'], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
