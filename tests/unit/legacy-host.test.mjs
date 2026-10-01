import { test } from 'node:test';
import assert from 'node:assert/strict';
import { legacyRedirect } from '../../src/lib/legacy-host.ts';

test('the old domain redirects to the same path and query on the new one', () => {
  assert.equal(legacyRedirect(new URL('https://paibot.app/ja/math/arith?x=1'), 'https://paibot.io'), 'https://paibot.io/ja/math/arith?x=1');
  assert.equal(legacyRedirect(new URL('https://www.paibot.app/'), 'https://paibot.io'), 'https://paibot.io/');
});

test('the new domain, dev and unknown hosts are not redirected', () => {
  assert.equal(legacyRedirect(new URL('https://paibot.io/ja'), 'https://paibot.io'), null);
  assert.equal(legacyRedirect(new URL('https://dev.paibot.io/ja'), 'https://dev.paibot.io'), null);
  assert.equal(legacyRedirect(new URL('https://example.com/'), 'https://paibot.io'), null);
});

test('no redirect loop when the configured site origin is itself the old domain', () => {
  assert.equal(legacyRedirect(new URL('https://paibot.app/ja'), 'https://paibot.app'), null);
});
