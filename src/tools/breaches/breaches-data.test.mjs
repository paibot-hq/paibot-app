import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { numbersIn, numberForms, validateBreaches } from './breaches-rules.mjs';

const data = JSON.parse(readFileSync(new URL('../../data/breaches.json', import.meta.url), 'utf8'));
const entry = overrides => ({
  id: 'x', date: '2026-10-01', name: 'X', type: 'leak', count: 1000, countNote: '1,000件', data: '', cause: 'c', note: '', verification: 'reported', origin: 'attack', checkedAt: '2026-10-09',
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

test('where an incident came from: what is not an attack says why and names the words its sources use; an attack never does; a ransomware or a fraud is an attack', () => {
  const mistake = { origin: 'mistake', originBasis: 'a loss, not an attack', originProof: ['紛失'] };
  assert.deepEqual(check(entry({})), []);
  assert.deepEqual(check(entry(mistake)), []);
  assert.deepEqual(check(entry({ ...mistake, origin: 'insider' })), []);
  assert.match(check(entry({ ...mistake, originBasis: ' ' }))[0], /needs originBasis/);
  assert.match(check(entry({ ...mistake, originProof: [] }))[0], /needs originProof/);
  assert.match(check(entry({ ...mistake, originProof: [''] }))[0], /needs originProof/);
  assert.match(check(entry({ ...mistake, originProof: undefined }))[0], /needs originProof/);
  assert.match(check(entry({ origin: 'attack', originBasis: 'x' }))[0], /only for what is not an attack/);
  assert.match(check(entry({ origin: 'maybe' }))[0], /not one of/);
  assert.match(check(entry({ ...mistake, type: 'ransomware' })).join(), /origin must be attack/);
  assert.match(check(entry({ ...mistake, type: 'fraud' })).join(), /origin must be attack/);
  const kinds = new Set(data.items.map(item => item.origin));
  assert.deepEqual([...kinds].sort(), ['attack', 'insider', 'mistake']);
  assert.ok(data.items.filter(item => item.origin !== 'attack').length >= 10, 'the non-attacks are listed');
});
