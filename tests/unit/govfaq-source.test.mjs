import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAGE, warekiToIso, decodePage, parseSourcePage, fetchSource, sha256, diffFaq, summaryMarkdown } from '../../scripts/lib/govfaq-source.mjs';

// The Ministry's page as it is (Shift_JIS): a <meta> with the charset, the date of the data, one link to the Excel file.
const PAGE_BYTES = Buffer.from('3c68746d6c3e3c686561643e3c6d65746120687474702d65717569763d22436f6e74656e742d547970652220636f6e74656e743d22746578742f68746d6c3b20636861727365743d53686966745f4a4953223e3c7469746c653e476f76626f743c2f7469746c653e3c2f686561643e3c626f64793e3c68313e476f76626f7482cc4641518366815b835e82f08cf68a4a82b582c482a282dc82b73c2f68313e3c703e81a62097df986138944e31308c8e3193fa8e9e935f82cc8fee95f182c582b781423c2f703e3c703e3c6120687265663d222f6d61696e5f636f6e74656e742f3030313039343838322e786c73782220636c6173733d227374795f3031223e4641518366815b835e82f0835f83458393838d815b83688169457863656c8c608eae816a3c2f613e3c2f703e3c2f626f64793e3c2f68746d6c3e', 'hex');

test('an era date becomes a date', () => {
  assert.equal(warekiToIso('令和8年10月1日'), '2026-10-01');
  assert.equal(warekiToIso('令和 8 年 10 月 1 日'), '2026-10-01');
  assert.equal(warekiToIso('令和元年5月1日'), '2019-05-01');
  assert.equal(warekiToIso('平成31年4月30日'), '2019-04-30');
  assert.equal(warekiToIso('令和8年2月30日'), null, 'not a day');
  assert.equal(warekiToIso('2026年10月1日'), null);
  assert.equal(warekiToIso(''), null);
});

test('the page is read as Shift_JIS, from its <meta>, its header or by default', () => {
  assert.match(decodePage(PAGE_BYTES), /令和8年10月1日時点/);
  assert.match(decodePage(PAGE_BYTES, 'text/html; charset=Shift_JIS'), /GovbotのFAQデータ/);
  const bare = Buffer.from(PAGE_BYTES.toString('latin1').replace(/<meta[^>]*>/, ''), 'latin1');
  assert.match(decodePage(bare), /令和8年10月1日時点/, 'Shift_JIS when it says nothing');
  assert.match(decodePage(Buffer.from('<meta charset="utf-8">令和8年', 'utf8')), /令和8年/, 'what it says is believed');
});

test('the Excel file and the date of its data are found on the page', () => {
  assert.deepEqual(parseSourcePage(decodePage(PAGE_BYTES)), { fileUrl: 'https://www.soumu.go.jp/main_content/001094882.xlsx', updated: '2026-10-01' });
  const html = '<p>令和9年4月1日時点の情報です</p><a href="https://example.go.jp/a.xlsx">表（Excel）</a><a href="/x/faq.xlsx?v=2"><span>FAQ</span>データ</a>';
  assert.deepEqual(parseSourcePage(html), { fileUrl: 'https://www.soumu.go.jp/x/faq.xlsx?v=2', updated: '2027-04-01' }, 'the one that mentions the FAQ');
});

test('a page that is not as expected is an error, not a guess', () => {
  const dated = '令和8年10月1日時点';
  assert.throws(() => parseSourcePage(`${dated}<a href="/a.pdf">FAQ</a>`), /found 0/);
  assert.throws(() => parseSourcePage(`${dated}<a href="/a.xlsx">表</a><a href="/b.xlsx">表</a>`), /found 2/);
  assert.throws(() => parseSourcePage(`${dated}<a href="/a.xlsx">FAQ</a><a href="/b.xlsx">FAQ</a>`), /found 2/);
  assert.throws(() => parseSourcePage('<a href="/a.xlsx">FAQ</a>'), /date of the data/);
  assert.throws(() => parseSourcePage('令和8年13月1日時点<a href="/a.xlsx">FAQ</a>'), /date of the data/);
});

test('the page is fetched and an error status is an error', async () => {
  const ok = await fetchSource(async url => { assert.equal(url, PAGE); return new Response(PAGE_BYTES, { headers: { 'content-type': 'text/html' } }); });
  assert.equal(ok.updated, '2026-10-01');
  await assert.rejects(fetchSource(async () => new Response('x', { status: 503 })), /503/);
});

const faq = (items, categories = ['A', 'B']) => ({ categories, items });
test('what changed is told by id', () => {
  const before = faq([['1', 0, 'q1', 'a1'], ['2', 0, 'q2', 'a2'], ['3', 1, 'q3', 'a3']]);
  const after = faq([['1', 0, 'q1', 'a1'], ['2', 0, 'q2', 'a2 new'], ['4', 1, 'q4', 'a4'], ['3', 0, 'q3', 'a3']]);
  const diff = diffFaq(before, after);
  assert.deepEqual(diff.added, [{ id: '4', question: 'q4' }]);
  assert.deepEqual(diff.removed, []);
  assert.deepEqual(diff.changed.map(row => row.id), ['2', '3'], 'an answer, and a category');
  assert.deepEqual([diff.before, diff.total], [3, 4]);
  assert.deepEqual(diffFaq(null, after).added.length, 4);
  assert.deepEqual(diffFaq(after, after), { added: [], removed: [], changed: [], total: 4, before: 4 });
});

test('the summary says the dates, the counts and a few of each kind', () => {
  const rows = Array.from({ length: 12 }, (_, i) => ({ id: `N-${i}`, question: `質問 ${i}` }));
  const text = summaryMarkdown({ diff: { added: rows, removed: [], changed: [{ id: 'C-1', question: '変わった質問' }], before: 100, total: 112 }, source: { updated: '2026-11-01', file: 'https://x/y.xlsx' }, previous: { updated: '2026-10-01' } });
  assert.match(text, /2026-10-01 → 2026-11-01/);
  assert.match(text, /件数: 100 → 112/);
  assert.match(text, /追加 12、削除 0、内容の変更 1/);
  assert.match(text, /### 追加（12件）/);
  assert.match(text, /…ほか 4 件/);
  assert.ok(!text.includes('### 削除'));
  assert.match(text, /C-1: 変わった質問/);
});

test('the hash is the SHA-256 of the file', () => {
  assert.equal(sha256(Buffer.from('abc')), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});
