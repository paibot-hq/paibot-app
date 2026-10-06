import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fold, terms, queryTerms, buildIndex, search, highlight, parseAnswer, snippet, categoryCounts, toItems, reply, SYNONYMS } from './faq-search.ts';

const categories = ['マイナンバー', '年金', '税', '子育て'];
const entries = [
  ['M-1', 0, 'マイナンバーカードを紛失した場合はどうすればよいですか。', 'すぐにコールセンターへ連絡して、カードの機能を一時停止してください。<コールセンター,https://example.go.jp/call>'],
  ['M-2', 0, 'マイナンバーカードの交付申請書を再発行してほしい場合どうすればよいですか。', 'QRコード付き交付申請書の発行を市区町村窓口にお申し出ください。'],
  ['M-3', 0, 'マイナンバーカードの暗証番号を忘れました。', '市区町村窓口で、暗証番号の初期化を申請してください。'],
  ['M-4', 0, '引っ越したときのマイナンバーカードの手続を教えてください。', '転入届と同時に、カードの住所変更を行ってください。'],
  ['P-1', 1, '国民年金はいつからもらえますか。', '原則として65歳から受け取ることができます。'],
  ['P-2', 1, '年金を受け取るための手続はどうすればよいですか。', '年金事務所に請求書を提出してください。'],
  ['P-3', 1, '年金の保険料を払えないときはどうすればよいですか。', '免除や猶予の制度があります。年金事務所または市区町村にご相談ください。'],
  ['T-1', 2, '確定申告はいつまでですか。', '原則として、毎年3月15日までです。'],
  ['T-2', 2, '所得税とはどんな税ですか。', '個人の1年間の所得にかかる税金です。'],
  ['T-3', 2, 'QRコードで納付できますか。', 'はい。QRコードを使って、コンビニなどで納付できます。'],
  ['K-1', 3, '児童手当はいつ支給されますか。', '毎年2月、4月、6月、8月、10月、12月に支給されます。'],
  ['K-2', 3, '子どもが生まれたときの手続は何がありますか。', '出生届、児童手当の申請、健康保険の加入などがあります。'],
];
const items = toItems({ source: {}, categories, items: entries });
const index = buildIndex(items, categories);
const top = (query, options) => search(index, query, options).map(h => items[h.doc].id);

test('folding keeps the length: full-width to half-width, capitals to small, katakana to hiragana', () => {
  assert.equal(fold('ＱＲコード１２３'), 'qrこーど123');
  assert.equal(fold('マイナンバー'), 'まいなんばー');
  assert.equal([...fold('㈱テスト')].length, [...'㈱テスト'].length, 'a character that would grow is left as it is');
  assert.equal(fold(''), '');
});

test('terms: pairs of characters for Japanese, whole words for letters and digits, a lone character for itself', () => {
  assert.deepEqual(terms('年金の手続'), ['年金', '手続'], 'a particle between words joins them and is not a word');
  assert.deepEqual(terms('qrこーど'), ['qr', 'こー', 'ーど']);
  assert.deepEqual(terms('カードを紛失'), ['かー', 'ーど', '紛失'], 'the カードを is cut at を (katakana next to a particle), 紛失 is left');
  assert.deepEqual(terms('いつからもらえる'), ['いつ', 'つか', 'から', 'らも', 'もら', 'らえ', 'える'], 'plain hiragana pairs all stay');
  assert.deepEqual(terms('税'), ['税']);
  assert.deepEqual(terms('年金、税'), ['年金', '税'], 'punctuation breaks a run');
  assert.deepEqual(terms('abc 12'), ['abc', '12']);
  assert.deepEqual(terms(''), []);
});

test('a question is found by its words, the best match first', () => {
  assert.equal(top('マイナンバーカードを紛失した')[0], 'M-1');
  assert.equal(top('年金はいつからもらえる')[0], 'P-1');
  assert.equal(top('確定申告')[0], 'T-1');
  assert.equal(top('暗証番号を忘れた')[0], 'M-3');
  assert.equal(top('児童手当')[0], 'K-1');
});

test('words that mean the same are found: なくした for 紛失, 引越し for 引っ越し, 子供 for 子ども', () => {
  assert.equal(top('マイナンバーカードをなくした')[0], 'M-1');
  assert.equal(top('マイナンバーカードを落とした')[0], 'M-1');
  assert.ok(top('引越しの手続').includes('M-4'));
  assert.ok(top('子供が生まれた').includes('K-2'));
  assert.ok([...queryTerms('カードをなくした').keys()].includes('紛失'));
  assert.equal(queryTerms('なくした').get('なく'), 0.35, 'a pair of plain hiragana weighs little');
  assert.equal(queryTerms('なくした').get('紛失'), 0.6, 'a synonym weighs 0.6');
  assert.equal(queryTerms('紛失').get('紛失'), 1, 'a word of the query itself weighs 1');
  for (const group of SYNONYMS) assert.ok(group.length >= 2);
});

test('katakana, hiragana, full-width and capitals do not matter', () => {
  assert.equal(top('まいなんばーかーど 紛失')[0], 'M-1');
  assert.ok(['T-3', 'M-2'].includes(top('ＱＲコード')[0]));
  assert.deepEqual(top('QRコード').slice(0, 2).sort(), ['M-2', 'T-3']);
  assert.deepEqual(top('ねんきん'), [], 'a reading in hiragana does not find kanji');
});

