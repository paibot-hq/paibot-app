import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, prepare, search, tokens } from '../../src/lib/search.ts';

const entries = [
  { key: 'tax', kind: 'app', href: '/tax', title: '消費税・割引計算', text: '税抜から税込を計算します', keywords: '消費税 計算 税込 税抜', context: '便利ツール' },
  { key: 'pomodoro', kind: 'app', href: '/pomodoro', title: 'ポモドーロタイマー', text: '集中と休憩をくり返す', keywords: 'ポモドーロ 勉強', context: '日常' },
  { key: 'json', kind: 'app', href: '/json', title: 'JSON整形', text: 'JSONを整形・圧縮します', keywords: 'JSON フォーマット', context: '開発ツール' },
  { key: 'u-fact', kind: 'unit', href: '/math/factorization', title: '因数分解', text: '二次式などの因数分解', keywords: '', context: '数学' },
  { key: 'i-prime', kind: 'item', href: '/math/prime/prime', title: '素因数分解', text: '整数を素数の積にします', keywords: '', context: '数学 › 素数' },
  { key: 'i-calc', kind: 'item', href: '/math/arith/order', title: '計算の順序', text: '四則の計算の順序', keywords: '', context: '数学 › 計算' },
];
const found = (query, limit) => search(prepare(entries), query, limit).map(entry => entry.key);

test('text is compared without regard to width, case or kana', () => {
  assert.equal(normalize('ＪＳＯＮ'), 'json');
  assert.equal(normalize('ポモドーロ'), 'ぽもどーろ');
  assert.equal(normalize('Ｈｅｌｌｏ　Ｗｏｒｌｄ'), 'hello world');
  assert.deepEqual(tokens('  消費税　 計算 '), ['消費税', '計算']);
  assert.deepEqual(tokens('   '), []);
});

test('a word finds the entries that have it, the title first', () => {
  assert.deepEqual(found('消費税'), ['tax']);
  // Both have it in the title, but one title starts with it.
  assert.deepEqual(found('計算'), ['i-calc', 'tax']);
  assert.deepEqual(found('json'), ['json']);
  assert.deepEqual(found('JSON'), ['json']);
});

test('width and kana do not matter', () => {
  assert.deepEqual(found('ＪＳＯＮ'), ['json']);
  assert.deepEqual(found('ぽもどーろ'), ['pomodoro']);
  assert.deepEqual(found('ポモドーロ'), ['pomodoro']);
});

test('every word must match; a word in the title ranks above one in the description', () => {
  assert.deepEqual(found('消費税 計算'), ['tax']);
  assert.deepEqual(found('消費税 ポモドーロ'), []);
  assert.deepEqual(found('分解'), ['u-fact', 'i-prime']);
  assert.equal(found('因数分解')[0], 'u-fact', 'a title that starts with the word ranks first');
});

test('apps come before units, and units before items, when they score alike', () => {
  const same = [
    { key: 'i', kind: 'item', href: '/i', title: '図形', text: '', keywords: '', context: '' },
    { key: 'a', kind: 'app', href: '/a', title: '図形', text: '', keywords: '', context: '' },
    { key: 'u', kind: 'unit', href: '/u', title: '図形', text: '', keywords: '', context: '' },
  ];
  assert.deepEqual(search(prepare(same), '図形').map(entry => entry.key), ['a', 'u', 'i']);
});

test('an empty query finds nothing, a query nobody has finds nothing, and the number of results is limited', () => {
  assert.deepEqual(found(''), []);
  assert.deepEqual(found('zzzz'), []);
  assert.equal(found('数学', 1).length, 1);
  const many = Array.from({ length: 100 }, (_, index) => ({ key: `k${index}`, kind: 'item', href: '/x', title: `項目${index}`, text: '', keywords: '', context: '' }));
  assert.equal(search(prepare(many), '項目').length, 30);
});
