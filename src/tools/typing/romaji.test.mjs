import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advance, keyCount, parse, start } from './romaji.ts';

// Types a whole string, returning where it ends: { ok: every key was accepted, done: the word is finished }.
function type(word, keys) {
  const units = parse(word);
  assert.ok(units, `${word} can be typed`);
  let typed = '';
  let last = { ok: true, done: false };
  for (const key of keys) {
    last = advance(units, typed, key);
    if (!last.ok) return { ok: false, done: false, at: typed };
    typed = last.typed;
  }
  return { ok: true, done: last.done, at: typed };
}
const accepts = (word, keys) => { const r = type(word, keys); return r.ok && r.done; };
const refuses = (word, keys) => { const r = type(word, keys); return !(r.ok && r.done); };

test('the same sound typed several ways: し, ち, つ, ふ, じ', () => {
  for (const keys of ['si', 'shi', 'ci']) assert.ok(accepts('し', keys), keys);
  for (const keys of ['ti', 'chi']) assert.ok(accepts('ち', keys), keys);
  for (const keys of ['tu', 'tsu']) assert.ok(accepts('つ', keys), keys);
  for (const keys of ['hu', 'fu']) assert.ok(accepts('ふ', keys), keys);
  for (const keys of ['zi', 'ji']) assert.ok(accepts('じ', keys), keys);
  assert.ok(accepts('さくら', 'sakura'));
  assert.ok(accepts('すし', 'susi') && accepts('すし', 'sushi'));
});

test('a word is only done when finished, and a wrong key is refused', () => {
  assert.equal(type('さくら', 'saku').done, false);
  assert.equal(type('さくら', 'sakx').ok, false);
  assert.ok(refuses('さくら', 'sakurax'));
  assert.ok(refuses('し', 'sh'), 'sh alone is not yet し');
  assert.ok(refuses('し', 'sha'));
});

test('a small っ doubles the next consonant, or is typed on its own', () => {
  for (const keys of ['kappa', 'kaltupa', 'kaxtupa']) assert.ok(accepts('かっぱ', keys), keys);
  assert.ok(accepts('きっと', 'kitto') && accepts('きっと', 'kiltuto'));
  assert.ok(accepts('まっちゃ', 'matcha') && accepts('まっちゃ', 'maccha') && accepts('まっちゃ', 'mattya'));
  assert.ok(accepts('いっしょ', 'issyo') && accepts('いっしょ', 'issho'));
  // Before a vowel or ん, only the small tsu typed on its own.
  assert.ok(accepts('あっあ', 'altua') && refuses('あっあ', 'aaa'));
  assert.ok(refuses('いっな', 'innna'));
});

test('ん is n or nn, and a lone n only before a consonant', () => {
  assert.ok(accepts('かんじ', 'kanji') && accepts('かんじ', 'kannji') && accepts('かんじ', 'kanzi'));
  assert.ok(accepts('かんい', 'kanni') && accepts('かんい', 'kaxni'), 'before a vowel, n alone would read as に');
  assert.ok(refuses('かんい', 'kani'));
  assert.ok(accepts('こんや', 'konnya'), 'nn + ya');
  assert.ok(refuses('こんや', 'konya'), 'n + ya would be にゃ');
  assert.ok(accepts('こんな', 'konnna') && refuses('こんな', 'kona'));
  // At the end of a word: nn (or xn), not a lone n.
  assert.ok(accepts('ほん', 'honn') && accepts('ほん', 'hoxn'));
  assert.ok(refuses('ほん', 'hon'));
  assert.ok(accepts('んー', 'nn-'));
});

test('sounds with a small ゃ ゅ ょ, and those made with a small vowel', () => {
  for (const keys of ['kya', 'kilya', 'kixya']) assert.ok(accepts('きゃ', keys), keys);
  for (const keys of ['sya', 'sha', 'silya']) assert.ok(accepts('しゃ', keys), keys);
  for (const keys of ['cha', 'tya', 'cya']) assert.ok(accepts('ちゃ', keys), keys);
  for (const keys of ['ja', 'zya', 'jya']) assert.ok(accepts('じゃ', keys), keys);
  assert.ok(accepts('ふぁ', 'fa') && accepts('ふぁ', 'fula') && accepts('ふぁ', 'fuxa'));
  assert.ok(accepts('てぃ', 'thi') && accepts('てぃ', 'teli'));
  assert.ok(accepts('りょこう', 'ryokou'));
});

test('the long vowel mark, punctuation and a space', () => {
  assert.ok(accepts('らーめん', 'ra-menn'));
  assert.ok(accepts('おはよう。', 'ohayou.'));
  assert.ok(accepts('はい、いいえ', 'hai,iie'));
});

test('a word with a kana that cannot be typed is not taken', () => {
  assert.equal(parse('さくらX'), null);
  assert.equal(parse('漢字'), null);
});

test('the keys that would be accepted next, and what to show of the word', () => {
  const units = parse('しんぶん');
  let p = advance(units, '', 's');
  assert.deepEqual([...p.next].sort(), ['h', 'i'], 'si or shi');
  p = advance(units, p.typed, 'h');
  assert.deepEqual(p.next, ['i']);
  assert.equal(p.shown, 'shinbunn', 'the way typed so far, then the shortest for the rest (ん before a consonant is one n)');
  // Typed "shin": the next ん can be one more n typed, so b or n.
  p = advance(units, 'shi', 'n');
  assert.ok(p.next.includes('b') && p.next.includes('n'));
});

test('how many keys the shortest way takes', () => {
  assert.equal(keyCount('さくら'), 6);
  assert.equal(keyCount('かっぱ'), 5);      // kappa
  assert.equal(keyCount('しんぶん'), 7);    // sinbunn: ん before a consonant is one n, at the end two
  assert.equal(keyCount('きゃく'), 5);      // kyaku
  assert.equal(keyCount('らーめん'), 7);    // ra-menn
});

// Following the way shown for the rest of a word, key by key, always finishes it.
test('typing what is shown always finishes the word', () => {
  const words = ['さくら', 'かっぱ', 'しんぶん', 'こんにちは', 'きゃっちぼーる', 'ふぁいる', 'うぇぶさいと', 'ほっかいどう', 'じゅうたん', 'ちょっと', 'らーめん', 'ばんざい', 'あんない', 'おんがく', 'しんかんせん', 'いっぱい'];
  for (const word of words) {
    const units = parse(word);
    let typed = '', shown = start(units).shown, last = { done: false };
    for (let guard = 0; guard < 80 && !last.done; guard++) {
      const key = shown[typed.length];
      assert.ok(key, `${word}: nothing left to type after ${typed}`);
      last = advance(units, typed, key);
      assert.ok(last.ok, `${word}: ${typed} + ${key}`);
      typed = last.typed; shown = last.shown;
    }
    assert.ok(last.done, `${word} finished by ${typed}`);
    assert.equal(typed.length, keyCount(word), `${word}: the shortest way is what is shown`);
  }
});


test('the way shown before typing is the shortest', () => {
  assert.equal(start(parse('かっぱ')).shown, 'kappa');
  assert.equal(start(parse('しんぶん')).shown, 'sinbunn');
  assert.equal(start(parse('ちょっと')).shown.length, keyCount('ちょっと'));
});
