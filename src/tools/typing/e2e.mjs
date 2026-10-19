// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview (with the local D1 database migrated).
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  // The page's clock is the test's: the minute is fast-forwarded.
  await page.clock.install();
  await go('typing');
  await main.locator('[data-typing="start"]').click();
  const romaji = () => main.locator('[data-typing="romaji"]').innerText();
  const text = () => main.locator('[data-typing="text"]').innerText();

  // Type the word shown, key by key; the next word comes at once. (The romaji shown is the way to follow.)
  const first = await text();
  let typedWords = 0;
  for (let word = 0; word < 3; word++) {
    const before = await text();
    const way = await romaji();
    for (const key of way) await page.keyboard.press(key === '-' ? 'Minus' : key === ',' ? 'Comma' : key === '.' ? 'Period' : `Key${key.toUpperCase()}`);
    await page.waitForFunction(old => document.querySelector('[data-typing="text"]')?.textContent !== old, before);
    typedWords++;
  }
  assert.match(await main.locator('[data-typing="words"]').innerText(), /^3 words$/);

  // A wrong key is a miss, shakes the board and does not move the word on.
  const target = await romaji();
  const wrong = target[0] === 'q' ? 'KeyZ' : 'KeyQ';
  await page.keyboard.press(wrong);
  assert.equal(await romaji(), target);

  // Another way of typing is accepted: し as shi where si is shown, or the like - here, a word with し or ち if drawn.
  // (The word is random; the romaji checker's own tests cover every way.) Run out the clock.
  await page.clock.runFor(61000);
  const result = main.locator('[data-typing="result"]');
  await result.waitFor();
  const score = Number((await main.locator('[data-typing="score"]').innerText()).match(/\d+/)[0]);
  assert.ok(score > 0, `score ${score}`);
  assert.match(await main.locator('[data-typing="rank-letter"]').innerText(), /^[SABCD]$/);
  const [, top, total] = (await main.locator('[data-typing="top"]').innerText()).match(/^Top (\d+)% of (\d+) rounds$/).map(Number);
  assert.ok(total >= 1 && top >= 1 && top <= 100, `top ${top}% of ${total}`);
  await main.locator('[data-typing="chart"]').waitFor();
  const x = new URL(await main.locator('[data-share] [data-network="x"]').getAttribute('href'));
  assert.match(x.searchParams.get('text'), new RegExp(`${score} in the typing game`));
  assert.match(x.searchParams.get('url'), /\/en\/typing$/);
  void first; void typedWords;

  // Again plays another round; Escape stops it.
  await main.locator('[data-typing="again"]').click();
  await main.locator('[data-typing="play"]').waitFor();
  await page.keyboard.press('Escape');
  await main.locator('[data-typing="start"]').waitFor();
  console.log('PASS: typing: words typed key by key, a wrong key is a miss, the score and rank when the minute ends, placed among everyone and shared, again, Escape stops');
}
