import { APP_CATALOG } from '../../../src/lib/app-catalog.ts';

// The published tools a browser check should cover: all of them, or only
// those named in CHECK_TOOLS (comma-separated slugs, as printed by
// scripts/affected-tools.mjs). An empty CHECK_TOOLS means none.
export function selectedTools() {
  const tools = APP_CATALOG.filter(app => app.status === 'published' && app.href);
  const wanted = process.env.CHECK_TOOLS;
  if (wanted === undefined || wanted === 'all') return tools;
  const slugs = wanted.split(',').map(slug => slug.trim()).filter(Boolean);
  const unknown = slugs.filter(slug => !tools.some(app => app.slug === slug));
  if (unknown.length) throw new Error(`CHECK_TOOLS: unknown or unpublished ${unknown.join(', ')}`);
  return tools.filter(app => slugs.includes(app.slug));
}
