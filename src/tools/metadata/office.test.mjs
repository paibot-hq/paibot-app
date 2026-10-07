import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readMetadata, stripMetadata, sensitive } from './index.ts';
import { readZip, content, text, crc32, rewriteZip, encode } from './zip.ts';
import { officeFormat, anonymize } from './office.ts';
import { readImage } from './image.ts';
import { docx, xlsx, pptx, zip, phonePhoto, TINY_JPEG, DOCUMENT_XML, COMMENTS_XML } from './fixture.mjs';

const bytes = buffer => new Uint8Array(buffer);
const tag = (report, key) => report.tags.filter(t => t.key === key).map(t => t.value);
const files = async array => Object.fromEntries(await Promise.all(readZip(array).map(async entry => [entry.name, await content(entry)])));

test('the CRC-32 is the standard one', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  assert.equal(crc32(new Uint8Array(0)), 0);
});

test('a ZIP is read, deflated or stored, with the sizes from its directory', async () => {
  const all = await files(bytes(docx()));
  assert.ok(text(all['word/document.xml']).includes('Hello, 世界'));
  assert.deepEqual(Object.keys(all), ['[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/comments.xml', 'docProps/core.xml', 'docProps/app.xml', 'docProps/custom.xml', 'docProps/thumbnail.jpeg', 'word/media/image1.jpeg']);
  assert.throws(() => readZip(new Uint8Array(100)), /not a ZIP/);
});

test('the kind of Office file is told by its parts', () => {
  assert.equal(officeFormat(readZip(bytes(docx()))), 'docx');
  assert.equal(officeFormat(readZip(bytes(xlsx()))), 'xlsx');
  assert.equal(officeFormat(readZip(bytes(pptx()))), 'pptx');
  assert.equal(officeFormat(readZip(bytes(zip([['a.txt', 'hi']])))), null);
});

test('a Word file gives who made it, when, the company, the software, a custom property, the comment and change names, and the picture inside', async () => {
  const report = await readMetadata(bytes(docx()));
  assert.equal(report.format, 'docx');
  assert.deepEqual([tag(report, 'Creator'), tag(report, 'LastModifiedBy')], [['Taro Yamada'], ['Hanako Sato']]);
  assert.deepEqual([tag(report, 'Created'), tag(report, 'Modified')], [['2026-10-05 14:03:21 UTC'], ['2026-10-06 09:30:00 UTC']]);
  assert.deepEqual([tag(report, 'Title'), tag(report, 'Revision')], [['Secret plan'], ['7']]);
  assert.deepEqual([tag(report, 'Company'), tag(report, 'Application'), tag(report, 'AppVersion'), tag(report, 'Template')], [['Example & Co'], ['Microsoft Office Word'], ['16.0000'], ['Normal.dotm']]);
  assert.deepEqual(tag(report, 'ProjectCode'), ['X-42']);
  assert.deepEqual(tag(report, 'CommentAuthor').sort(), ['Hanako Sato', 'Taro Yamada']);
  assert.equal(report.extras.comments, true);
  assert.equal(report.extras.trackedChanges, true);
  assert.equal(report.extras.thumbnail, true);
  assert.equal(report.extras.embeddedPhotos, 1);
  assert.ok(report.gps && Math.abs(report.gps.lat - 35.6895) < 0.001);
  assert.deepEqual(sensitive(report).sort(), ['location', 'person', 'text', 'time']);
});

test('Excel and PowerPoint files are read too, with the names of their comment authors', async () => {
  const sheet = await readMetadata(bytes(xlsx()));
  assert.equal(sheet.format, 'xlsx');
  assert.deepEqual(tag(sheet, 'CommentAuthor'), ['Taro Yamada']);
  assert.equal(sheet.extras.comments, true);
  assert.equal(sheet.extras.trackedChanges, false);
  const slides = await readMetadata(bytes(pptx()));
  assert.equal(slides.format, 'pptx');
  assert.deepEqual(tag(slides, 'CommentAuthor'), ['Taro Yamada']);
});

