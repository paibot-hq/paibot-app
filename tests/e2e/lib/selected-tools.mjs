import { APP_CATALOG } from '../../../src/lib/app-catalog.ts';

// The published tools a browser check should cover: all of them, or only
// those named in CHECK_TOOLS (comma-separated slugs, as printed by
// scripts/affected-tools.mjs). An empty CHECK_TOOLS means none.
// CHECK_SHARD=i/n then keeps every n-th of those (i from 1), so n CI jobs can
// split the tools between them.
export function selectedTools() {
  const tools = chosenTools();
  const shard = process.env.CHECK_SHARD;
  if (!shard) return tools;
  const [index, count] = shard.split('/').map(Number);
  if (!Number.isInteger(index) || !Number.isInteger(count) || index < 1 || index > count) throw new Error(`CHECK_SHARD: expected i/n, got ${shard}`);
  return tools.filter((_, position) => position % count === index - 1);
}
function chosenTools() {
  const tools = APP_CATALOG.filter(app => app.status === 'published' && app.href);
  const wanted = process.env.CHECK_TOOLS;
  if (wanted === undefined || wanted === 'all') return tools;
  const slugs = wanted.split(',').map(slug => slug.trim()).filter(Boolean);
  const unknown = slugs.filter(slug => !tools.some(app => app.slug === slug));
  if (unknown.length) throw new Error(`CHECK_TOOLS: unknown or unpublished ${unknown.join(', ')}`);
  return tools.filter(app => slugs.includes(app.slug));
}
