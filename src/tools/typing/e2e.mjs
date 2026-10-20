// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview (with the local D1 database migrated).
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  // The page's clock is the test's: the minute is fast-forwarded.
  await page.clock.install();
  await go('typing');
  const romaji = () => main.locator('[data-typing="romaji"]').innerText();
  const text = () => main.locator('[data-typing="text"]').innerText();
  const press = key => page.keyboard.press(key === ' ' ? 'Space' : key === '-' ? 'Minus' : key === ',' ? 'Comma' : key === '.' ? 'Period' : key === "'" ? 'Quote' : `Key${key.toUpperCase()}`);
  const typeWord = async (keys = null) => {
    const before = await text();
    for (const key of keys ?? await romaji()) await press(key);
    await page.waitForFunction(old => document.querySelector('[data-typing="text"]')?.textContent !== old, before);
    return before;
  };
  const result = main.locator('[data-typing="result"]');

  // The English page starts in English: the words are typed as they are, the way shown is the word itself.
  assert.equal(await main.locator('[data-typing-mode="en"]').getAttribute('aria-pressed'), 'true');
  await main.locator('[data-typing="start"]').click();
  for (let word = 0; word < 3; word++) {
    const before = await text();
    assert.match(before, /^[a-z .,'?!-]+$/, 'English words in the English mode');
    assert.equal(await romaji(), before, 'the way shown is the word itself');
    await typeWord();
  }
  assert.match(await main.locator('[data-typing="words"]').innerText(), /^3 words$/);

  // A wrong key is a miss, shakes the board and does not move the word on.
  const target = await romaji();
  await page.keyboard.press(target[0] === 'q' ? 'KeyZ' : 'KeyQ');
  assert.equal(await romaji(), target);

  // The minute ends: the score and rank, placed among everyone's English rounds, the chart and sharing.
  await page.clock.runFor(61000);
  await result.waitFor();
  const score = Number((await main.locator('[data-typing="score"]').innerText()).match(/\d+/)[0]);
  assert.ok(score > 0, `score ${score}`);
  assert.match(await main.locator('[data-typing="rank-letter"]').innerText(), /^[SABCD]$/);
  const [, top, total] = (await main.locator('[data-typing="top"]').innerText()).match(/^Top (\d+)% of (\d+) rounds$/).map(Number);
  assert.ok(total >= 1 && top >= 1 && top <= 100, `top ${top}% of ${total}`);
  await main.locator('[data-typing="chart"]').waitFor();
  const x = new URL(await main.locator('[data-share] [data-network="x"]').getAttribute('href'));
  assert.match(x.searchParams.get('text'), new RegExp(`${score} in the typing game \\(English\\)`));
  assert.match(x.searchParams.get('url'), /\/en\/typing$/);

  // Japanese: the other mode, with its own words, typed in romaji; a way other than the one shown is accepted too (し as
  // shi where si is shown, ん as nn): the checker's own tests cover every way, this shows it reaches the page.
  await main.locator('[data-typing-mode="ja"]').click();
  await main.locator('[data-typing="again"]').click();
  assert.match(await text(), /[ぁ-んァ-ヶ一-龠]/, 'Japanese words in the Japanese mode');
  for (let word = 0; word < 2; word++) {
    const way = await romaji();
    // Typed with every "si" as "shi" and every "ti" as "chi", which the checker accepts as well as what is shown.
    await typeWord(way.replace(/si/g, 'shi').replace(/ti/g, 'chi').replace(/tu/g, 'tsu').replace(/hu/g, 'fu'));
  }
  assert.match(await main.locator('[data-typing="words"]').innerText(), /^2 words$/);
  await page.keyboard.press('Escape');
  await main.locator('[data-typing="start"]').waitFor();
  console.log('PASS: typing: English words typed as they are, a wrong key is a miss, the score, rank, chart and sharing, then Japanese words in romaji (another way of typing accepted), Escape stops');
}
