import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APP_CATALOG, relatedApps } from '../../src/lib/app-catalog.ts';
import { toolStructuredData } from '../../src/lib/seo.ts';

test('related tools: the same kind first, never itself, never private or coming soon, at most six', () => {
  for (const app of APP_CATALOG.filter(a => a.status === 'published' && a.href)) {
    const related = relatedApps(app);
    assert.ok(related.length > 0 && related.length <= 6, app.slug);
    assert.ok(!related.some(r => r.slug === app.slug || r.private || r.status !== 'published' || !r.href), app.slug);
    assert.equal(new Set(related.map(r => r.slug)).size, related.length);
    const sameKind = related.map(r => r.category === app.category);
    assert.deepEqual(sameKind, [...sameKind].sort((a, b) => Number(b) - Number(a)), `${app.slug}: the same kind comes first`);
  }
  const list = [{ slug: 'a', href: '/a', category: 'dev', status: 'published', messageKey: 'a' }, { slug: 'b', href: '/b', category: 'game', status: 'published', messageKey: 'b' }, { slug: 'c', category: 'dev', status: 'comingSoon', messageKey: 'c' }];
  assert.deepEqual(relatedApps(list[0], list).map(a => a.slug), ['b'], 'a coming-soon tool is not linked; the other kind fills up');
});

test('structured data is a WebApplication with the tool facts and a category type', () => {
  const data = toolStructuredData({ name: 'JSON', description: 'd', url: 'https://paibot.app/ja/json', locale: 'ja', category: 'dev', siteName: 'PAIBOT', siteUrl: 'https://paibot.app/ja' });
  assert.equal(data['@type'], 'WebApplication');
  assert.equal(data.applicationCategory, 'DeveloperApplication');
  assert.equal(data.url, 'https://paibot.app/ja/json');
  assert.equal(data.inLanguage, 'ja');
  assert.equal(toolStructuredData({ ...data, category: 'game', siteName: 'P', siteUrl: 'u', locale: 'en' }).applicationCategory, 'GameApplication');
  assert.equal(toolStructuredData({ ...data, category: 'daily', siteName: 'P', siteUrl: 'u', locale: 'en' }).applicationCategory, 'UtilitiesApplication');
});

test('every public tool has its text about it, and how to use it, in all three languages', async () => {
  const { readFileSync } = await import('node:fs');
  for (const locale of ['ja', 'en', 'zh']) {
    const app = JSON.parse(readFileSync(new URL(`../../messages/${locale}.json`, import.meta.url), 'utf8')).App;
    for (const tool of APP_CATALOG.filter(a => a.status === 'published' && a.href && !a.private)) {
      for (const key of ['about', 'use']) assert.ok(typeof app[tool.messageKey]?.[key] === 'string' && app[tool.messageKey][key].length >= 8, `${locale} ${tool.slug}.${key}`);
    }
  }
});
