import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { configureAccess } from './lib/access.mjs';

const base = process.env.CHECK_BROWSER_BASE_URL ?? 'http://localhost:3002';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ permissions: ['clipboard-read', 'clipboard-write'], serviceWorkers: 'block' });
  await configureAccess(page, base);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // Deterministic protocol results; this tests UI behavior, not runner IPv6 connectivity.
  await page.route('https://ipv4.icanhazip.com/**', route => route.fulfill({ body: '192.0.2.10\n', headers: { 'Access-Control-Allow-Origin': '*' } }));
  await page.route('https://ipv6.icanhazip.com/**', route => route.fulfill({ body: '2001:db8::10\n', headers: { 'Access-Control-Allow-Origin': '*' } }));
  const main = page.locator('main');
  async function go(slug) {
    const res = await page.goto(`${base}/en/${slug}`);
    assert.equal(res.status(), 200, slug);
    assert.equal(new URL(page.url()).pathname, `/en/${slug}`);
    await page.waitForFunction(() => document.documentElement.dataset.theme);
    await main.locator('h1').waitFor();
  }
  async function result(text) {
    await page.waitForFunction(expected => [...document.querySelectorAll('main [aria-live]')].some(el => el.textContent === expected), text);
  }
  await go('wc');
  await main.locator('textarea').fill('Aあ😀');
  await result('3');
  console.log('PASS: character count');
  for (const [slug, input, encoded, decode] of [
    ['base64', 'あ😀', Buffer.from('あ😀').toString('base64'), 'Base64 → Text'],
    ['urlencode', 'あ /?&', encodeURIComponent('あ /?&'), 'Encoded → Text'],
  ]) {
    await go(slug);
    await main.locator('textarea').fill(input);
    await result(encoded);
    await main.getByRole('button', { name: 'Copy', exact: true }).click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), encoded);
    await main.getByRole('button', { name: decode, exact: true }).click();
    await main.locator('textarea').fill(encoded);
    await result(input);
    await main.locator('textarea').fill(slug === 'base64' ? '!!!' : '%XX');
    await main.getByText(/isn't a valid/).waitFor();
    console.log(`PASS: ${slug} encode/decode, clipboard and invalid input`);
  }
  await go('json');
  await main.locator('textarea').fill('{"a":1}');
  await result('{\n  "a": 1\n}');
  await main.getByRole('button', { name: 'Minify', exact: true }).click();
  await result('{"a":1}');
  await main.locator('textarea').fill('{');
  await main.getByText("That isn't valid JSON").waitFor();
  console.log('PASS: JSON format/minify/validation');
  await go('password');
  await page.waitForFunction(() => document.querySelector('main [aria-live]')?.textContent?.length === 16);
  const password = await main.locator('[aria-live]').textContent();
  assert.match(password, /[a-z]/); assert.match(password, /[A-Z]/); assert.match(password, /[0-9]/);
  await main.getByRole('slider').fill('32');
  await page.waitForFunction(() => document.querySelector('main [aria-live]')?.textContent?.length === 32);
  for (const checkbox of await main.getByRole('checkbox').all()) await checkbox.uncheck();
  await main.getByText('Select at least one character type').waitFor();
  console.log('PASS: password generation, length and empty selection');
  await go('age');
  await main.locator('select').selectOption('30');
  await main.getByRole('button', { name: 'Already came', exact: true }).click();
  assert.match(await main.locator('[aria-live]').textContent(), new RegExp(String(new Date().getFullYear() - 30)));
  console.log('PASS: birth year lookup');
  await go('arith');
  await main.locator('input').waitFor();
  const equation = await main.locator('[aria-live]').allTextContents();
  const match = equation.map(text => text.match(/^(\d+) ([+\-×÷]) (\d+)$/)).find(Boolean);
  assert.ok(match, 'arithmetic equation visible');
  const a = Number(match[1]), b = Number(match[3]);
  const answer = { '+': a + b, '-': a - b, '×': a * b, '÷': a / b }[match[2]];
  await main.locator('input').fill(String(answer));
  await main.getByRole('button', { name: 'Submit', exact: true }).click();
  await main.getByText('Question 2 of 10', { exact: true }).waitFor();
  console.log('PASS: arithmetic answer advances question');
  await go('dice');
  await main.locator('select').selectOption('3');
  await main.getByRole('button', { name: 'Roll', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('main button').disabled);
  const total = Number(await main.locator('strong').textContent());
  assert.ok(total >= 3 && total <= 18);
  console.log('PASS: dice count and total');
  await go('stopwatch');
  await main.getByRole('button', { name: 'Start', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('main [aria-live]').textContent !== '00:00.00');
  await main.getByRole('button', { name: 'Lap', exact: true }).click();
  assert.equal(await main.locator('li').count(), 1);
  await main.getByRole('button', { name: 'Stop', exact: true }).click();
  await main.getByRole('button', { name: 'Reset', exact: true }).click();
  await result('00:00.00');
  console.log('PASS: stopwatch start/lap/stop/reset');
  await go('reaction');
  await main.getByRole('button', { name: 'Click to start', exact: true }).click();
  await main.getByRole('button', { name: 'Now! Click!', exact: true }).click();
  await main.getByRole('button', { name: 'Try again', exact: true }).waitFor();
  assert.match(await main.locator('[aria-live]').textContent(), /Reaction time: \d+ms/);
  console.log('PASS: reaction game');
  await go('timing');
  await main.getByRole('button', { name: 'Click to start', exact: true }).click();
  await main.getByRole('button', { name: 'Timing...', exact: true }).click();
  await main.getByRole('button', { name: 'Try again', exact: true }).waitFor();
  assert.match(await main.locator('[aria-live]').textContent(), /Time: \d+\.\d+s/);
  console.log('PASS: timing game');
  await go('ip');
  await result('192.0.2.10'); await result('2001:db8::10');
  await page.route('https://ipv6.icanhazip.com/**', route => route.fulfill({ status: 503, body: '', headers: { 'Access-Control-Allow-Origin': '*' } }));
  await go('ip');
  await result('192.0.2.10'); await result('Not available');
  console.log('PASS: IP results and one-protocol failure (mocked network)');
  await go('domain');
  await main.getByLabel('example.com').fill('not a domain');
  await main.getByRole('button', { name: 'Look up', exact: true }).click();
  await result("That doesn't look like a valid domain name.");
  console.log('PASS: domain lookup rejects invalid input (no socket opened; see check:whois for the real WHOIS lookup)');
  assert.deepEqual(errors, []);
  console.log('PASS: all 13 tools, no uncaught JS errors');
} finally { await browser.close(); }
