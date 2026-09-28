import assert from 'node:assert/strict';
import { imagePdf } from './card-pdf.ts';

// The hand-written PDF must be structurally valid: every xref offset points at
// its object, the image stream holds the JPEG bytes unchanged, and the page is
// the card's size in points.
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 1, 2, 3, 0x0a, 0xff, 0xd9]);
const pdf = imagePdf(jpeg, { width: 2150, height: 1300 }, { width: 91, height: 55 });
const text = Buffer.from(pdf).toString('latin1');

assert.ok(text.startsWith('%PDF-1.4\n'));
assert.ok(text.endsWith('%%EOF\n'));
const xref = Number(text.match(/startxref\n(\d+)\n%%EOF/)[1]);
assert.ok(text.startsWith('xref\n', xref), 'startxref points at the xref table');
const entries = text.slice(xref).split('\n').slice(3, 8);
entries.forEach((entry, i) => {
  const offset = Number(entry.slice(0, 10));
  assert.ok(text.startsWith(`${i + 1} 0 obj\n`, offset), `xref entry ${i + 1} points at its object`);
});
assert.match(text, /\/MediaBox \[0 0 257\.95 155\.91\]/, '91 x 55 mm in points');
assert.match(text, /\/Width 2150 \/Height 1300 .*\/Filter \/DCTDecode \/Length 12 >>/);
const stream = text.indexOf('stream\n', text.indexOf('/DCTDecode')) + 'stream\n'.length;
assert.deepEqual([...pdf.subarray(stream, stream + jpeg.length)], [...jpeg], 'the JPEG bytes are embedded unchanged');
const draw = 'q 257.95 0 0 155.91 0 0 cm /Im0 Do Q';
assert.ok(text.includes(`<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`), 'the content stream draws the image over the page');

console.log('PASS: one-page image PDF: header, xref offsets, card-size MediaBox, embedded JPEG and content stream');
