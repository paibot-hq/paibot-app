// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('birthday-fortune');
  assert.equal(await main.locator('[data-fortune="result"]').count(), 0, 'nothing is read before a date is given');
  // 15 May 1990: Taurus, and a life path of 3 (1+9+9+0+0+5+1+5 = 30).
  await main.locator('[data-fortune="date"]').fill('1990-05-15');
  await main.locator('[data-fortune="read"]').click();
  const result = main.locator('[data-fortune="result"]');
  await result.waitFor();
  const text = await result.innerText();
  assert.match(text, /Taurus/);
  assert.match(text, /The expresser/, 'life path 3');
  assert.equal(await result.locator('[role="img"]').count(), 4, 'stars for four things');
  assert.equal(await result.locator('section').count(), 4, 'today, the cycle, the sign and the life path');
  assert.doesNotMatch(text, /birthdayFortune\.|sign\.|day\.\d|year\.\d/, 'the words are shown, not their keys');
  // Shared with the sign and a link to the page.
  const x = new URL(await main.locator('[data-share] [data-network="x"]').getAttribute('href'));
  assert.match(x.searchParams.get('text'), /Taurus/);
  assert.match(x.searchParams.get('url'), /\/en\/birthday-fortune$/);
  // The date is kept in this browser: after a reload the reading is back without asking.
  await page.reload();
  await main.locator('[data-fortune="result"]').waitFor();
  assert.equal(await main.locator('[data-fortune="date"]').inputValue(), '1990-05-15');
  // It can be forgotten.
  await main.locator('[data-fortune="forget"]').click();
  assert.equal(await main.locator('[data-fortune="result"]').count(), 0);
  assert.equal(await main.locator('[data-fortune="date"]').inputValue(), '');
  // Another date gives another reading: 31 December 1985 is Capricorn, life path 3+... (1+9+8+5+1+2+3+1 = 30 -> 3).
  await main.locator('[data-fortune="date"]').fill('1985-12-31');
  await main.locator('[data-fortune="read"]').click();
  await main.locator('[data-fortune="result"]').waitFor();
  assert.match(await main.locator('[data-fortune="result"]').innerText(), /Capricorn/);
  console.log('PASS: birthday-fortune: a date gives the sign, the life path and today, kept after a reload and forgettable');
}
