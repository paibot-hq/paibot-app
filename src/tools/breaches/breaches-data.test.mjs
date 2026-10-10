import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { numbersIn, numberForms, validateBreaches } from './breaches-rules.mjs';

const data = JSON.parse(readFileSync(new URL('../../data/breaches.json', import.meta.url), 'utf8'));
const entry = overrides => ({
  id: 'x', date: '2026-10-01', name: 'X', type: 'leak', count: 1000, countNote: '1,000件', data: '', cause: 'c', note: '', verification: 'reported', checkedAt: '2026-10-09',
  sources: [{ name: 'A', url: 'https://a.example/1', kind: 'press' }, { name: 'B', url: 'https://b.example/1', kind: 'press' }], ...overrides,
});
const check = item => validateBreaches({ asOf: '2026-10-09', items: [item] });

test('the incident list keeps its rules', () => {
  assert.deepEqual(validateBreaches(data), []);
});

test('numbers are read as the news writes them', () => {
  assert.deepEqual(numbersIn('約872万4,000件(顧客 約863万1,000件)'), [8724000, 8631000]);
  assert.deepEqual(numbersIn('1,078万8,963件'), [10788963]);
  assert.deepEqual(numbersIn('最大1.4億件'), [140000000]);
  assert.deepEqual(numbersIn('53,866件'), [53866]);
  assert.ok(numberForms(8724000).includes('872万4,000') && numberForms(8724000).includes('8,724,000'));
});

test('an entry that is fine passes', () => {
  assert.deepEqual(check(entry({})), []);
});

test('an entry cannot be published without a source, with a bad link or with a dated future', () => {
  assert.match(check(entry({ sources: [] }))[0], /at least one source/);
  assert.match(check(entry({ sources: [{ name: 'A', url: 'http://a.example/', kind: 'press' }, { name: 'B', url: 'https://b.example/', kind: 'press' }] }))[0], /https/);
  assert.match(check(entry({ date: '2026-11-01' }))[0], /after asOf/);
  assert.match(check(entry({ date: '2026-10-1' }))[0], /YYYY-MM/);
});

test('"reported" needs two different sites; an aggregator does not count; "official" needs an official page', () => {
  assert.match(check(entry({ sources: [{ name: 'A', url: 'https://a.example/1', kind: 'press' }, { name: 'A', url: 'https://a.example/2', kind: 'press' }] }))[0], /different sites/);
  assert.match(check(entry({ sources: [{ name: 'A', url: 'https://a.example/1', kind: 'press' }, { name: 'L', url: 'https://l.example/1', kind: 'aggregator' }] }))[0], /different sites/);
  assert.match(check(entry({ verification: 'official' }))[0], /official/);
  assert.deepEqual(check(entry({ verification: 'official', sources: [{ name: 'Co', url: 'https://co.example/n', kind: 'official' }] })), []);
  assert.match(check(entry({ sources: [{ name: 'Co', url: 'https://co.example/n', kind: 'official' }, { name: 'B', url: 'https://b.example/1', kind: 'press' }] }))[0], /official source but is "reported"/);
});

test('a count has to agree with the words it was taken from', () => {
  assert.match(check(entry({ count: 2000 }))[0], /not found in countNote/);
  assert.match(check(entry({ countNote: '' }))[0], /countNote/);
  assert.deepEqual(check(entry({ count: 8724000, countNote: '約872万4,000件(顧客 約863万1,000件)' })), []);
  assert.match(check(entry({ count: -1 }))[0], /positive integer/);
});

test('ids are unique', () => {
  const problems = validateBreaches({ asOf: '2026-10-09', items: [entry({}), entry({})] });
  assert.ok(problems.some(p => /duplicate id/.test(p)));
});

test('the government advisories need a day that is not in the future, a name, a title and an https link', () => {
  const advisory = { date: '2026-10-09', name: 'N', title: 'T', url: 'https://example.go.jp/a.pdf' };
  const run = advisories => validateBreaches({ asOf: '2026-10-09', items: [entry({})], advisories });
  assert.deepEqual(run([advisory]), []);
  assert.match(run([{ ...advisory, date: '2026-10-10' }])[0], /not after asOf/);
  assert.match(run([{ ...advisory, name: '' }])[0], /name and a title/);
  assert.match(run([{ ...advisory, url: 'http://example.go.jp/a.pdf' }])[0], /https only/);
  assert.deepEqual(validateBreaches({ asOf: '2026-10-09', items: [entry({})] }), [], 'advisories are optional');
});
