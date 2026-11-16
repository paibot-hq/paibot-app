import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APP_CATALOG, APP_TAGS, isNoindexAppPath, relatedApps } from '../../src/lib/app-catalog.ts';
import { publicPaths, toolStructuredData } from '../../src/lib/seo.ts';

test('related apps: those sharing the most tags first, never itself, never private, noindex or coming soon, at most six', () => {
  for (const app of APP_CATALOG.filter(a => a.status === 'published' && a.href)) {
    const related = relatedApps(app);
    assert.ok(related.length > 0 && related.length <= 6, app.slug);
    assert.ok(!related.some(r => r.slug === app.slug || r.private || r.noindex || r.status !== 'published' || !r.href), app.slug);
    assert.equal(new Set(related.map(r => r.slug)).size, related.length);
    const shared = related.map(r => r.tags.filter(tag => app.tags.includes(tag)).length);
    assert.deepEqual(shared, [...shared].sort((a, b) => b - a), `${app.slug}: more shared tags come first`);
  }
  const list = [
    { slug: 'a', href: '/a', tags: ['dev', 'text'], status: 'published', messageKey: 'a' },
    { slug: 'b', href: '/b', tags: ['game'], status: 'published', messageKey: 'b' },
    { slug: 'c', href: '/c', tags: ['text'], status: 'published', messageKey: 'c' },
    { slug: 'd', href: '/d', tags: ['text', 'dev'], status: 'published', messageKey: 'd' },
    { slug: 'e', tags: ['dev'], status: 'comingSoon', messageKey: 'e' },
    { slug: 'f', href: '/f', tags: ['dev', 'text'], status: 'published', messageKey: 'f', noindex: true },
  ];
  assert.deepEqual(relatedApps(list[0], list).map(a => a.slug), ['d', 'c', 'b'], 'two shared tags, then one, then none; coming-soon and noindex apps are not linked');
});

test('every app has one to three known tags, none twice', () => {
  for (const app of APP_CATALOG) {
    assert.ok(app.tags.length >= 1 && app.tags.length <= 3, app.slug);
    assert.equal(new Set(app.tags).size, app.tags.length, app.slug);
    for (const tag of app.tags) assert.ok(APP_TAGS.includes(tag), `${app.slug}: ${tag}`);
  }
});

test('every tag has a name in all three languages and is used by a published app', async () => {
  const { readFileSync } = await import('node:fs');
  for (const locale of ['ja', 'en', 'zh']) {
    const { App } = JSON.parse(readFileSync(new URL(`../../messages/${locale}.json`, import.meta.url), 'utf8'));
    assert.deepEqual(Object.keys(App.tags).sort(), [...APP_TAGS].sort(), locale);
    for (const tag of APP_TAGS) assert.ok(App.tags[tag]?.trim(), `${locale} tags.${tag}`);
  }
  for (const tag of APP_TAGS) assert.ok(APP_CATALOG.some(app => app.status === 'published' && app.tags.includes(tag)), tag);
});

test('structured data is a WebApplication with the tool facts and a type from its tags', () => {
  const data = toolStructuredData({ name: 'JSON', description: 'd', url: 'https://paibot.app/ja/json', locale: 'ja', tags: ['dev', 'text'], siteName: 'PAIBOT.app', siteUrl: 'https://paibot.app/ja' });
  assert.equal(data['@type'], 'WebApplication');
  assert.equal(data.applicationCategory, 'DeveloperApplication');
  assert.equal(data.url, 'https://paibot.app/ja/json');
  assert.equal(data.inLanguage, 'ja');
  const type = tags => toolStructuredData({ ...data, tags, siteName: 'P', siteUrl: 'u', locale: 'en' }).applicationCategory;
  assert.equal(type(['game', 'math']), 'GameApplication');
  assert.equal(type(['math', 'art']), 'EducationalApplication');
  assert.equal(type(['ai', 'calc']), 'DeveloperApplication');
  assert.equal(type(['time']), 'UtilitiesApplication');
});

test('every public tool has its text about it, and how to use it, in all three languages', async () => {
  const { readFileSync } = await import('node:fs');
  for (const locale of ['ja', 'en', 'zh']) {
    const app = JSON.parse(readFileSync(new URL(`../../messages/${locale}.json`, import.meta.url), 'utf8')).App;
    for (const tool of APP_CATALOG.filter(a => a.status === 'published' && a.href && !a.private)) {
      for (const key of ['about']) assert.ok(typeof app[tool.messageKey]?.[key] === 'string' && app[tool.messageKey][key].length >= 8, `${locale} ${tool.slug}.${key}`);
    }
  }
});

test('noindex apps are excluded from publicPaths and detected by isNoindexAppPath, and localOnly apps are public tools', () => {
  const noindexApps = APP_CATALOG.filter(a => a.noindex);
  assert.ok(noindexApps.length >= 30);
  for (const app of noindexApps) {
    assert.ok(!publicPaths.includes(app.href), `publicPaths should not include ${app.href}`);
    assert.equal(isNoindexAppPath(`/ja${app.href}`), true, app.href);
    assert.equal(isNoindexAppPath(`/en${app.href}.data`), true, `${app.href}.data`);
  }
  const indexedApps = APP_CATALOG.filter(a => a.status === 'published' && a.href && !a.private && !a.noindex);
  for (const app of indexedApps) {
    assert.ok(publicPaths.includes(app.href), `publicPaths should include ${app.href}`);
    assert.equal(isNoindexAppPath(`/ja${app.href}`), false, app.href);
  }
  assert.equal(isNoindexAppPath('/ja'), false);
  assert.equal(isNoindexAppPath('/ja/apps'), false);
  const localApps = APP_CATALOG.filter(a => a.localOnly);
  assert.ok(localApps.length >= 20, 'localOnly tools are marked');
  for (const app of localApps) {
    assert.ok(app.status === 'published' && app.href, `localOnly: ${app.slug}`);
  }
});
