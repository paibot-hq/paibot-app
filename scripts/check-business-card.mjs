import assert from 'node:assert/strict';
import qrcode from 'qrcode-generator';
import { buildVCard, contactLines, EMPTY_CARD, fitSize, qrPath, qrPayload, textEms, websiteUrl } from '../src/lib/business-card.ts';

// vCard: required lines, escaping, and empty fields left out.
const card = { ...EMPTY_CARD, name: '山田 太郎', company: 'Paibot, Inc.', department: '営業部', title: '部長; 兼 課長', postalCode: '100-0005', phone: '03-1234-5678', fax: '03-1234-5679', email: 'taro@example.com', address: '東京都千代田区1-2-3\n4F' };
const vcard = buildVCard(card);
const lines = vcard.split('\r\n');
assert.equal(lines[0], 'BEGIN:VCARD');
assert.equal(lines.at(-1), 'END:VCARD');
assert.ok(lines.includes('FN:山田 太郎') && lines.includes('N:山田 太郎;;;;'));
assert.ok(lines.includes('ORG:Paibot\\, Inc.;営業部'), 'ORG is company;department, commas escaped');
assert.ok(lines.includes('TEL;TYPE=WORK,FAX:03-1234-5679'), 'the fax number is a FAX-typed TEL');
assert.ok(lines.includes('TITLE:部長\\; 兼 課長'), 'semicolons are escaped');
assert.ok(lines.includes('ADR;TYPE=WORK:;;東京都千代田区1-2-3\\n4F;;;100-0005;'), 'street part and postal code, newlines escaped');
assert.ok(!vcard.includes('URL'), 'empty fields are left out');

// The QR code carries the vCard as UTF-8: decoding the module bytes is out of
// scope, so check the encoder used UTF-8 (3 bytes per kanji) and drew modules.
assert.equal(qrcode.stringToBytes('山').length, 3, 'QR payloads are UTF-8');
const path = qrPath(vcard, 0, 0, 16);
assert.ok(path.startsWith('M0.000 0.000') && path.split('M').length > 100, 'the QR path starts with the finder pattern corner');

// QR payload per mode; the website gets a scheme when it has none.
assert.equal(qrPayload(card, 'none'), '');
assert.equal(qrPayload(card, 'contact'), vcard);
assert.equal(qrPayload({ ...card, name: '' }, 'contact'), '', 'no contact QR without a name');
assert.equal(qrPayload({ ...card, website: 'example.com' }, 'website'), 'https://example.com');
assert.equal(websiteUrl('http://example.com/a'), 'http://example.com/a');
assert.equal(websiteUrl('example.com:8080'), 'https://example.com:8080');
assert.equal(qrPayload(card, 'website'), '', 'no website QR without a website');

// The contact block: address with postal mark, TEL and FAX on one line, email, website.
assert.deepEqual(contactLines({ ...card, website: 'https://example.com' }, '〒'), [
  '〒100-0005 東京都千代田区1-2-3 4F', 'TEL: 03-1234-5678   FAX: 03-1234-5679', 'E-mail: taro@example.com', 'https://example.com',
]);
assert.deepEqual(contactLines({ ...EMPTY_CARD, fax: '1' }), ['FAX: 1'], 'empty items are left out');

// Text sizing: full-width characters count as 1em, others about half.
assert.equal(textEms('名刺'), 2);
assert.ok(Math.abs(textEms('abcd') - 2.24) < 1e-9);
assert.equal(fitSize('名刺', 5, 20), 5, 'short text keeps its size');
assert.equal(fitSize('名刺名刺名刺名刺名刺', 5, 20), 2, 'long text shrinks to fit');
assert.equal(fitSize('名刺', 10, 30, 1), 10, 'letter spacing counts: 2em + 1em of spacing fits 30 at size 10');
assert.equal(fitSize('名刺', 20, 30, 1), 10, 'and shrinks when it would not');

console.log('PASS: business card vCard (escaping, empty fields, UTF-8 QR), QR payload per mode and text sizing');
