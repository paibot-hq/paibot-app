import assert from 'node:assert/strict';
import { commerce, privacy, terms } from '../src/content/legal.ts';
import { CONTACT_EMAIL, SUPPORTER_PLAN } from '../src/lib/plans.ts';

// The legal pages go to a payment provider's review and to customers, so they
// must not ship with placeholder contact details or a missing translation.
assert.doesNotMatch(CONTACT_EMAIL, /TODO/i, 'Set CONTACT_EMAIL in src/lib/plans.ts before publishing the legal pages');
assert.match(CONTACT_EMAIL, /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i);
assert.ok(Number.isInteger(SUPPORTER_PLAN.priceYen) && SUPPORTER_PLAN.priceYen > 0);
for (const [name, doc] of Object.entries({ commerce, privacy, terms })) {
  assert.deepEqual(Object.keys(doc).sort(), ['en', 'ja', 'zh'], `${name}: all three locales`);
  const count = locale => (doc[locale].rows ?? doc[locale].sections).length;
  assert.ok(count('ja') > 0 && count('en') === count('ja') && count('zh') === count('ja'), `${name}: translations have the same structure`);
}
console.log('PASS: legal pages have a real contact address, a price and matching translations');
