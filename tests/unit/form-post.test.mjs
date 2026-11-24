import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFormPost } from '../../src/lib/form-post.server.ts';

test('readFormPost rejects non-POST methods with 405', async () => {
  const res = await readFormPost(new Request('https://paibot.app/ja/domain', { method: 'GET' }));
  assert.deepEqual(res, { ok: false, status: 405 });
});

test('readFormPost rejects missing or cross-origin Origin headers with 403', async () => {
  const noOrigin = await readFormPost(new Request('https://paibot.app/ja/domain', { method: 'POST' }));
  assert.deepEqual(noOrigin, { ok: false, status: 403 });

  const crossOrigin = await readFormPost(new Request('https://paibot.app/ja/domain', {
    method: 'POST',
    headers: { Origin: 'https://evil.example', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'domain=example.com',
  }));
  assert.deepEqual(crossOrigin, { ok: false, status: 403 });
});

test('readFormPost returns 400 on malformed or non-form bodies', async () => {
  const res = await readFormPost(new Request('https://paibot.app/ja/domain', {
    method: 'POST',
    headers: { Origin: 'https://paibot.app', 'Content-Type': 'application/json' },
    body: '{"domain":"example.com"}',
  }));
  assert.deepEqual(res, { ok: false, status: 400 });
});

test('readFormPost parses valid same-origin form POSTs', async () => {
  const res = await readFormPost(new Request('https://paibot.app/ja/domain', {
    method: 'POST',
    headers: { Origin: 'https://paibot.app', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'domain=example.com',
  }));
  assert.equal(res.ok, true);
  if (res.ok) assert.equal(res.form.get('domain'), 'example.com');
});
