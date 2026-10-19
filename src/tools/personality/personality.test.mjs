import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ANIMAL_EMOJI, ITEMS, MAX_RAW, MIN_RAW, STANDOUT, TRAITS, animalOf, distributionsFrom, isComplete, isKeptResult, percent, rawScores, topPercent } from './personality.ts';

const all = value => Array(ITEMS.length).fill(value);
// Answers that put one trait at its top (or bottom) and leave the others in the middle.
const only = (trait, high) => ITEMS.map(item => (item.trait === trait ? ((item.key === 1) === high ? 5 : 1) : 3));

test('twenty items, four for each trait, keyed as in the Mini-IPIP', () => {
  assert.equal(ITEMS.length, 20);
  for (const trait of TRAITS) assert.equal(ITEMS.filter(i => i.trait === trait).length, 4, trait);
  const reversed = Object.fromEntries(TRAITS.map(t => [t, ITEMS.filter(i => i.trait === t && i.key === -1).length]));
  assert.deepEqual(reversed, { extraversion: 2, agreeableness: 2, conscientiousness: 2, stability: 2, openness: 3 });
  // The traits take turns, as in the published order.
  assert.deepEqual(ITEMS.slice(0, 5).map(i => i.trait), TRAITS);
});

test('scores add the four items, turning the reversed ones round', () => {
  assert.deepEqual(rawScores(all(3)), Object.fromEntries(TRAITS.map(t => [t, 12])));
  const top = rawScores(only('extraversion', true));
  assert.equal(top.extraversion, MAX_RAW);
  assert.equal(rawScores(only('extraversion', false)).extraversion, MIN_RAW);
  for (const t of TRAITS.filter(t => t !== 'extraversion')) assert.equal(top[t], 12);
  // Agreeing with everything is not "high on everything": the reversed items pull the other way.
  const yes = rawScores(all(5));
  assert.deepEqual(yes, { extraversion: 12, agreeableness: 12, conscientiousness: 12, stability: 12, openness: 8 });
  assert.equal(percent(MIN_RAW), 0);
  assert.equal(percent(12), 50);
  assert.equal(percent(MAX_RAW), 100);
});

test('only full, well-formed answers and scores are taken', () => {
  assert.ok(isComplete(all(1)) && isComplete(all(5)));
  for (const bad of [all(3).slice(1), [...all(3).slice(1), 6], [...all(3).slice(1), 0], [...all(3).slice(1), 2.5]]) assert.ok(!isComplete(bad));
  assert.ok(isKeptResult(rawScores(all(3))));
  assert.ok(!isKeptResult({ ...rawScores(all(3)), openness: 21 }));
  assert.ok(!isKeptResult({ ...rawScores(all(3)), stability: 3 }));
  assert.ok(!isKeptResult({ extraversion: 12 }));
});

test('the animal is the trait that stands out most, high or low; nothing standing out is the penguin', () => {
  const expected = { extraversion: ['dolphin', 'owl'], agreeableness: ['elephant', 'wolf'], conscientiousness: ['beaver', 'cat'], stability: ['turtle', 'rabbit'], openness: ['fox', 'dog'] };
  for (const trait of TRAITS) {
    assert.deepEqual(animalOf(rawScores(only(trait, true))), { animal: expected[trait][0], trait });
    assert.deepEqual(animalOf(rawScores(only(trait, false))), { animal: expected[trait][1], trait });
  }
  assert.deepEqual(animalOf(rawScores(all(3))), { animal: 'penguin', trait: null });
  // Just short of standing out is still balanced.
  const near = { extraversion: 15, agreeableness: 12, conscientiousness: 12, stability: 12, openness: 12 };
  assert.ok(Math.abs(percent(near.extraversion) - 50) < STANDOUT);
  assert.equal(animalOf(near).animal, 'penguin');
  // Every animal has its emoji.
  for (const pair of Object.values(expected)) for (const a of pair) assert.ok(ANIMAL_EMOJI[a]);
});

test('a trait is placed among everyone: the share above plus half the ties', () => {
  const d = distributionsFrom({ extraversion: [{ raw: 10, count: 2 }, { raw: 12, count: 4 }, { raw: 18, count: 4 }, { raw: 99, count: 5 }] }, 10);
  assert.equal(d.counts.extraversion.length, MAX_RAW - MIN_RAW + 1);
  assert.equal(d.counts.extraversion[12 - MIN_RAW], 4);
  assert.deepEqual(d.counts.openness, Array(17).fill(0));
  const bins = d.counts.extraversion;
  assert.equal(topPercent(bins, 18), 20);   // 4 at 18 of 10: half the ties
  assert.equal(topPercent(bins, 12), 60);   // 4 above, 2 of the 4 ties
  assert.equal(topPercent(bins, 10), 90);
  assert.equal(topPercent(bins, 20), 1, 'never 0%');
  assert.equal(topPercent(Array(17).fill(0), 12), 50, 'nobody yet: the middle');
});

test('every item, scale point, trait and animal has its words in all three languages', () => {
  for (const locale of ['ja', 'en', 'zh']) {
    const m = JSON.parse(readFileSync(new URL(`../../../messages/${locale}.json`, import.meta.url), 'utf8')).App.personality;
    for (let n = 1; n <= ITEMS.length; n++) assert.ok(m.items[n]?.trim(), `${locale} item ${n}`);
    for (let n = 1; n <= 5; n++) assert.ok(m.scale[n]?.trim(), `${locale} scale ${n}`);
    for (const t of TRAITS) for (const k of ['name', 'about', 'low', 'high']) assert.ok(m.traits[t]?.[k]?.trim(), `${locale} ${t}.${k}`);
    for (const a of Object.keys(ANIMAL_EMOJI)) for (const k of ['name', 'text']) assert.ok(m.animals[a]?.[k]?.trim(), `${locale} ${a}.${k}`);
  }
});
