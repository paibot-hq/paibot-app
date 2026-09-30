import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import katex from 'katex';
import { MATH_CATALOG } from '../../src/lib/math-catalog.ts';
import { keyFormulas } from '../../src/lib/math-key-points.ts';

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
  // Well-known formulas (TeX, written by an LLM, not machine-verified) must at least render.
  const formulas = keyFormulas(unit.id, item.id);
  assert.ok(formulas.length <= 4, `${unit.id}/${item.id}: at most 4 formulas`);
  for (const tex of formulas) { assert.ok(tex.length <= 160, `${unit.id}/${item.id}: formula length`); katex.renderToString(tex, { throwOnError: true }); }
}
console.log(`PASS: all ${MATH_CATALOG.flatMap(unit => unit.items).length} learning items have a summary and a description in ja, en and zh`);
