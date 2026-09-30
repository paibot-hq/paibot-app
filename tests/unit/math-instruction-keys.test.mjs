import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The instruction lines of formula problems are keys under App.math.formulaQuiz. A key written
// twice in the file is silently overridden by the later one (JSON.parse keeps the last), which
// broke the polynomial remainder page once: no duplicate keys, and the same keys in every language.
function formulaQuizKeys(locale) {
  const text = readFileSync(new URL(`../../messages/${locale}.json`, import.meta.url), 'utf8');
  const start = text.indexOf('"formulaQuiz": {');
  assert.ok(start >= 0, `${locale}: formulaQuiz`);
  let depth = 0, i = text.indexOf('{', start);
  const block = [];
  for (let j = i; j < text.length; j++) {
    if (text[j] === '{') depth++;
    if (text[j] === '}' && --depth === 0) { block.push(text.slice(i + 1, j)); break; }
  }
  return [...block[0].matchAll(/^\s*"([A-Za-z0-9]+)":/gm)].map(match => match[1]);
}
const keys = Object.fromEntries(['ja', 'en', 'zh'].map(locale => [locale, formulaQuizKeys(locale)]));
for (const [locale, list] of Object.entries(keys)) {
  const duplicates = list.filter((key, index) => list.indexOf(key) !== index);
  assert.deepEqual(duplicates, [], `${locale}: duplicate formulaQuiz keys ${duplicates.join(', ')}`);
}
assert.deepEqual([...keys.en].sort(), [...keys.ja].sort(), 'en has the same formulaQuiz keys as ja');
assert.deepEqual([...keys.zh].sort(), [...keys.ja].sort(), 'zh has the same formulaQuiz keys as ja');
console.log(`PASS: ${keys.ja.length} formulaQuiz instruction keys, none duplicated, the same in ja, en and zh`);
