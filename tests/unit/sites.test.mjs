import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APP_CATALOG } from '../../src/lib/app-catalog.ts';
import { ownerOfPath, sharedCookieDomain, siteOfHost, siteOrigins } from '../../src/lib/sites.ts';

test('the host decides the site; the apex, localhost and unknown hosts are the hub', () => {
  assert.equal(siteOfHost('app.paibot.dev'), 'app');
  assert.equal(siteOfHost('app-dev.paibot.dev'), 'app');
  assert.equal(siteOfHost('learn.paibot.dev'), 'learn');
  assert.equal(siteOfHost('learn.localhost'), 'learn');
  assert.equal(siteOfHost('doc.paibot.dev'), 'doc');
  assert.equal(siteOfHost('tools-dev.paibot.dev'), 'tools');
  for (const host of ['paibot.dev', 'localhost', '127.0.0.1', 'paibot-app.example.workers.dev']) assert.equal(siteOfHost(host), 'hub');
});

test('every site origin follows from any one of them, keeping the scheme, port and -dev', () => {
  assert.deepEqual(siteOrigins('https://app.paibot.dev'), { hub: 'https://paibot.dev', app: 'https://app.paibot.dev', learn: 'https://learn.paibot.dev', tools: 'https://tools.paibot.dev', doc: 'https://doc.paibot.dev' });
  assert.equal(siteOrigins('https://app-dev.paibot.dev').learn, 'https://learn-dev.paibot.dev');
  assert.deepEqual(siteOrigins('http://localhost:3038'), { hub: 'http://localhost:3038', app: 'http://app.localhost:3038', learn: 'http://learn.localhost:3038', tools: 'http://tools.localhost:3038', doc: 'http://doc.localhost:3038' });
  assert.equal(siteOrigins('http://learn.localhost:3038').hub, 'http://localhost:3038');
});

test('math belongs to learn, the tools to app, and the shared pages to nobody', () => {
  assert.equal(ownerOfPath('/math/arith'), 'learn');
    assert.equal(ownerOfPath('/apps'), 'app');
  assert.equal(ownerOfPath('/site-check'), 'tools');
  assert.equal(ownerOfPath('/json'), 'tools');
  assert.equal(ownerOfPath('/password'), 'app');
  assert.equal(ownerOfPath('/diary'), 'app');
  assert.equal(ownerOfPath('/arith'), 'learn');
  assert.equal(ownerOfPath('/study'), null);
  assert.equal(ownerOfPath('/dev'), null);
  assert.equal(ownerOfPath('/quiz'), 'app');
  assert.equal(ownerOfPath('/domain.data'), 'tools');
  assert.equal(ownerOfPath('/math/arith.data'), 'learn');
  assert.equal(ownerOfPath('/legal/terms'), null);
  assert.equal(ownerOfPath('/about'), null);
  assert.equal(ownerOfPath(''), null);
});

test('each catalog tool belongs to the site of its category', () => {
  const site = { network: 'tools', dev: 'tools', study: 'learn' };
  for (const app of APP_CATALOG) if (app.href) assert.equal(ownerOfPath(app.href), site[app.category] ?? 'app', app.slug);
});

test('a cookie shared by the sites is set on the parent domain, and not where browsers refuse it', () => {
  for (const host of ['paibot.dev', 'app.paibot.dev', 'learn-dev.paibot.dev', 'tools.paibot.dev']) assert.equal(sharedCookieDomain(host), '.paibot.dev', host);
  for (const host of ['localhost', 'app.localhost', 'learn.localhost', '127.0.0.1']) assert.equal(sharedCookieDomain(host), null, host);
});

test('the development hub is dev.<root>, beside app-dev, learn-dev and tools-dev', () => {
  assert.equal(siteOfHost('dev.paibot.dev'), 'hub');
  for (const origin of ['https://dev.paibot.dev', 'https://app-dev.paibot.dev', 'https://learn-dev.paibot.dev']) {
    assert.deepEqual(siteOrigins(origin), { hub: 'https://dev.paibot.dev', app: 'https://app-dev.paibot.dev', learn: 'https://learn-dev.paibot.dev', tools: 'https://tools-dev.paibot.dev', doc: 'https://doc-dev.paibot.dev' }, origin);
  }
  assert.equal(sharedCookieDomain('dev.paibot.dev'), '.paibot.dev');
  assert.equal(sharedCookieDomain('app-dev.paibot.dev'), '.paibot.dev');
});
