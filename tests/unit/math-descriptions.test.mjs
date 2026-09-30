import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import katex from 'katex';
import { MATH_CATALOG } from '../../src/lib/math-catalog.ts';
import { keyPoints } from '../../src/lib/math-key-points.ts';

// Every learning item explains itself in all three languages: a one-line summary
// (unit page) and a description (item page); its formulas (TeX) must render.
const messages = Object.fromEntries(['ja', 'en', 'zh'].map(locale => [locale, JSON.parse(readFileSync(new URL(`../../messages/${locale}.json`, import.meta.url), 'utf8')).App.math.units]));
for (const unit of MATH_CATALOG) for (const item of unit.items) {
  for (const [locale, units] of Object.entries(messages)) {
    const entry = units[unit.id]?.items?.[item.id];
    assert.ok(entry?.summary?.trim(), `${locale}: ${unit.id}/${item.id} needs a summary`);
    assert.ok(entry?.description?.trim(), `${locale}: ${unit.id}/${item.id} needs a description`);
    assert.ok(entry.summary.length <= 90, `${locale}: ${unit.id}/${item.id} summary is a single line (${entry.summary.length} characters)`);
    assert.ok(entry.description.length >= 10 && entry.description.length <= 600, `${locale}: ${unit.id}/${item.id} description length`);
  }
  // Key points: a formula (TeX, must render) and/or a note, each explained in all three languages.
  const points = keyPoints(unit.id, item.id);
  assert.ok(points.length <= 5, `${unit.id}/${item.id}: at most 5 key points`);
  for (const point of points) {
    if (point.tex !== undefined) { assert.ok(point.tex.length <= 160, `${unit.id}/${item.id}: formula length`); katex.renderToString(point.tex, { throwOnError: true }); }
    for (const locale of ['ja', 'en', 'zh']) if (point[locale]) { assert.equal((point[locale].match(/\$/g) ?? []).length % 2, 0, `${unit.id}/${item.id}: unpaired $ in the ${locale} note`); for (const [, tex] of point[locale].matchAll(/\$([^$]+)\$/g)) katex.renderToString(tex, { throwOnError: true }); }
    for (const locale of ['ja', 'en', 'zh']) assert.ok(point[locale]?.trim() && point[locale].length <= 220, `${unit.id}/${item.id}: a ${locale} note (up to 220 characters) for each key point`);
  }
}
console.log(`PASS: all ${MATH_CATALOG.flatMap(unit => unit.items).length} learning items have a summary and a description in ja, en and zh`);
