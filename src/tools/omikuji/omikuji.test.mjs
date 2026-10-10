import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, COLORS, LUCKS, VARIANTS, draw, lineKey, pickLuck } from './fortune.ts';

const seeded = seed => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

test('the chances add up to a hundred, and the best and the worst are the rarest', () => {
  assert.equal(LUCKS.reduce((sum, luck) => sum + luck.weight, 0), 100);
  const weights = Object.fromEntries(LUCKS.map(luck => [luck.id, luck.weight]));
  assert.ok(weights.kyo < weights.suekichi && weights.kyo < weights.daikichi);
});

test('a roll picks the luck by its share, from the best to the worst', () => {
  assert.equal(pickLuck(0).id, 'daikichi');
  assert.equal(pickLuck(0.1499).id, 'daikichi');
  assert.equal(pickLuck(0.15).id, 'kichi');
  assert.equal(pickLuck(0.9399).id, 'suekichi');
  assert.equal(pickLuck(0.94).id, 'kyo');
  assert.equal(pickLuck(0.99999).id, 'kyo');
  assert.equal(pickLuck(1).id, 'kyo', 'even a roll of exactly 1 gives something');
});

test('over many draws each luck comes about as often as it should, and every one comes', () => {
  const rng = seeded(11), counts = {};
  const total = 40000;
  for (let i = 0; i < total; i++) { const { luck } = draw(rng); counts[luck] = (counts[luck] ?? 0) + 1; }
  for (const luck of LUCKS) {
    assert.ok(counts[luck.id] > 0, luck.id);
    assert.ok(Math.abs(counts[luck.id] / total - luck.weight / 100) < 0.012, `${luck.id}: ${counts[luck.id] / total}`);
  }
});

test('a draw has a stick of 1 to 100, a line of each kind, a colour and a number of 1 to 99; the same roll gives the same draw', () => {
  const rng = seeded(5);
  for (let i = 0; i < 2000; i++) {
    const fortune = draw(rng);
    assert.ok(Number.isInteger(fortune.stick) && fortune.stick >= 1 && fortune.stick <= 100);
    assert.ok(Number.isInteger(fortune.number) && fortune.number >= 1 && fortune.number <= 99);
    assert.ok(COLORS.includes(fortune.color));
    assert.deepEqual(Object.keys(fortune.lines), [...CATEGORIES]);
    for (const category of CATEGORIES) assert.ok(VARIANTS.includes(fortune.lines[category]));
    assert.equal(fortune.tone, LUCKS.find(luck => luck.id === fortune.luck).tone);
  }
  assert.deepEqual(draw(seeded(9)), draw(seeded(9)));
  assert.notDeepEqual(draw(seeded(9)), draw(seeded(10)));
});

test('the extremes of the generator still give a draw', () => {
  for (const value of [0, 0.999999999]) {
    const fortune = draw(() => value);
    assert.ok(fortune.stick >= 1 && fortune.stick <= 100 && fortune.number >= 1 && fortune.number <= 99);
  }
});

test('the key of a line is the one in the messages', () => {
  assert.equal(lineKey('wish', 'good', 'a'), 'lines.wish.good.a');
});

import { readFileSync } from 'node:fs';

test('every word the page asks for is in the messages of all three languages', () => {
  const text = (value, where) => assert.ok(typeof value === 'string' && value.trim().length > 0, `${where} is a text`);
  for (const locale of ['ja', 'en', 'zh']) {
    const messages = JSON.parse(readFileSync(new URL(`../../../messages/${locale}.json`, import.meta.url), 'utf8')).App.omikuji;
    for (const luck of LUCKS) text(messages.luck[luck.id], `${locale} luck.${luck.id}`);
    for (const color of COLORS) text(messages.color[color], `${locale} color.${color}`);
    for (const category of CATEGORIES) {
      text(messages.category[category], `${locale} category.${category}`);
      for (const tone of ['good', 'mid', 'bad']) for (const variant of VARIANTS) {
        const key = lineKey(category, tone, variant);
        text(key.split('.').reduce((node, part) => node?.[part], messages), `${locale} ${key}`);
      }
    }
    for (const key of ['title', 'description', 'about', 'keywords', 'intro', 'prompt', 'shaking', 'stickOut', 'result', 'number', 'luckyColor', 'luckyNumber', 'again', 'share', 'copied', 'shareText', 'note', 'boxText', 'boxLabel']) text(messages[key], `${locale} ${key}`);
  }
});
