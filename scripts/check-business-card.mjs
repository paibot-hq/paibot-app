import assert from 'node:assert/strict';
import qrcode from 'qrcode-generator';
import { buildVCard, EMPTY_CARD, fitSize, qrPath, textEms } from '../src/lib/business-card.ts';

// vCard: required lines, escaping, and empty fields left out.
const card = { ...EMPTY_CARD, name: '山田 太郎', company: 'Paibot, Inc.', title: '営業部; 部長', phone: '03-1234-5678', email: 'taro@example.com', address: '東京都千代田区1-2-3\n4F' };
const vcard = buildVCard(card);
const lines = vcard.split('\r\n');
assert.equal(lines[0], 'BEGIN:VCARD');
assert.equal(lines.at(-1), 'END:VCARD');
assert.ok(lines.includes('FN:山田 太郎') && lines.includes('N:山田 太郎;;;;'));
assert.ok(lines.includes('ORG:Paibot\\, Inc.'), 'commas are escaped');
assert.ok(lines.includes('TITLE:営業部\\; 部長'), 'semicolons are escaped');
assert.ok(lines.includes('ADR;TYPE=WORK:;;東京都千代田区1-2-3\\n4F;;;;'), 'the address goes in the street part, newlines escaped');
assert.ok(!vcard.includes('URL'), 'empty fields are left out');

// The QR code carries the vCard as UTF-8: decoding the module bytes is out of
// scope, so check the encoder used UTF-8 (3 bytes per kanji) and drew modules.
assert.equal(qrcode.stringToBytes('山').length, 3, 'QR payloads are UTF-8');
const path = qrPath(vcard, 0, 0, 16);
assert.ok(path.startsWith('M0.000 0.000') && path.split('M').length > 100, 'the QR path starts with the finder pattern corner');

// Text sizing: full-width characters count as 1em, others about half.
assert.equal(textEms('名刺'), 2);
assert.ok(Math.abs(textEms('abcd') - 2.24) < 1e-9);
assert.equal(fitSize('名刺', 5, 20), 5, 'short text keeps its size');
assert.equal(fitSize('名刺名刺名刺名刺名刺', 5, 20), 2, 'long text shrinks to fit');

console.log('PASS: business card vCard (escaping, empty fields, UTF-8 QR) and text sizing');
