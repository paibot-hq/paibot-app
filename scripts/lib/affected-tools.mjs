// Which tools a change can affect, so PR CI runs browser flows only for those.
// Returns 'all' when a change may reach every tool (shared components, styles,
// routing, i18n setup, dependencies, CI) or a Set of slugs (possibly empty).
//
// `change` describes the diff:
//   files: changed paths
//   addedLines(path): the diff's added lines, or null if it also removes lines
//   json(path): { before, after } parsed JSON of a changed messages file
export function affectedTools(change, catalog) {
  const tools = catalog.filter(app => app.status === 'published' && app.href);
  const slugs = new Set(tools.map(app => app.slug));
  const byMessageKey = new Map(tools.map(app => [app.messageKey, app.slug]));
  const hit = new Set();
  for (const file of change.files) {
    let m;
    if ((m = file.match(/^src\/tools\/([^/]+)\//)) || (m = file.match(/^tests\/e2e\/flows\/([^/]+)\.mjs$/))) {
      // A removed tool's folder is not in the catalog any more; nothing to run.
      if (slugs.has(m[1])) hit.add(m[1]);
    } else if (/^(docs|infra|scripts|tests\/unit)\//.test(file) || /\.md$/.test(file) || /^\.gitignore$/.test(file)) {
      // No effect on what the browser sees (scripts/ is tooling; unit tests run in full).
    } else if (/^src\/data\/math-/.test(file)) {
      hit.add('math');
    } else if (file === 'src/data/quiz.json') {
      hit.add('quiz');
    } else if (file === 'src/data/breaches.json') {
      hit.add('breaches');
    } else if (/^messages\/[a-z]+\.json$/.test(file)) {
      const { before, after } = change.json(file);
      const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
      for (const key of keys) {
        if (key !== 'App') { if (JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key])) return 'all'; continue; }
        const [b, a] = [before?.App ?? {}, after?.App ?? {}];
        for (const sub of new Set([...Object.keys(b), ...Object.keys(a)])) {
          if (JSON.stringify(b[sub]) === JSON.stringify(a[sub])) continue;
          const slug = byMessageKey.get(sub);
          if (!slug) return 'all';
          hit.add(slug);
        }
      }
    } else if (file === 'src/lib/app-catalog.ts' || file === 'src/lib/apps.tsx') {
      // The registries every tool is added to: a pure addition affects only
      // the tools it names (plus the lists that show every tool: the
      // category pages are covered by the smoke check, which always runs).
      const added = change.addedLines(file);
      if (added === null) return 'all';
      for (const line of added) for (const slug of slugs) {
        if (new RegExp(`["']${slug}["']|\\b${slug.replace(/-/g, '\\-')}:`).test(line)) hit.add(slug);
      }
    } else {
      return 'all';
    }
  }
  return hit;
}
