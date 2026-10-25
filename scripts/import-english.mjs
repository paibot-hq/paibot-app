import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { ENGLISH_UNITS, findEnglishItem } from '../src/tools/english/catalog.ts';
import { banks, validateAll } from './validate-english.mjs';

// Imports src/data/english-<unit>.json into D1's english_problems, as scripts/import-math.mjs does for math. Explicit target
// only; importing never creates or resets any tables. The grade column takes the item's CEFR-J level. --drafts (local only)
// imports unreviewed problems as published too, so that they can be looked at in a local preview before the review passes.
const targets = { local: ['--local'], dev: ['--remote'], prod: ['--remote', '--env', 'production'] };
const [target, ...flags] = process.argv.slice(2);
const drafts = flags.includes('--drafts');
if (!Object.hasOwn(targets, target) || flags.some(flag => flag !== '--drafts') || (drafts && target !== 'local')) {
  throw new Error('Usage: node scripts/import-english.mjs local|dev|prod  (--drafts: local only)');
}
validateAll();
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
const statements = ENGLISH_UNITS.flatMap(unit => banks[unit].problems.map(p => {
  const payload = { stem: p.stem, choices: p.choices, explanation: p.explanation, point: p.point };
  const values = [p.id, unit, p.item, p.setId, p.position, Number(p.published || drafts), p.answerIndex, JSON.stringify(payload), findEnglishItem(unit, p.item).level, p.tier, p.reviewedAt].map(quote).join(',');
  return `INSERT INTO english_problems (id, unit, item, set_id, position, published, answer_index, payload, grade, tier, reviewed_at) VALUES (${values}) ON CONFLICT(id) DO UPDATE SET unit=excluded.unit, item=excluded.item, set_id=excluded.set_id, position=excluded.position, published=excluded.published, answer_index=excluded.answer_index, payload=excluded.payload, grade=excluded.grade, tier=excluded.tier, reviewed_at=excluded.reviewed_at;`;
}));
mkdirSync('.wrangler', { recursive: true });
const file = '.wrangler/english-import.sql';
writeFileSync(file, statements.join('\n') + '\n');
const result = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB', ...targets[target], '--file', file, '--yes'], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
