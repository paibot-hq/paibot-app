import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { configureAccess } from './lib/access.mjs';

const base = process.env.CHECK_BROWSER_BASE_URL ?? 'http://localhost:3002';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ timezoneId: 'Asia/Tokyo', permissions: ['clipboard-read', 'clipboard-write'], serviceWorkers: 'block' });
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
  await page.clock.setFixedTime(new Date('2026-12-31T14:59:59Z'));
  await go('clock');
  await page.waitForFunction(() => document.querySelector('[data-clock-time]')?.textContent === '23:59:59');
  assert.match(await page.locator('[data-clock-date]').textContent(), /December 31, 2026/);
  await page.clock.setFixedTime(new Date('2026-12-31T15:00:00Z'));
  await page.waitForFunction(() => document.querySelector('[data-clock-time]')?.textContent === '00:00:00');
  assert.match(await page.locator('[data-clock-date]').textContent(), /January 1, 2027/);
  await page.getByRole('button', { name: 'Fullscreen', exact: true }).click();
  await page.locator('[data-expanded]').waitFor();
  await page.getByRole('button', { name: 'Exit fullscreen', exact: true }).click();
  await page.locator('[data-expanded]').waitFor({ state: 'detached' });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: '/tmp/paibot-clock-mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('PASS: clock, local date rollover, fullscreen and mobile width');
  await go('math');
  // Anchored: other units' summaries (e.g. quadratics) also mention factoring.
  await main.getByRole('link', { name: /^Factoring/ }).click();
  await page.waitForURL(`${base}/en/math/factorization`);
  await main.getByRole('link', { name: /^Basics/ }).click();
  await page.waitForURL(`${base}/en/math/factorization/trinomial-a`);
  await main.locator('h1').waitFor();
  await main.getByText('Basics', { exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  console.log('PASS: math landing links through to the factoring set picker and set trinomial-a');
  await go('math');
  // Anchored: the negative-numbers card's summary also mentions arithmetic.
  await main.getByRole('link', { name: /^Arithmetic/ }).click();
  await page.waitForURL(`${base}/en/math/arith`);
  await main.getByRole('link', { name: /^Multi-step word problems/ }).click();
  await page.waitForURL(`${base}/en/math/arith/word-b`);
  await main.getByText('Multi-step word problems', { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS: math landing links through to the arithmetic set picker and set word-b');
  await go('math');
  await main.getByRole('link', { name: /^Negative numbers/ }).click();
  await page.waitForURL(`${base}/en/math/signed`);
  await main.getByRole('link', { name: /^Negative numbers/ }).click();
  await page.waitForURL(`${base}/en/math/signed/four-ops-a`);
  await main.getByText('Negative numbers', { exact: true }).last().waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS: math landing links through to the signed-number set picker and set four-ops-a');
  await go('math');
  await main.getByRole('link', { name: /^Fractions/ }).click();
  await page.waitForURL(`${base}/en/math/fraction`);
  for (const name of ['Simplifying & common denominators', 'Adding & subtracting fractions', 'Multiplying & dividing fractions']) {
    await main.getByRole('link', { name: `${name} Coming soon`, exact: true }).waitFor();
  }
  assert.equal(await page.title(), 'Fractions | PAIBOT.app');
  assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow');
  await main.getByRole('link', { name: /^Simplifying & common denominators/ }).click();
  await page.waitForURL(`${base}/en/math/fraction/simplify-a`);
  await main.getByRole('status').filter({ hasText: 'being prepared' }).waitFor();
  assert.equal(await page.title(), 'Fractions - Simplifying & common denominators | PAIBOT.app');
  assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  console.log('PASS: coming-soon fractions unit lists sets and shows the preparation message');
  await page.setViewportSize({ width: 1100, height: 900 });
  // Fixed to a month whose holidays exercise all three kinds at once.
  await page.clock.setFixedTime(new Date('2026-09-26T03:00:00Z'));
  await go('calendar');
  await page.locator('[data-calendar-grid]').waitFor();
  assert.match(await page.locator('[data-calendar-label]').textContent(), /September 2026/);
  assert.equal(await page.locator('[data-calendar-grid] td[data-today]').textContent(), '26');
  assert.deepEqual(await page.locator('[data-calendar-grid] td[data-holiday]').allTextContents(),
    ['21Respect-for-the-Aged Day', '22Citizens\' holiday', '23Autumnal Equinox Day']);
  await page.getByRole('button', { name: 'Next month' }).click();
  await page.waitForFunction(() => document.querySelector('[data-calendar-label]')?.textContent?.includes('October'));
  assert.equal(await page.locator('[data-calendar-grid] td[data-today]').count(), 0, 'today only marks its own month');
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[data-calendar-label]')?.textContent?.includes('September'));
  await page.getByRole('button', { name: 'Previous month' }).click();
  await page.waitForFunction(() => document.querySelector('[data-calendar-label]')?.textContent?.includes('August'));
  assert.deepEqual(await page.locator('[data-calendar-grid] td[data-holiday]').allTextContents(), ['11Mountain Day'],
    'August 2026 has Mountain Day only');
  // Year view: twelve months at once, the whole year's holidays, and a month
  // heading that opens that month.
  await page.getByRole('button', { name: 'Year', exact: true }).click();
  await page.locator('[data-calendar-year]').waitFor();
  assert.equal(await page.locator('[data-calendar-label]').textContent(), '2026');
  assert.equal(await page.locator('[data-calendar-year] table').count(), 12);
  assert.equal(await page.locator('[data-calendar-year] td[data-holiday]').count(), 18, '2026 has 18 public holidays');
  await page.getByRole('button', { name: 'September', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[data-calendar-label]')?.textContent?.includes('September 2026'));
  assert.equal(await page.locator('[data-calendar-year]').count(), 0, 'picking a month leaves the year view');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  console.log('PASS: calendar month navigation, today and Japanese holidays');
  await page.setViewportSize({ width: 1100, height: 900 });
  // Back to the date the life calendar below is written against.
  await page.clock.setFixedTime(new Date('2026-12-31T15:00:00Z'));
  await go('life-calendar');
  await main.getByLabel('Date of birth').fill('2026-12-25');
  await page.locator('[data-life-grid]').waitFor();
  assert.equal(await page.locator('[data-life-grid] [data-state="past"]').count(), 1);
  assert.equal(await page.locator('[data-life-grid] [data-state="current"]').count(), 1);
  const initialWeeks = await page.locator('[data-life-grid] [data-state]').count();
  await main.getByRole('combobox', { name: /Display range/ }).selectOption('10');
  assert.ok((await page.locator('[data-life-grid] [data-state]').count()) < initialWeeks);
  assert.equal(await page.locator('[data-current-age]').textContent(), 'Age 0');
  assert.equal(await page.locator('[data-remaining-weeks]').textContent(), '520 weeks');
  await main.getByLabel('Date of birth').fill('2030-01-01');
  await main.getByRole('alert').waitFor();
  assert.equal(await page.locator('[data-life-grid]').count(), 0);
  await main.getByLabel('Date of birth').fill('1990-06-15');
  await main.getByRole('combobox', { name: /Display range/ }).selectOption('90');
  await page.locator('[data-life-grid]').waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: '/tmp/paibot-life-calendar-mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  await main.getByRole('combobox', { name: /Display range/ }).selectOption('120');
  assert.equal(await page.getByRole('dialog').count(), 0);
  assert.equal(await main.getByRole('button', { name: 'View entire calendar' }).count(), 0);
  const calendarGrid = page.locator('[data-life-grid]');
  assert.ok(await calendarGrid.locator('[data-state]').count() > 6000);
  await calendarGrid.locator('[data-age="0"]').waitFor();
  assert.equal(await calendarGrid.locator('[data-age="120"]').textContent(), 'Age 120');
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await page.waitForFunction(() => document.querySelector('[data-life-grid]').getBoundingClientRect().height <= innerHeight * .7);
    assert.ok(await calendarGrid.evaluate(grid => grid.scrollHeight <= grid.clientHeight + 2), 'all rows fit inside compact grid');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '/tmp/paibot-life-inline.png', fullPage: true });
  console.log('PASS: life calendar shows every week inline without an overview button');
  console.log('PASS: all 16 tools, no uncaught JS errors');
} finally { await browser.close(); }
