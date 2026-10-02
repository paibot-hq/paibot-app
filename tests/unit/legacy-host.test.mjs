import { test } from 'node:test';
import assert from 'node:assert/strict';
import { legacyRedirect } from '../../src/lib/legacy-host.ts';

test('the old domain redirects to the same path and query on the new one', () => {
  assert.equal(legacyRedirect(new URL('https://paibot.app/ja/math/arith?x=1'), 'https://app.paibot.dev'), 'https://app.paibot.dev/ja/math/arith?x=1');
  assert.equal(legacyRedirect(new URL('https://www.paibot.app/'), 'https://app.paibot.dev'), 'https://app.paibot.dev/');
});

test('the new domain, dev and unknown hosts are not redirected', () => {
  assert.equal(legacyRedirect(new URL('https://app.paibot.dev/ja'), 'https://app.paibot.dev'), null);
  assert.equal(legacyRedirect(new URL('https://app-dev.paibot.dev/ja'), 'https://app-dev.paibot.dev'), null);
  assert.equal(legacyRedirect(new URL('https://example.com/'), 'https://app.paibot.dev'), null);
});

test('no redirect loop when the configured site origin is itself the old domain', () => {
  assert.equal(legacyRedirect(new URL('https://paibot.app/ja'), 'https://paibot.app'), null);
});
