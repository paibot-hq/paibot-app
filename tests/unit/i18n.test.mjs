import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { locales } from '../../src/i18n/routing.ts';

// Every catalog must have exactly ja.json's keys, and each message must use
// the same placeholders ({domain}, {count, plural, ...}) in every locale:
// a missing key or a renamed placeholder only fails at runtime otherwise.
const load = locale => JSON.parse(readFileSync(new URL(`../../messages/${locale}.json`, import.meta.url), 'utf8'));

function flatten(value, prefix = '', out = new Map()) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) flatten(child, prefix ? `${prefix}.${key}` : key, out);
  } else {
    out.set(prefix, value);
  }
  return out;
}

// Top-level ICU arguments only: `{count, plural, one {# item} other {# items}}`
// yields "count", not the words inside the branches.
function placeholders(message) {
  if (typeof message !== 'string') return [];
  const names = new Set();
  let depth = 0;
  for (let i = 0; i < message.length; i++) {
    if (message[i] === '{') {
      if (depth === 0) names.add(message.slice(i + 1).match(/^\s*([\w.]+)/)?.[1]);
      depth++;
    } else if (message[i] === '}') depth--;
  }
  names.delete(undefined);
  return [...names].sort();
}

const [base, ...others] = locales;
const reference = flatten(load(base));
const problems = [];
for (const locale of others) {
  const catalog = flatten(load(locale));
  for (const key of reference.keys()) if (!catalog.has(key)) problems.push(`${locale}: missing ${key}`);
  for (const key of catalog.keys()) if (!reference.has(key)) problems.push(`${locale}: extra ${key} (not in ${base})`);
  for (const [key, message] of catalog) {
    if (!reference.has(key)) continue;
    const expected = placeholders(reference.get(key)).join(', ');
    const actual = placeholders(message).join(', ');
    if (actual !== expected) problems.push(`${locale}: ${key} uses {${actual}}, ${base} uses {${expected}}`);
  }
}
assert.deepEqual(problems, [], `\n${problems.join('\n')}`);
console.log(`PASS: ${others.join(', ')} match ${base}.json: ${reference.size} keys and their placeholders`);
