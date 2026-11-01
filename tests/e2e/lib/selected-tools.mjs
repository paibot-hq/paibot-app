import { existsSync, readFileSync } from 'node:fs';
import { APP_CATALOG } from '../../../src/lib/app-catalog.ts';

// A tool's browser flow: src/tools/<slug>/e2e.mjs, or tests/e2e/flows/<slug>.mjs for pages outside src/tools (math).
export const flowFile = slug => [new URL(`../../../src/tools/${slug}/e2e.mjs`, import.meta.url), new URL(`../flows/${slug}.mjs`, import.meta.url)].find(existsSync);

// A flow that keeps the processor busy the whole time (3D drawn in software, a live video standing in for a camera) says so with
// `export const alone = true` (see tools.mjs).
export const runsAlone = file => /^export const alone = true;/m.test(readFileSync(file, 'utf8'));

// The published tools a browser check should cover: all of them, or only
// those named in CHECK_TOOLS (comma-separated slugs, as printed by
// scripts/affected-tools.mjs). An empty CHECK_TOOLS means none.
// CHECK_SHARD=i/n then keeps the i-th (from 1) of n shares, so n CI jobs can
// split the tools between them (shardOf).
export function selectedTools({ tools: wanted = process.env.CHECK_TOOLS, shard = process.env.CHECK_SHARD } = {}) {
  const tools = chosenTools(wanted);
  if (!shard) return tools;
  const [index, count] = shard.split('/').map(Number);
  if (!Number.isInteger(index) || !Number.isInteger(count) || index < 1 || index > count) throw new Error(`CHECK_SHARD: expected i/n, got ${shard}`);
  return shardOf(tools, count, slug => { const file = flowFile(slug); return file && runsAlone(file) ? ALONE_WEIGHT : 1; })[index - 1];
}

// Up to this many tools all go to the first share: each CI job sets itself up for about a minute (dependencies, database, browser, build), more
// than a few flows take, and the first job runs the checks that are not per tool anyway.
const FEW = 8;
// A flow that runs alone took 30 to 100 seconds on CI, the others a few each.
const ALONE_WEIGHT = 10;

// The tools in `count` shares of about the same weight: the heaviest first, each to the lightest share so far (the first on a tie), so the same
// list always splits the same way.
export function shardOf(tools, count, weight) {
  const shares = Array.from({ length: count }, () => []);
  if (tools.length <= FEW) {
    shares[0] = [...tools];
    return shares;
  }
  const loads = new Array(count).fill(0);
  const weighed = tools.map(app => ({ app, weight: weight(app.slug) })).sort((a, b) => b.weight - a.weight);
  for (const { app, weight: w } of weighed) {
    const lightest = loads.indexOf(Math.min(...loads));
    shares[lightest].push(app);
    loads[lightest] += w;
  }
  // Back in the catalog's order within each share.
  return shares.map(share => tools.filter(app => share.includes(app)));
}

function chosenTools(wanted) {
  const tools = APP_CATALOG.filter(app => app.status === 'published' && app.href);
  if (wanted === undefined || wanted === 'all') return tools;
  const slugs = wanted.split(',').map(slug => slug.trim()).filter(Boolean);
  const unknown = slugs.filter(slug => !tools.some(app => app.slug === slug));
  if (unknown.length) throw new Error(`CHECK_TOOLS: unknown or unpublished ${unknown.join(', ')}`);
  return tools.filter(app => slugs.includes(app.slug));
}
