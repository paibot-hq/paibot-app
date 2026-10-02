import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ownerOfPath, siteOfHost, siteOrigins } from '../../src/lib/sites.ts';

test('the host decides the site; the apex, localhost and unknown hosts are the hub', () => {
  assert.equal(siteOfHost('app.paibot.dev'), 'app');
  assert.equal(siteOfHost('app-dev.paibot.dev'), 'app');
  assert.equal(siteOfHost('learn.paibot.dev'), 'learn');
  assert.equal(siteOfHost('learn.localhost'), 'learn');
  assert.equal(siteOfHost('doc.paibot.dev'), 'doc');
  for (const host of ['paibot.dev', 'localhost', '127.0.0.1', 'paibot-app.example.workers.dev']) assert.equal(siteOfHost(host), 'hub');
});

test('every site origin follows from any one of them, keeping the scheme, port and -dev', () => {
  assert.deepEqual(siteOrigins('https://app.paibot.dev'), { hub: 'https://paibot.dev', app: 'https://app.paibot.dev', learn: 'https://learn.paibot.dev', doc: 'https://doc.paibot.dev' });
  assert.equal(siteOrigins('https://app-dev.paibot.dev').learn, 'https://learn-dev.paibot.dev');
  assert.deepEqual(siteOrigins('http://localhost:3038'), { hub: 'http://localhost:3038', app: 'http://app.localhost:3038', learn: 'http://learn.localhost:3038', doc: 'http://doc.localhost:3038' });
  assert.equal(siteOrigins('http://learn.localhost:3038').hub, 'http://localhost:3038');
});

test('math belongs to learn, the tools to app, and the shared pages to nobody', () => {
  assert.equal(ownerOfPath('/math/arith'), 'learn');
  assert.equal(ownerOfPath('/json'), 'app');
  assert.equal(ownerOfPath('/apps'), 'app');
  assert.equal(ownerOfPath('/legal/terms'), null);
  assert.equal(ownerOfPath('/about'), null);
  assert.equal(ownerOfPath(''), null);
});