test('a category narrows the search; with no match in it, nothing is returned', () => {
  assert.ok(top('手続').every(id => id));
  assert.ok(top('手続', { category: 1 }).every(id => id.startsWith('P-')));
  assert.deepEqual(top('確定申告', { category: 1 }), []);
  assert.ok(top('児童手当はいつ', { category: 3 }).includes('K-1'));
});

test('nothing is found for nonsense, an empty query or a query of marks; a match must share enough of what was asked', () => {
  assert.deepEqual(top(''), []);
  assert.deepEqual(top('   '), []);
  assert.deepEqual(top('？！、。'), []);
  assert.deepEqual(top('ぬるぽがっ'), []);
  assert.deepEqual(top('ぬるぽ年金'), [], 'a word of the FAQ among words that are nowhere in it is not enough');
  assert.ok(top('年金をもらう').length > 0, 'but a query with a pair or two that the FAQ lacks still finds what it shares');
  assert.deepEqual(top('いつ'), [], 'a pair of plain hiragana says too little');
  assert.deepEqual(top('あああああ'), []);
  assert.deepEqual(top('zzzzqqqq'), []);
  const hits = search(index, '年金の保険料を払えない');
  assert.equal(items[hits[0].doc].id, 'P-3');
  assert.ok(hits.every(h => h.coverage >= 0.4));
  assert.ok(hits.every((h, i) => i === 0 || hits[i - 1].score >= h.score), 'best first');
});

test('the number of results can be limited, and a rarer word counts for more than a common one', () => {
  assert.equal(search(index, '手続', { limit: 2 }).length, 2);
  assert.equal(top('年金事務所に請求書')[0], 'P-2');
  assert.ok(top('マイナンバーカード').length >= 4);
});

test('highlighting: the ranges of the question that share a pair with the query, joined where they touch', () => {
  const q = items[0].question;
  const ranges = highlight(q, '紛失した');
  assert.ok(ranges.length >= 1);
  const marked = ranges.map(([a, b]) => [...q].slice(a, b).join(''));
  assert.ok(marked.some(m => m.includes('紛失')));
  assert.deepEqual(highlight('年金', 'ねんきん'), []);
  assert.deepEqual(highlight('年金の手続', '年金の手続'), [[0, 2], [3, 5]], 'the の between is not marked');
  assert.deepEqual(highlight('年金手続', '年金手続'), [[0, 4]], 'pairs that touch are joined');
  assert.deepEqual(highlight('', '年金'), []);
  assert.deepEqual(highlight('なくしました', 'なくした'), [[0, 3], [4, 6]]);
});

test('an answer is parsed into text and links; only http and https addresses become links; the snippet is plain and short', () => {
  assert.deepEqual(parseAnswer('お電話は<コールセンター,https://example.go.jp/call>へ。'), [{ text: 'お電話は' }, { label: 'コールセンター', url: 'https://example.go.jp/call' }, { text: 'へ。' }]);
  assert.deepEqual(parseAnswer('普通の文'), [{ text: '普通の文' }]);
  assert.deepEqual(parseAnswer('<x,javascript:alert(1)>'), [{ text: '<x,javascript:alert(1)>' }], 'not a link');
  assert.deepEqual(parseAnswer(''), []);
  assert.equal(snippet(entries[0][3], 20), 'すぐにコールセンターへ連絡して、カードの…');
  assert.equal(snippet('短い<ここ,https://example.go.jp/>です。※これから先は、外部のサイトに移動します。'), '短いここです。');
  assert.equal(snippet('a\n\n  b'), 'a b');
});

test('a chat reply is the best question as the main answer, some others that come close, and how sure it is', () => {
  const r = reply(index, 'マイナンバーカードを紛失したらどうすればよいですか？');
  assert.equal(r.kind, 'answer');
  assert.equal(r.primary.id, 'M-1');
  assert.ok(r.others.length >= 1 && r.others.length <= 3);
  assert.ok(!r.others.some(o => o.id === r.primary.id), 'the main answer is not repeated among the others');
  assert.equal(r.confidence, 'sure');
  const unsure = reply(index, '手続');
  assert.equal(unsure.kind, 'answer');
  assert.equal(reply(index, '児童手当', { others: 1 }).others.length, 1);
  // The same question in two fields is offered once, and never as an "other" of itself.
  const twin = [...entries, ['M-1b', 3, 'マイナンバーカードを紛失した場合はどうすればよいですか。', '同じ質問の別の回答です。']];
  const twinIndex = buildIndex(toItems({ source: {}, categories, items: twin }), categories);
  const twins = reply(twinIndex, 'マイナンバーカードを紛失したらどうすればよいですか？', { others: 5 });
  assert.equal(twins.kind, 'answer');
  const questions = [twins.primary.question, ...twins.others.map(o => o.question)];
  assert.equal(new Set(questions).size, questions.length, 'no question twice');
  assert.deepEqual(reply(index, 'ぬるぽがっ'), { kind: 'none' });
  assert.deepEqual(reply(index, ''), { kind: 'none' });
});

test('categories are counted, the biggest first', () => {
  const counts = categoryCounts(items, categories);
  assert.deepEqual(counts.map(c => [c.name, c.count]), [['マイナンバー', 4], ['年金', 3], ['税', 3], ['子育て', 2]]);
  assert.deepEqual(categoryCounts([], categories), []);
});
