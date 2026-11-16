import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { locales } from '../../src/i18n/routing.ts';
import { APP_CATALOG } from '../../src/lib/app-catalog.ts';

// A tool's guide (App.<key>.guide, App.<key>.faq) is shown under the tool by ToolAbout. i18n.test.mjs only sees each as one value, so
// this checks their shape: the same sections and questions in every locale, none left empty.
const load = locale => JSON.parse(readFileSync(new URL(`../../messages/${locale}.json`, import.meta.url), 'utf8')).App;
const catalogs = Object.fromEntries(locales.map(locale => [locale, load(locale)]));
const filled = value => typeof value === 'string' && value.trim().length > 0;

test('tool guides have the same shape in every locale', () => {
  const withGuide = APP_CATALOG.filter(app => catalogs.ja[app.messageKey]?.guide);
  assert.ok(withGuide.length > 0);
  for (const app of withGuide) {
    for (const locale of locales) {
      const { guide, faq } = catalogs[locale][app.messageKey];
      const where = `${locale}: App.${app.messageKey}`;
      assert.ok(Array.isArray(guide) && guide.length > 0, `${where}.guide`);
      assert.equal(guide.length, catalogs.ja[app.messageKey].guide.length, `${where}.guide: sections`);
      guide.forEach((section, i) => {
        assert.ok(filled(section.heading), `${where}.guide[${i}].heading`);
        assert.equal(section.paragraphs.length, catalogs.ja[app.messageKey].guide[i].paragraphs.length, `${where}.guide[${i}]: paragraphs`);
        assert.ok(section.paragraphs.every(filled), `${where}.guide[${i}].paragraphs`);
      });
      assert.equal(faq?.length ?? 0, catalogs.ja[app.messageKey].faq?.length ?? 0, `${where}.faq`);
      for (const item of faq ?? []) assert.ok(filled(item.q) && filled(item.a), `${where}.faq`);
    }
  }
});

test('the about page sections have the same shape in every locale', () => {
  for (const locale of locales) {
    const { sections } = catalogs[locale].about;
    assert.equal(sections.length, catalogs.ja.about.sections.length, locale);
    sections.forEach((section, i) => assert.equal(section.paragraphs.length, catalogs.ja.about.sections[i].paragraphs.length, `${locale}: section ${i}`));
  }
});

test('every indexed tool (except math, which has item lessons) has a multi-section guide and FAQ in all three languages', () => {
  const indexedTools = APP_CATALOG.filter(app => app.status === 'published' && app.href && !app.private && !app.noindex && app.slug !== 'math');
  assert.ok(indexedTools.length >= 30);
  for (const app of indexedTools) {
    for (const locale of locales) {
      const entry = catalogs[locale][app.messageKey];
      assert.ok(Array.isArray(entry?.guide) && entry.guide.length >= 2, `${locale}: ${app.slug} missing guide`);
      assert.ok(Array.isArray(entry?.faq) && entry.faq.length >= 2, `${locale}: ${app.slug} missing faq`);
    }
  }
});
