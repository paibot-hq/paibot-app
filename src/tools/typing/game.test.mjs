import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BINS, MAX_SCORE, accuracy, binOf, distributionFrom, isKeptResult, isMode, keysPerSecond, rank, score, stageOf, topPercent } from './game.ts';
import { EN_LONG, EN_MEDIUM, EN_SHORT, LONG, MEDIUM, SHORT, pool, poolFor } from './words.ts';
import { advance, keyCount, parse, parseEnglish, start } from './romaji.ts';

test('the score is the keys typed right less the misses, never below 0', () => {
  assert.equal(score({ keys: 300, misses: 0, words: 40 }), 300);
  assert.equal(score({ keys: 300, misses: 20, words: 40 }), 280);
  assert.equal(score({ keys: 10, misses: 30, words: 1 }), 0);
});

test('accuracy and speed', () => {
  assert.equal(accuracy({ keys: 90, misses: 10, words: 5 }), 0.9);
  assert.equal(accuracy({ keys: 0, misses: 0, words: 0 }), 0);
  assert.equal(keysPerSecond(300), 5);
  assert.equal(keysPerSecond(247), 4.1);
});

test('ranks go up with the score', () => {
  assert.deepEqual([0, 119, 120, 219, 220, 319, 320, 449, 450, 900].map(rank), ['D', 'D', 'C', 'C', 'B', 'B', 'A', 'A', 'S', 'S']);
});

test('only plausible results are kept', () => {
  assert.ok(isKeptResult(280, 300, 20) && isKeptResult(0, 5, 9) && isKeptResult(MAX_SCORE, MAX_SCORE, 0));
  for (const [s, k, m] of [[-1, 10, 0], [10, 0, 0], [300, 200, 0], [1001, 1001, 0], [10.5, 20, 1], ['280', 300, 20], [5, 10, -1]]) assert.ok(!isKeptResult(s, k, m), `${s} ${k} ${m}`);
});

test('scores fall into bins of 20, the last holding the most', () => {
  assert.equal(BINS, 51);
  assert.deepEqual([0, 19, 20, 299, 1000, 5000, -3].map(binOf), [0, 0, 1, 14, 50, 50, 0]);
  const d = distributionFrom([{ bin: 14, count: 3 }, { bin: 14.6, count: 2 }, { bin: 99, count: 1 }]);
  assert.equal(d.counts.length, BINS);
  assert.equal(d.counts[14], 5);
  assert.equal(d.counts[50], 1);
  assert.equal(d.total, 6);
});

test('the top percentage counts the better scores and this one, and is never 0% or over 100%', () => {
  assert.equal(topPercent(0, 1, 1), 100, 'alone');
  assert.equal(topPercent(0, 1, 200), 1, 'the best of 200');
  assert.equal(topPercent(49, 2, 100), 50, 'level with another: the same place');
  assert.equal(topPercent(99, 1, 100), 100, 'the last');
  assert.equal(topPercent(5, 0, 0), 100, 'never over 100%');
});

test('the words get longer as the round goes on', () => {
  assert.deepEqual([0, 5, 6, 13, 14, 40].map(stageOf), [0, 0, 1, 1, 2, 2]);
  assert.ok(pool(0).every(w => SHORT.includes(w)));
  assert.ok(pool(2).every(w => MEDIUM.includes(w) || LONG.includes(w)));
});

test('every word can be typed, its kana really are kana, and none is long enough to take more than a quarter of a round', () => {
  const seen = new Set();
  for (const word of [...SHORT, ...MEDIUM, ...LONG]) {
    assert.ok(parse(word.kana), `${word.text} (${word.kana}) can be typed`);
    assert.ok(/^[ぁ-ゖー、。]+$/.test(word.kana), `${word.text}: ${word.kana}`);
    assert.ok(keyCount(word.kana) >= 3 && keyCount(word.kana) <= 60, `${word.text}: ${keyCount(word.kana)} keys`);
    assert.ok(!seen.has(word.kana), `${word.kana} twice`);
    seen.add(word.kana);
  }
  assert.ok(SHORT.length >= 25 && MEDIUM.length >= 25 && LONG.length >= 10);
});

test('every message the game shows is in all three languages', () => {
  const keys = ['title', 'description', 'about', 'keywords', 'intro', 'introEn', 'mode', 'ruleEn1', 'ruleEn3', 'playHintEn', 'rule1', 'rule2', 'rule3', 'start', 'best', 'left', 'words', 'score', 'again', 'shareText', 'shareTextPlain', 'chartTitle', 'top'];
  for (const locale of ['ja', 'en', 'zh']) {
    const m = JSON.parse(readFileSync(new URL(`../../../messages/${locale}.json`, import.meta.url), 'utf8')).App.typing;
    for (const key of keys) assert.ok(m[key]?.trim(), `${locale}.${key}`);
  }
});

test('the modes are Japanese and English, and nothing else is taken', () => {
  assert.ok(isMode('ja') && isMode('en'));
  for (const mode of ['zh', '', null, undefined, 'JA', 1]) assert.ok(!isMode(mode), String(mode));
});

test('English text is typed letter by letter, capitals as lower case, and the shown way is the text itself', () => {
  const units = parseEnglish('The quick fox');
  assert.ok(units);
  let typed = '', last = { done: false };
  for (const key of 'the quick fox') { last = advance(units, typed, key); assert.ok(last.ok, `${typed}+${key}`); typed = last.typed; }
  assert.ok(last.done);
  assert.equal(start(units).shown, 'the quick fox');
  assert.ok(!advance(units, 'th', 'x').ok, 'a wrong letter is refused');
  assert.equal(parseEnglish('caf\u00e9'), null);
  assert.equal(parseEnglish('say "hi"'), null);
});

test('every English word can be typed with the keys the game reads, and the pools grow with the stage', () => {
  const seen = new Set();
  for (const word of [...EN_SHORT, ...EN_MEDIUM, ...EN_LONG]) {
    assert.ok(parseEnglish(word.text), word.text);
    assert.ok(/^[a-z .,'?!-]+$/.test(word.text), word.text);
    assert.ok(word.text.length >= 4 && word.text.length <= 70, word.text);
    assert.ok(!seen.has(word.text), `${word.text} twice`);
    seen.add(word.text);
  }
  assert.ok(EN_SHORT.length >= 25 && EN_MEDIUM.length >= 25 && EN_LONG.length >= 10);
  assert.ok(poolFor('en', 0).every(w => EN_SHORT.includes(w)));
  assert.ok(poolFor('en', 2).every(w => EN_MEDIUM.includes(w) || EN_LONG.includes(w)));
  assert.deepEqual(poolFor('ja', 1), pool(1));
});
