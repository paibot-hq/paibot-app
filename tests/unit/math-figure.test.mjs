import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { figureRules, generate } from '../../scripts/math-figure-generate.mjs';
import { figureReading } from '../../scripts/math-pipeline.mjs';
import { formulaInstruction } from '../../src/lib/math-formula.ts';

const messages = locale => JSON.parse(readFileSync(new URL(`../../messages/${locale}.json`, import.meta.url), 'utf8')).App.math.formulaQuiz;

// Every figure a generator can make has an instruction line in every language and a text reading for the blind review.
test('figure problems have instructions in all locales and a reading', () => {
  for (const rule of figureRules) {
    for (const p of generate(rule, 5).problems) {
      const { key } = formulaInstruction(p);
      for (const locale of ['ja', 'en', 'zh']) assert.ok(messages(locale)[key], `${locale}: ${key}`);
      if (p.kind === 'figure') assert.ok(figureReading(p).length > 5, `${p.which}: reading`);
      assert.equal(new Set(p.choices).size, 4, `${p.which}: four different choices`);
    }
  }
});

test('generators are deterministic', () => {
  for (const rule of figureRules) assert.deepEqual(generate(rule, 5), generate(rule, 5));
});