test('removing the metadata from a Word file leaves its text and layout, the properties empty, no small picture, and no position in the photo', async () => {
  const source = docx();
  const out = await stripMetadata(bytes(source));
  const before = await files(bytes(source)), after = await files(out);
  // The content is the same, byte for byte.
  assert.deepEqual(after['word/document.xml'], before['word/document.xml']);
  assert.deepEqual(after['word/comments.xml'], before['word/comments.xml']);
  assert.deepEqual(after['[Content_Types].xml'], before['[Content_Types].xml']);
  // Nothing of the properties is left, and the small picture and its relationship are gone.
  for (const name of ['docProps/core.xml', 'docProps/app.xml', 'docProps/custom.xml']) { const xml = text(after[name]); for (const gone of ['Taro', 'Hanako', 'Example', 'Microsoft', 'X-42', 'Secret', '2026']) assert.ok(!xml.includes(gone), `${name}: ${gone}`); }
  assert.ok(!('docProps/thumbnail.jpeg' in after));
  assert.ok(!text(after['_rels/.rels']).includes('thumbnail'));
  assert.ok(text(after['_rels/.rels']).includes('docProps/core.xml'), 'the other relationships stay');
  // The photo inside has no position or camera, and is otherwise the same picture.
  assert.equal(readImage(after['word/media/image1.jpeg']).gps, null);
  assert.deepEqual(readImage(after['word/media/image1.jpeg']).tags, []);
  // What is read back from the saved file.
  const report = await readMetadata(out);
  assert.equal(report.format, 'docx');
  assert.deepEqual(report.tags.filter(t => t.group !== 'person'), []);
  assert.deepEqual(tag(report, 'CommentAuthor').sort(), ['Hanako Sato', 'Taro Yamada'], 'names on comments are kept unless asked');
  assert.equal(report.extras.thumbnail, false);
  assert.equal(report.extras.embeddedPhotos, 0);
  assert.ok(out.length < source.length);
  // Doing it again changes nothing in what is read.
  assert.deepEqual((await readMetadata(await stripMetadata(out))).tags, report.tags);
});

test('the names on comments and changes can be replaced, and the text stays', async () => {
  const out = await stripMetadata(bytes(docx()), { anonymizeAuthors: true });
  const after = await files(out);
  assert.ok(!text(after['word/document.xml']).includes('Taro'));
  assert.ok(text(after['word/document.xml']).includes('w:author="Author"'));
  assert.ok(text(after['word/document.xml']).includes('Hello, 世界'));
  assert.ok(!text(after['word/comments.xml']).includes('Hanako'));
  assert.ok(text(after['word/comments.xml']).includes('w:initials="A"') && text(after['word/comments.xml']).includes('check this'));
  assert.deepEqual(tag(await readMetadata(out), 'CommentAuthor'), ['Author']);
  const sheet = await files(await stripMetadata(bytes(xlsx()), { anonymizeAuthors: true }));
  assert.ok(text(sheet['xl/comments1.xml']).includes('<author>Author</author>') && !text(sheet['xl/comments1.xml']).includes('Taro'));
  const slides = await files(await stripMetadata(bytes(pptx()), { anonymizeAuthors: true }));
  assert.match(text(slides['ppt/commentAuthors.xml']), /name="Author" initials="A"/);
  assert.equal(anonymize('word/other.xml', 'w:author="X"'), 'w:author="X"'.replace('X', 'Author'));
});

test('the saved ZIP is a valid ZIP: every entry has its size and CRC, and the directory points to the right place', async () => {
  const out = await stripMetadata(bytes(docx()));
  const entries = readZip(out);
  for (const entry of entries) {
    const data = await content(entry);
    assert.equal(data.length, entry.size, entry.name);
    assert.equal(crc32(data), entry.crc, entry.name);
  }
  assert.ok(entries.every(entry => !(entry.flags & 8)), 'no entry needs a data descriptor');
});

test('what is not an Office file, or is damaged, is not read or changed, and never throws', async () => {
  const plain = bytes(zip([['a.txt', 'hi']]));
  assert.equal((await readMetadata(plain)).format, 'other');
  assert.equal(await stripMetadata(plain), null);
  assert.equal(await stripMetadata(bytes(Buffer.from('plain text'))), null);
  const whole = docx();
  for (let n = 0; n < whole.length; n += 97) { const cut = bytes(whole.subarray(0, n)); await readMetadata(cut); await stripMetadata(cut); }
  for (let i = 0; i < 80; i++) { const copy = Buffer.from(whole); copy[whole.length - 30 + (i % 30)] ^= 0xff; await readMetadata(bytes(copy)); await stripMetadata(bytes(copy)); }
  const odd = Buffer.from(whole); odd.writeUInt16LE(1, odd.length - 22 + 8);
  await readMetadata(bytes(odd));
  // A rewrite with no change keeps every entry as it was.
  const same = await rewriteZip(readZip(bytes(whole)), new Map());
  assert.deepEqual(Object.keys(await files(same)), Object.keys(await files(bytes(whole))));
  const replaced = await rewriteZip(readZip(bytes(whole)), new Map([['word/document.xml', encode('<x/>')]]));
  assert.equal(text((await files(replaced))['word/document.xml']), '<x/>');
});
