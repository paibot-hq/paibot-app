import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { readZip, readFirstSheet, parseSharedStrings, parseSheet, unescapeXml } from '../../scripts/lib/xlsx.mjs';
import { stripReading, cleanText, buildFaq } from '../../scripts/lib/govfaq.mjs';

// A ZIP built by hand: stored and deflated files, a local header and a central directory entry for each.
function zip(files) {
  const locals = [], central = [];
  let offset = 0;
  for (const [name, content, deflate] of files) {
    const raw = Buffer.from(content, 'utf8'), data = deflate ? deflateRawSync(raw) : raw, nameBuffer = Buffer.from(name);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(8, 4); local.writeUInt16LE(deflate ? 8 : 0, 8); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(raw.length, 22); local.writeUInt16LE(nameBuffer.length, 26);
    const entry = Buffer.alloc(46); entry.writeUInt32LE(0x02014b50, 0); entry.writeUInt16LE(deflate ? 8 : 0, 10); entry.writeUInt32LE(data.length, 20); entry.writeUInt32LE(raw.length, 24); entry.writeUInt16LE(nameBuffer.length, 28); entry.writeUInt32LE(offset, 42);
    locals.push(local, nameBuffer, data); central.push(entry, nameBuffer);
    offset += 30 + nameBuffer.length + data.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

const SHARED = '<sst><si><t>ID</t></si><si><t>第一階層</t><rPh sb="0" eb="1"><t>ダイイチ</t></rPh></si><si><r><t>問い</t></r><r><t>トイ</t></r></si><si><t>回答</t></si><si><t>A-1</t></si><si><t>マイナンバー</t></si><si><t>Q &amp; A です。</t></si><si><t>答え　&lt;ここ,https://example.go.jp/&gt;\r\nイチ</t></si></sst>';
const SHEET = '<worksheet><sheetData>'
  + '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c><c r="D1" t="s"><v>3</v></c></row>'
  + '<row r="2"><c r="A2" t="s"><v>4</v></c><c r="B2" t="s"><v>5</v></c><c r="C2" t="s"><v>6</v></c><c r="D2" t="s"><v>7</v></c><c r="F2"><v>42</v></c></row>'
  + '<row r="3"><c r="A3" t="inlineStr"><is><t>B-2</t></is></c><c r="C3" t="s"><v>6</v></c></row>'
  + '</sheetData></worksheet>';

test('a ZIP is read through its directory, stored and deflated files alike', () => {
  const files = readZip(zip([['a.txt', 'stored', false], ['dir/b.xml', '<x>deflated 日本語 ' + 'z'.repeat(500) + '</x>', true]]));
  assert.equal(files.get('a.txt').toString(), 'stored');
  assert.match(files.get('dir/b.xml').toString(), /^<x>deflated 日本語 z+<\/x>$/);
  assert.throws(() => readZip(Buffer.from('not a zip at all')), /not a ZIP/);
});

test('shared strings join their runs, leave out the phonetic guides and decode entities', () => {
  assert.deepEqual(parseSharedStrings(SHARED), ['ID', '第一階層', '問いトイ', '回答', 'A-1', 'マイナンバー', 'Q & A です。', '答え　<ここ,https://example.go.jp/>\r\nイチ']);
  assert.equal(unescapeXml('&lt;a&gt; &amp; &quot;b&quot; &#10; &#x3042;'), '<a> & "b" \n あ');
});

test('a sheet becomes rows of strings: shared and inline strings, numbers, empty cells and gaps', () => {
  const rows = parseSheet(SHEET, parseSharedStrings(SHARED));
  assert.deepEqual(rows[0], ['ID', '第一階層', '問いトイ', '回答']);
  assert.deepEqual(rows[1], ['A-1', 'マイナンバー', 'Q & A です。', '答え　<ここ,https://example.go.jp/>\r\nイチ', '', '42']);
  assert.deepEqual(rows[2], ['B-2', '', 'Q & A です。']);
});

test('a whole workbook: the first sheet through the ZIP', () => {
  const book = zip([['xl/sharedStrings.xml', SHARED, true], ['xl/worksheets/sheet1.xml', SHEET, true], ['[Content_Types].xml', '<Types/>', false]]);
  const rows = readFirstSheet(book);
  assert.equal(rows.length, 3);
  assert.equal(rows[1][2], 'Q & A です。');
  assert.throws(() => readFirstSheet(zip([['x.txt', 'x', false]])), /no first sheet/);
});

test('the reading stuck on the end is cut off, but a katakana word that is part of the text stays', () => {
  assert.equal(stripReading('政府の活動情報（首相官邸のご案内）セイフカツドウジョウホウ'), '政府の活動情報（首相官邸のご案内）');
  assert.equal(stripReading('ご覧ください。サマ'), 'ご覧ください。', 'two katakana straight after a full stop are a reading');
  assert.equal(stripReading('ご覧くださいサマ'), 'ご覧くださいサマ', 'but elsewhere two are too few to tell from a word');
  assert.equal(stripReading('「マイナンバーカード」について、マイナンバーカード'), '「マイナンバーカード」について、マイナンバーカード', 'a word that is already in the text is a real word');
  assert.equal(stripReading('質問です'), '質問です');
  assert.equal(stripReading(''), '');
  assert.equal(cleanText('  一行目 \r\n\r\n\r\n\r\n二行目。ニギョウメ  '), '一行目\n\n二行目。');
  assert.equal(cleanText(null), '');
});

test('the FAQ is built from the rows: ids, categories in order of appearance, broken rows dropped', () => {
  const rows = [
    ['ID', '第一階層ダイイチ', '問いトイ', '回答カイトウ'],
    ['A-1', '年金ネンキン', 'いつからもらえますか。モライ', '65歳からです。ネンキンサイ'],
    ['A-2', '年金ネンキン', '手続きは？テツヅキ', '窓口へ。マドグチ'],
    ['B-1', '#REF!', '壊れた分類', '答え'],
    ['B-2', '', '空の分類', '答え'],
    ['B-3', '税', '', '答えだけ'],
    ['B-4', '税', '問いだけ', ''],
    ['A-1', '税', '同じ ID', '二つ目'],
    ['EOF', '', '', ''],
  ];
  const faq = buildFaq(rows, { name: 'test' });
  assert.deepEqual(faq.categories, ['年金', 'その他']);
  assert.deepEqual(faq.items, [['A-1', 0, 'いつからもらえますか。', '65歳からです。'], ['A-2', 0, '手続きは？', '窓口へ。'], ['B-1', 1, '壊れた分類', '答え'], ['B-2', 1, '空の分類', '答え']]);
  assert.deepEqual(faq.source, { name: 'test' });
  assert.throws(() => buildFaq([['x', 'y']], {}), /unexpected header/);
  assert.throws(() => buildFaq([], {}), /unexpected header/);
});
