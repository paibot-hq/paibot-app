import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectedTools, shardOf } from '../e2e/lib/selected-tools.mjs';

const tools = count => Array.from({ length: count }, (_, i) => ({ slug: `t${i}` }));
const slugs = shares => shares.map(share => share.map(app => app.slug));

test('a few tools all go to the first share, so the other CI jobs need not set up', () => {
  assert.deepEqual(slugs(shardOf(tools(3), 3, () => 1)), [['t0', 't1', 't2'], [], []]);
});

test('more are split by weight: the heavy flows go to different shares, in the catalog order within each', () => {
  const heavy = new Set(['t1', 't2']);
  const shares = shardOf(tools(12), 3, slug => heavy.has(slug) ? 10 : 1);
  const weight = share => share.reduce((sum, app) => sum + (heavy.has(app.slug) ? 10 : 1), 0);
  assert.deepEqual(shares.map(share => share.filter(app => heavy.has(app.slug)).length).sort(), [0, 1, 1]);
  assert.deepEqual(shares.map(weight), [10, 10, 10]);
  for (const share of shares) assert.deepEqual(share, [...share].sort((a, b) => Number(a.slug.slice(1)) - Number(b.slug.slice(1))));
  assert.equal(shares.flat().length, 12);
});

test('every published tool is in exactly one of three shares', () => {
  const all = selectedTools({ tools: 'all' }).map(app => app.slug);
  const shared = [1, 2, 3].flatMap(i => selectedTools({ tools: 'all', shard: `${i}/3` }).map(app => app.slug));
  assert.deepEqual([...shared].sort(), [...all].sort());
  assert.deepEqual(selectedTools({ tools: '', shard: '1/3' }), []);
});
