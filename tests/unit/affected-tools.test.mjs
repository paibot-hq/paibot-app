import assert from 'node:assert/strict';
import { affectedTools } from '../../scripts/lib/affected-tools.mjs';

const catalog = [
  { slug: 'json', href: '/json', status: 'published', messageKey: 'json' },
  { slug: 'business-card', href: '/business-card', status: 'published', messageKey: 'businessCard' },
  { slug: 'math', href: '/math', status: 'published', messageKey: 'math' },
  { slug: 'soon', status: 'comingSoon', messageKey: 'soon' },
];
const run = (files, { added = {}, json = {} } = {}) => {
  const result = affectedTools({ files, addedLines: file => added[file] ?? null, json: file => json[file] }, catalog);
  return result === 'all' ? 'all' : [...result].sort();
};

assert.deepEqual(run(['src/tools/json/json-tool.tsx', 'src/tools/json/e2e.mjs']), ['json']);
assert.deepEqual(run(['tests/e2e/flows/math.mjs', 'src/data/math-arith.json']), ['math']);
assert.deepEqual(run(['README.md', 'docs/x.md', 'tests/unit/cidr.test.mjs', 'scripts/import-math.mjs']), []);
assert.equal(run(['src/components/tool-layout.tsx']), 'all');
assert.equal(run(['package-lock.json']), 'all');
assert.equal(run(['tests/e2e/tools.mjs']), 'all');
// Messages: only the tools whose App.<messageKey> changed.
const before = { App: { json: { title: 'JSON' }, businessCard: { title: 'Card' }, nav: 'Home' }, Other: 1 };
assert.deepEqual(run(['messages/en.json'], { json: { 'messages/en.json': { before, after: { ...before, App: { ...before.App, businessCard: { title: 'Cards' } } } } } }), ['business-card']);
assert.equal(run(['messages/en.json'], { json: { 'messages/en.json': { before, after: { ...before, App: { ...before.App, nav: 'Top' } } } } }), 'all');
assert.equal(run(['messages/en.json'], { json: { 'messages/en.json': { before, after: { ...before, Other: 2 } } } }), 'all');
// Registries: a pure addition affects only the tools it names.
assert.deepEqual(run(['src/lib/app-catalog.ts', 'src/lib/apps.tsx'], { added: {
  'src/lib/app-catalog.ts': ['  { slug: "business-card", href: "/business-card", category: "utility", status: "published", messageKey: "businessCard" },'],
  'src/lib/apps.tsx': ['function CardIcon() {}', '  "business-card": CardIcon,'],
} }), ['business-card']);
assert.equal(run(['src/lib/app-catalog.ts']), 'all', 'an edit that removes lines may affect any tool');
console.log('PASS: affected tools from tool folders, flows, data, messages and registry additions; shared code means all');
