// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

// /math lists units and their learning items; an item's page lists its
// practice sets; a set is the quiz. Works whether or not the newer sets are
// published in the local D1 (CI imports them unpublished).
export default async function ({ page, main, base, go, errors }) {
  // The areas' names in the list and in the results of a search or a filter (the text about the tool under the page has its own).
  const units = main.locator('[data-math-domain-name]');
  const link = href => main.locator(`a[href="${href}"]`);
  // A missing translation renders its key (e.g. "App.math.units.arith.title").
  await go('math');
  assert.ok(!(await main.textContent()).includes('App.math.'), 'no untranslated keys on the math page');
  // Two tabs, Practice (this page) and Tests; Practice lists every unit, folded by area.
  assert.deepEqual(await main.locator('[data-math-mode]').allTextContents(), ['Practice', 'Tests']);
  assert.equal(await main.locator('[data-math-mode="practice"]').getAttribute('aria-current'), 'page');
  assert.deepEqual(await units.allTextContents(), [
    'Number', 'Algebra', 'Functions', 'Geometry & measurement',
    'Statistics & probability', 'Sets & logic', 'Vectors & matrices', 'Calculus',
  ]);
  const areaButton = name => main.getByRole('heading', { level: 2 }).getByRole('button', { name: new RegExp(`^${name}`) });
  const openAreas = () => main.locator('[data-math-domain][data-open]').count();
  assert.equal(await openAreas(), 0, 'every area is folded at first');
  assert.equal(await areaButton('Number').getAttribute('aria-expanded'), 'false');
  assert.equal(await link('/en/math/arith').isVisible(), false);
  assert.equal(await link('/en/math/factorization/trinomial').count(), 0, 'no learning items without a search');
  // An opened area lists its units, one line each, linking to the unit's page, highlighted when they have problems.
  await areaButton('Algebra').click();
  assert.ok(await link('/en/math/factorization').isVisible());
  assert.equal(await link('/en/math/factorization').getAttribute('data-playable'), 'true');
  await areaButton('Algebra').click();
  // A search or a filter shows the matching learning items of every unit.
  await main.getByLabel('Playable sets only').check();
  assert.ok(await main.locator('ul ul a').count() > 0);
  assert.equal(await main.locator('a[data-playable]').count(), await main.locator('ul ul a').count(), 'only playable items');
  await main.getByLabel('Playable sets only').uncheck();
  await main.getByRole('searchbox').fill('solid shapes');
  assert.deepEqual(await main.locator('ul ul a').allTextContents(), ['Solid shapes']);
  assert.equal(await link('/en/math/shapes/solids-basic').getAttribute('data-playable'), 'true', 'a found item with problems is highlighted');
  assert.ok(await link('/en/math/shapes/solids-basic').isVisible());
  await main.getByRole('searchbox').fill('');
  // Japanese school year: only that year's items; the Suken filter is Japanese only.
  assert.equal(await main.getByRole('combobox').count(), 1);
  await main.getByRole('combobox', { name: 'Filter by Japanese school year' }).selectOption('m3');
  assert.ok(await link('/en/math/factorization/trinomial').isVisible());
  assert.equal(await link('/en/math/factoring/ac-method').count(), 0, 'Math I items are not Junior high 3');
  assert.equal(await link('/en/math/arith/order-of-operations').count(), 0);
  // 数学II's cubic expansion sits in a middle-school unit (展開) but is a high-school item.
  await main.getByRole('combobox', { name: 'Filter by Japanese school year' }).selectOption('h-ii');
  assert.ok(await link('/en/math/expansion/cubic').isVisible());
  assert.equal(await link('/en/math/expansion/square').count(), 0);
  await main.getByRole('combobox', { name: 'Filter by Japanese school year' }).selectOption('');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  // On a phone only the search shows; the other filters are behind "Filters".
  const moreFilters = main.getByRole('button', { name: 'Filters' });
  const yearFilter = main.getByRole('combobox', { name: 'Filter by Japanese school year' });
  assert.equal(await yearFilter.isVisible(), false);
  await moreFilters.click();
  assert.equal(await moreFilters.getAttribute('aria-expanded'), 'true');
  await yearFilter.selectOption('m1');
  assert.equal(await moreFilters.innerText(), 'Filters1', 'the button counts the filters that are on');
  await yearFilter.selectOption('');
  await moreFilters.click();
  assert.ok(await page.evaluate(() => document.body.scrollHeight) < 3000, 'the folded list is short on a phone');
  await page.setViewportSize({ width: 1100, height: 900 });
  console.log('PASS: math has Practice and Tests tabs; Practice lists the units by area, and a search or a filter shows learning items by year, playability and name');

  // An item's page lists its practice sets; a set opens its quiz, whose
  // "choose a different set" returns to the item's page.
  // A unit's page lists its learning items; the top page links to both.
  await areaButton('Number').click();
  assert.equal(await areaButton('Number').getAttribute('aria-expanded'), 'true');
  assert.ok(await link('/en/math/arith').isVisible());
  await link('/en/math/arith').click();
  await page.waitForURL(`${base}/en/math/arith`);
  await main.getByRole('heading', { level: 1, name: 'Order of operations & word problems' }).waitFor();
  assert.ok((await main.locator('ul a').evaluateAll(cards => cards.map(card => card.getAttribute('href')))).includes('/en/math/arith/order-of-operations'));
  assert.equal(await page.title(), 'Order of operations & word problems | PAIBOT');
  assert.equal((await page.goto(`${base}/en/math/nothing`)).status(), 404);
  await go('math');
  // The area opened above is remembered in this browser.
  assert.ok(await link('/en/math/arith').isVisible(), 'the opened area is still open');
  await link('/en/math/arith').click();
  await page.waitForURL(`${base}/en/math/arith`);
  await link('/en/math/arith/order-of-operations').click();
  await page.waitForURL(`${base}/en/math/arith/order-of-operations`);
  await main.getByRole('heading', { level: 1, name: 'Order of operations' }).waitFor();
  // "Start practice" goes straight into the set, near the top of the page.
  assert.equal(await main.locator('[data-math-start]').getAttribute('href'), '/en/math/arith/order-of-operations/1');
  assert.deepEqual(await main.locator('ul a').evaluateAll(cards => cards.map(card => card.getAttribute('href'))),
    ['/en/math/arith/order-of-operations/1']);
  assert.equal(await page.title(), 'Order of operations & word problems - Order of operations | PAIBOT');
  await main.getByText('Japanese school year: Elementary 4', { exact: true }).waitFor();
  // The previous and next learning items of the unit are linked at the bottom (the first item has no previous).
  const neighbors = page.getByRole('navigation', { name: 'Previous and next items' });
  assert.deepEqual(await neighbors.getByRole('link').evaluateAll(links => links.map(link => link.getAttribute('href'))), ['/en/math/arith/rules']);
  await page.getByRole('link', { name: /Next/ }).click();
  await page.waitForURL(`${base}/en/math/arith/rules`);
  await page.getByRole('navigation', { name: 'Previous and next items' }).locator('a[href="/en/math/arith/order-of-operations"]').waitFor();
  await page.goBack();
  await page.waitForURL(`${base}/en/math/arith/order-of-operations`);
  await main.getByRole('heading', { level: 1, name: 'Order of operations' }).waitFor();
  // Each playable set shows how many problems of each tier it has.
  assert.match(await main.locator('ul a').first().innerText(), /(Basic|Standard|Advanced) \d/);
  for (const [item, set, label] of [
    ['arith/order-of-operations', '1', 'Order of operations'],
    ['factorization/trinomial', '1', 'Factoring trinomials'],
    ['signed/four-operations', '1', 'Negative numbers'],
    ['pythagoras/sides', '1', 'Side lengths'],
  ]) {
    await go(`math/${item}`);
    await link(`/en/math/${item}/${set}`).last().click(); // the set's card (the first link is "Start practice")
    await page.waitForURL(`${base}/en/math/${item}/${set}`);
    await main.getByText(label, { exact: true }).last().waitFor();
    await main.getByText('1 / 5', { exact: true }).waitFor();
    assert.match(await main.locator('[data-tier]').innerText(), /^(Basic|Standard|Advanced)$/);
    // A breadcrumb: Math > unit > learning item > set (current, not a link).
    const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' });
    assert.deepEqual(await crumbs.getByRole('link').evaluateAll(links => links.map(link => link.getAttribute('href'))),
      ['/en/math', `/en/math/${item.split('/')[0]}`, `/en/math/${item}`]);
    assert.match(await crumbs.locator('[aria-current=page]').innerText(), /^Practice \d$/);
    await crumbs.getByRole('link').last().click();
    await page.waitForURL(`${base}/en/math/${item}`);
  }
  assert.deepEqual(errors, []);
  console.log('PASS: item pages list their sets with tier counts; sets open their quiz (with each problem\'s tier) and link back to the item');

  // A tap on a choice is the answer: the verdict and "Next" come at once. Keys 1-4 answer too. The result marks each problem and offers the next set.
  await go('math/arith/order-of-operations/1');
  const choices = main.locator('[role=group] button');
  for (let index = 0; index < 5; index++) {
    await main.getByText(`${index + 1} / 5`, { exact: true }).waitFor();
    if (index % 2) await page.keyboard.press('2'); else await choices.first().click();
    assert.equal(await choices.and(page.locator(':disabled')).count(), 4, 'answered at once');
    assert.match(await main.locator('[aria-live]').last().innerText(), /^(Correct|Incorrect)$/);
    await main.getByRole('button', { name: index < 4 ? 'Next question' : 'See results' }).click();
  }
  await main.getByText(/^\d \/ 5 correct$/).waitFor();
  assert.equal(await main.locator('ol li').filter({ hasText: /Question \d/ }).count(), 5, 'a mark per problem');
  assert.match(await main.getByRole('link', { name: /^Next practice/ }).getAttribute('href'), /^\/en\/math\/arith\/[a-z-]+\/\d+$/);
  // The result can be shared on X, LINE and Facebook (new tabs), or copied: the words with the score and a link to the same set.
  const shareText = async () => {
    // The site's address is added once the page is in the browser.
    await page.waitForFunction(() => document.querySelector('[data-share] [data-network="x"]')?.getAttribute('href').includes('url=http'));
    const x = new URL(await main.locator('[data-share] [data-network="x"]').getAttribute('href'));
    const line = new URL(await main.locator('[data-share] [data-network="line"]').getAttribute('href'));
    const facebook = new URL(await main.locator('[data-share] [data-network="facebook"]').getAttribute('href'));
    const both = `${x.searchParams.get('text')}\n${x.searchParams.get('url')}`;
    assert.equal(line.searchParams.get('text'), both);
    assert.equal(facebook.searchParams.get('u'), x.searchParams.get('url'));
    assert.equal(await main.locator('[data-share] a[target="_blank"]').count(), 3);
    return both;
  };
  assert.match(await shareText(), new RegExp(`^Math Practice "Order of operations": \\d/5 correct\\n${base}/en/math/arith/order-of-operations/1$`));
  await main.locator('[data-share] [data-network="copy"]').click();
  await main.getByText('Copied the words and the link to share.').waitFor();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), await shareText(), 'copy puts the same words and link on the clipboard');
  // The math list offers to go on from there.
  const nextSet = await main.getByRole('link', { name: /^Next practice/ }).getAttribute('href');
  await go('math');
  assert.equal(await main.locator('[data-math-resume]').getAttribute('href'), nextSet);
  // A finished set turns green without signing in (kept in this browser): its card, its item on the unit's page, and the count in the list.
  assert.match(await main.locator('[data-math-domain="number"] [data-math-domain-name] + span').innerText(), /1\/\d+ done/);
  await go('math/arith');
  assert.equal(await link('/en/math/arith/order-of-operations').getAttribute('data-done'), 'true');
  await go('math/arith/order-of-operations');
  assert.equal(await link('/en/math/arith/order-of-operations/1').last().getAttribute('data-done'), 'true');
  assert.deepEqual(errors, []);
  console.log('PASS: one tap answers; the result marks each problem and links the next set, which the math list offers to continue');

  // Tests: the Tests tab offers a test per school year (and several years at once); a test is ten problems from the year's items,
  // easiest first; the result links each problem's item, and "Try other problems" draws a new test.
  await go('math');
  await main.locator('[data-math-mode="test"]').click();
  await page.waitForURL(`${base}/en/math/test`);
  await main.locator('[data-math-mode="test"][aria-current="page"]').waitFor();
  assert.equal(await main.locator('a[href^="/en/math/test/kentei-"]').count(), 0, 'Suken tests are in Japanese only');
  assert.ok(await link('/en/math/test/summary-middle').isVisible());
  await link('/en/math/test/m1').click();
  await page.waitForURL(`${base}/en/math/test/m1`);
  for (let index = 0; index < 10; index++) {
    await main.getByText(`${index + 1} / 10`, { exact: true }).waitFor();
    await main.locator('[role=group] button').first().click();
    await main.getByRole('button', { name: index < 9 ? 'Next question' : 'See results' }).click();
  }
  await main.getByText(/^\d+ \/ 10 correct$/).waitFor();
  const reviewed = await main.locator('[data-math-review] a').evaluateAll(links => links.map(link => link.getAttribute('href')));
  assert.equal(reviewed.length, 10);
  assert.ok(reviewed.every(href => /^\/en\/math\/[a-z0-9-]+\/[a-z0-9-]+$/.test(href)), 'each problem links its learning item');
  assert.match(await shareText(), new RegExp(`^Math Practice "Junior high 1 test": \\d+/10 correct\\n${base}/en/math/test/m1$`));
  await main.getByRole('button', { name: 'Try other problems' }).click();
  await main.getByText('1 / 10', { exact: true }).waitFor();
  await go('math/test/summary-middle');
  await main.getByText('1 / 20', { exact: true }).waitFor();
  await go('math/test/summary-all');
  await main.getByText('1 / 20', { exact: true }).waitFor();
  // The placement test: chosen where to start (high school: a High 1 problem first), fifteen problems whose year follows the answers,
  // then a level with a link to its test, and each problem with its year and item.
  await go('math/test');
  await main.locator('[data-math-placement]').click();
  await page.waitForURL(`${base}/en/math/test/placement`);
  await main.locator('[data-placement-start="high"]').click();
  for (let index = 0; index < 15; index++) {
    await main.getByText(`${index + 1} / 15`, { exact: true }).waitFor();
    await main.locator('[role=group] button').first().click();
    await main.getByRole('button', { name: index < 14 ? 'Next question' : 'See results' }).click();
  }
  await main.locator('[data-placement-result]').waitFor();
  const placed = await main.locator('[data-math-review] a').allTextContents();
  assert.equal(placed.length, 15);
  assert.match(placed[0], /^High 1 \(Math I & A\)・/, 'starts at High 1');
  assert.ok(new Set(placed.map(label => label.split('・')[0])).size > 1, 'the year moves with the answers');
  assert.match(await main.locator('[data-placement-result] a').first().getAttribute('href'), /^\/en\/math\/test\/[a-z0-9-]+$/);
  assert.match(await shareText(), new RegExp(`^Math Practice placement: .+ \\(\\d+ of 15 correct\\)\\n${base}/en/math/test/placement$`));
  await main.getByRole('button', { name: 'Take it again' }).click();
  await main.locator('[data-placement-start="middle"]').waitFor();
  assert.equal((await page.goto(`${base}/en/math/test/x9`)).status(), 404);
  assert.equal((await page.goto(`${base}/en/math/test/kentei-3`)).status(), 404, 'Suken tests are in Japanese only');
  await page.goto(`${base}/ja/math/test/kentei-3`);
  await main.getByText('1 / 10', { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS: tests by school year, Suken level (Japanese) and several years: drawn problems, a result linking each one\'s item, and a new draw');

  // Every set has problems now: a set of a formerly coming-soon unit opens as any other.
  await go('math/shapes/solids-basic/1');
  await main.getByText('1 / 5', { exact: true }).waitFor();
  assert.equal(await main.getByRole('status').filter({ hasText: 'being prepared' }).count(), 0);
  assert.equal(await page.title(), 'Basic shapes - Solid shapes | PAIBOT');
  assert.equal((await page.goto(`${base}/en/math/arith/nothing`)).status(), 404);
  assert.equal((await page.goto(`${base}/en/math/arith/order-of-operations/9`)).status(), 404);
  console.log('PASS: every set opens its quiz; unknown items and sets are 404');

  // Former URLs land on the new pages.
  for (const [from, to] of [['units', '/ja/math'], ['level/middle', '/ja/math'],
    ['arith/order-a', '/ja/math/arith/order-of-operations/1'], ['factorization/squares-a', '/ja/math/factorization/difference-of-squares/1'],
    ['factorization/trinomial-a', '/ja/math/factorization/trinomial/1'], ['fraction/add-sub-a', '/ja/math/fraction/add-sub/1']]) {
    await page.goto(`${base}/ja/math/${from}`);
    assert.equal(new URL(page.url()).pathname, to, from);
  }
  assert.deepEqual(errors, []);
  console.log('PASS: former unit, entry and set URLs redirect to the new pages');

  // Suken levels (Japanese only) follow the school years and include the years below: 準2級 = 数学I・A and 中3.
  await page.goto(`${base}/ja/math`);
  await page.waitForFunction(() => document.documentElement.dataset.theme);
  await main.getByRole('combobox', { name: '数検の級で絞り込む' }).selectOption('pre2');
  assert.ok(await link('/ja/math/factoring/ac-method').isVisible());
  assert.ok(await link('/ja/math/factorization/trinomial').isVisible(), '準2級 also covers 中3');
  assert.equal(await link('/ja/math/expansion/square').count(), 1, '中3 items are included');
  assert.equal(await link('/ja/math/limit/sequence').count(), 0, '数学III is 準1級');
  await main.getByText('日本数学検定協会とは関係ありません', { exact: false }).waitFor();
  // 準1級 = 数学III・C and 数学II・B, plus the matrices its official topic list names.
  await main.getByRole('combobox', { name: '数検の級で絞り込む' }).selectOption('pre1');
  assert.ok(await link('/ja/math/limit/sequence').isVisible());
  assert.ok(await link('/ja/math/matrix/operations').isVisible());
  assert.ok(await link('/ja/math/sequence/arithmetic').isVisible(), '準1級 also covers 数学II・B (数列)');
  assert.equal(await link('/ja/math/factoring/ac-method').count(), 0, '数学I is not in 準1級');
  await main.getByRole('combobox', { name: '数検の級で絞り込む' }).selectOption('11');
  assert.ok(await link('/ja/math/addition/within-10').isVisible());
  assert.deepEqual(errors, []);
  console.log('PASS: school-year and (Japanese) Suken filters');
}
