import assert from 'node:assert/strict';
import { contactLines, EMPTY_CARD, fitSize, textEms } from './card.ts';

// The contact block: address with postal mark, TEL and FAX on one line, email, website.
const card = { ...EMPTY_CARD, name: '山田 太郎', postalCode: '100-0005', address: '東京都千代田区1-2-3\n4F', phone: '03-1234-5678', fax: '03-1234-5679', email: 'taro@example.com', website: 'https://example.com' };
assert.deepEqual(contactLines(card, '〒'), [
  '〒100-0005 東京都千代田区1-2-3 4F', 'TEL: 03-1234-5678   FAX: 03-1234-5679', 'E-mail: taro@example.com', 'https://example.com',
]);
assert.deepEqual(contactLines({ ...EMPTY_CARD, fax: '1' }), ['FAX: 1'], 'empty items are left out');
assert.deepEqual(contactLines({ ...EMPTY_CARD, postalCode: '12345' }), ['12345'], 'no postal mark outside Japanese');

// Text sizing: full-width characters count as 1em, others about half.
assert.equal(textEms('名刺'), 2);
assert.ok(Math.abs(textEms('abcd') - 2.24) < 1e-9);
assert.equal(fitSize('名刺', 5, 20), 5, 'short text keeps its size');
assert.equal(fitSize('名刺名刺名刺名刺名刺', 5, 20), 2, 'long text shrinks to fit');

console.log('PASS: business card contact block and text sizing');
