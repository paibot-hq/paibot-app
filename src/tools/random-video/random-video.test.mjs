import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BATCH, KNOWN, batchQuery, batchUrl, isVideoId, parseBatch, randomOffset, shuffle } from './random-video.ts';

const binding = (id, item, label, description) => ({
  id: { value: id }, item: { value: `http://www.wikidata.org/entity/${item}` },
  ...(label === undefined ? {} : { itemLabel: { value: label } }), ...(description === undefined ? {} : { itemDescription: { value: description } }),
});

test('a YouTube video ID is eleven URL-safe characters', () => {
  for (const id of ['dQw4w9WgXcQ', 'TU--X0pC12o', '_CMBCfxN1lU']) assert.ok(isVideoId(id), id);
  for (const id of ['dQw4w9WgXc', 'dQw4w9WgXcQQ', 'dQw4w9WgX/Q', '', 'https://you']) assert.ok(!isVideoId(id), id);
});

test('a batch is fifty from a place in the list, named in the page language first', () => {
  const query = batchQuery(1234.7, 'ja');
  assert.match(query, /wdt:P1651/);
  assert.match(query, /OFFSET 1234 LIMIT 50/);
  assert.match(query, /wikibase:language "ja,en,mul"/);
  assert.match(batchQuery(0, 'zh'), /"zh,en,mul"/);
  assert.match(batchQuery(0, 'xx'), /"en,mul"/, 'an unknown language falls back to English');
  assert.match(batchQuery(-5, 'en'), /OFFSET 0 /);
  const url = new URL(batchUrl(10, 'en'));
  assert.equal(url.origin + url.pathname, 'https://query.wikidata.org/sparql');
  assert.equal(url.searchParams.get('format'), 'json');
  assert.match(url.searchParams.get('query'), /OFFSET 10 LIMIT 50/);
});

test('random places leave room for a whole batch', () => {
  assert.equal(randomOffset(() => 0), 0);
  assert.ok(randomOffset(() => 0.999999) <= KNOWN - BATCH);
});

test('the answer becomes videos: each ID once, bad ones left out, a missing name shown as the Q-number', () => {
  const videos = parseBatch({ results: { bindings: [
    binding('QwqmJilXxJY', 'Q1', 'チルドレン', 'ロバート・マイルズのシングル'),
    binding('QwqmJilXxJY', 'Q1', 'チルドレン'),
    binding('not-an-id', 'Q2', 'Broken'),
    binding('CXH5yL8bDbU', 'Q3'),
    { id: { value: 'Yyx0NFjVzEk' }, item: { value: 'nonsense' } },
  ] } });
  assert.deepEqual(videos, [
    { id: 'QwqmJilXxJY', item: 'Q1', title: 'チルドレン', description: 'ロバート・マイルズのシングル' },
    { id: 'CXH5yL8bDbU', item: 'Q3', title: 'Q3', description: '' },
  ]);
  for (const nothing of [null, {}, { results: {} }, 'oops']) assert.deepEqual(parseBatch(nothing), []);
});

test('shuffling keeps every video', () => {
  const items = Array.from({ length: 20 }, (_, i) => i);
  let seed = 1;
  const next = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const mixed = shuffle(items, next);
  assert.deepEqual([...mixed].sort((a, b) => a - b), items);
  assert.notDeepEqual(mixed, items);
});

import { MAX_KEYWORD, SEARCH_LIMIT, searchQuery, searchUrl, tidyKeyword } from './random-video.ts';

test('a keyword is tidied to one short line', () => {
  assert.equal(tidyKeyword('  jazz\n  piano\t '), 'jazz piano');
  assert.equal(tidyKeyword('x'.repeat(100)).length, MAX_KEYWORD);
});

test('a keyword searches the items with a YouTube video ID, and cannot break out of the query', () => {
  const query = searchQuery('ビートルズ', 'ja');
  assert.match(query, /mwapi:srsearch "haswbstatement:P1651 ビートルズ"/);
  assert.match(query, new RegExp(`wikibase:limit ${SEARCH_LIMIT}`));
  assert.match(query, /\?item wdt:P1651 \?id/);
  assert.match(query, /"ja,en,mul"/);
  // Quotes and backslashes stay inside the string.
  const sneaky = searchQuery('a" } ; DROP \\ "', 'en');
  assert.match(sneaky, /srsearch "haswbstatement:P1651 a\\" } ; DROP \\\\ \\""/);
  const url = new URL(searchUrl('cat', 'en'));
  assert.match(url.searchParams.get('query'), /P1651 cat"/);
});
