import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayOf, firstDay, isBot, isEntrance, toolOf } from '../../src/lib/tool-ranking.ts';

test('a view is counted for the tool whose page it is, in any language, loaded whole or by the client router', () => {
  const cases = {
    '/ja/noise': 'noise', '/en/noise.data': 'noise', '/zh/iq-test': 'iq-test', '/ja/reaction/': 'reaction',
    '/en/math/arith/order-of-operations': 'math', '/ja/math/arith.data': 'math',
  };
  for (const [path, slug] of Object.entries(cases)) assert.equal(toolOf(path), slug, path);
});

test('the top page, site pages, private pages, files, the API and other languages are no tool', () => {
  for (const path of ['/', '/ja', '/ja.data', '/en/about', '/ja/ranking', '/ja/diary', '/ja/no-such-tool', '/api/quiz', '/sitemap.xml', '/silence.wav', '/ja/noise.png', '/fr/noise']) {
    assert.equal(toolOf(path), null, path);
  }
});

test('crawlers, previews, headless browsers and scripts are not counted; people are', () => {
  for (const ua of ['Mozilla/5.0 (compatible; Googlebot/2.1)', 'Twitterbot/1.0', 'Mozilla/5.0 HeadlessChrome/140.0', 'curl/8.4', 'python-requests/2', 'undici', 'node', 'Wget/1.21', '']) assert.ok(isBot(ua), ua);
  for (const ua of ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1', 'Mozilla/5.0 (Windows NT 10.0) Chrome/141.0 Safari/537.36']) assert.ok(!isBot(ua), ua);
});

test('a visit is counted at its entrance from outside the site, not on the pages it moves through', () => {
  const origin = 'https://paibot.app';
  const navigate = (site, referer) => new Headers({ 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Site': site, ...(referer ? { Referer: referer } : {}) });
  // a search result, a link on another site, a bookmark, a typed address
  assert.equal(isEntrance('/ja/math/addition/carry', navigate('cross-site', 'https://www.google.com/'), origin), true);
  assert.equal(isEntrance('/ja/clock', navigate('none'), origin), true);
  assert.equal(isEntrance('/ja/json', navigate('cross-site', 'https://paibot.dev/ja/git-worktree/'), origin), true);
  // the client router's fetch, an in-site link, and a reload are the same visit
  assert.equal(isEntrance('/ja/math/arith.data', new Headers({ 'Sec-Fetch-Mode': 'cors', 'Sec-Fetch-Site': 'same-origin' }), origin), false);
  assert.equal(isEntrance('/ja/math/arith', navigate('same-origin', 'https://paibot.app/ja/apps'), origin), false);
  assert.equal(isEntrance('/ja/math/arith', navigate('same-site', 'https://www.paibot.app/'), origin), false);
  // a script's fetch is not a page, even from outside
  assert.equal(isEntrance('/ja/json', new Headers({ 'Sec-Fetch-Mode': 'cors', 'Sec-Fetch-Site': 'none' }), origin), false);
  // older browsers send no Sec-Fetch-*: the referrer decides
  assert.equal(isEntrance('/ja/json', new Headers(), origin), true);
  assert.equal(isEntrance('/ja/json', new Headers({ Referer: 'https://paibot.app/ja' }), origin), false);
  assert.equal(isEntrance('/ja/json', new Headers({ Referer: 'https://example.com/' }), origin), true);
});

test('a day is the date in Japan, and the last seven days include today', () => {
  assert.equal(dayOf(new Date('2026-10-19T14:59:00Z')), '2026-10-19');
  assert.equal(dayOf(new Date('2026-10-19T15:00:00Z')), '2026-10-20', 'midnight in Japan');
  assert.equal(firstDay(new Date('2026-10-19T05:00:00Z'), 7), '2026-10-13');
  assert.equal(firstDay(new Date('2026-10-19T05:00:00Z'), 1), '2026-10-19');
});

import { places } from '../../src/lib/rank.ts';

test('ties share a place and the next place skips', () => {
  assert.deepEqual(places([5, 4, 4, 4, 3, 0, 0]), [1, 2, 2, 2, 5, 6, 6]);
  assert.deepEqual(places([]), []);
});
