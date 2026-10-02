import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APP_CATALOG } from '../../src/lib/app-catalog.ts';
import { ownerOfPath, siteOfHost, siteOrigins } from '../../src/lib/sites.ts';

test('the host decides the site; the apex, localhost and unknown hosts are the hub', () => {
  assert.equal(siteOfHost('app.paibot.dev'), 'app');
  assert.equal(siteOfHost('app-dev.paibot.dev'), 'app');
  assert.equal(siteOfHost('learn.paibot.dev'), 'learn');
  assert.equal(siteOfHost('learn.localhost'), 'learn');
  assert.equal(siteOfHost('doc.paibot.dev'), 'doc');
  assert.equal(siteOfHost('network-dev.paibot.dev'), 'network');
  for (const host of ['paibot.dev', 'localhost', '127.0.0.1', 'paibot-app.example.workers.dev']) assert.equal(siteOfHost(host), 'hub');
});

test('every site origin follows from any one of them, keeping the scheme, port and -dev', () => {
  assert.deepEqual(siteOrigins('https://app.paibot.dev'), { hub: 'https://paibot.dev', app: 'https://app.paibot.dev', learn: 'https://learn.paibot.dev', network: 'https://network.paibot.dev', doc: 'https://doc.paibot.dev' });
  assert.equal(siteOrigins('https://app-dev.paibot.dev').learn, 'https://learn-dev.paibot.dev');
  assert.deepEqual(siteOrigins('http://localhost:3038'), { hub: 'http://localhost:3038', app: 'http://app.localhost:3038', learn: 'http://learn.localhost:3038', network: 'http://network.localhost:3038', doc: 'http://doc.localhost:3038' });
  assert.equal(siteOrigins('http://learn.localhost:3038').hub, 'http://localhost:3038');
});

test('math belongs to learn, the tools to app, and the shared pages to nobody', () => {
  assert.equal(ownerOfPath('/math/arith'), 'learn');
  assert.equal(ownerOfPath('/json'), 'app');
  assert.equal(ownerOfPath('/apps'), 'app');
  assert.equal(ownerOfPath('/site-check'), 'network');
  assert.equal(ownerOfPath('/domain.data'), 'network');
  assert.equal(ownerOfPath('/math/arith.data'), 'learn');
  assert.equal(ownerOfPath('/network'), 'app');
  assert.equal(ownerOfPath('/legal/terms'), null);
  assert.equal(ownerOfPath('/about'), null);
  assert.equal(ownerOfPath(''), null);
});

test('every network tool of the catalog belongs to the network site', () => {
  for (const app of APP_CATALOG) if (app.category === 'network' && app.href) assert.equal(ownerOfPath(app.href), 'network', app.slug);
});
