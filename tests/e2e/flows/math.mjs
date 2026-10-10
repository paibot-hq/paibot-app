// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

// /math lists units and their learning items; an item's page lists its
// practice sets; a set is the quiz. Works whether or not the newer sets are
// published in the local D1 (CI imports them unpublished).
export default async function ({ page, main, base, go, errors }) {
  // The units' headings (the text about the tool under the page has its own).
  const units = main.locator('[data-math-domain-name]');
  const link = href => main.locator(`a[href="${href}"]`);
  // A missing translation renders its key (e.g. "App.math.units.arith.title").
  await go('math');
  assert.ok(!(await main.textContent()).includes('App.math.'), 'no untranslated keys on the math page');
  assert.deepEqual(await units.allTextContents(), [
    'Number', 'Algebra', 'Functions', 'Geometry & measurement',
    'Statistics & probability', 'Sets & logic', 'Vectors & matrices', 'Calculus',
  ]);
  // The areas are folded at first, so the page starts short; a search or a filter opens the areas with a match, and "Open all" opens them all.
  const areaButton = name => main.getByRole('heading', { level: 2 }).getByRole('button', { name: new RegExp(`^${name}`) });
  const openAreas = () => main.locator('[data-math-domain][data-open]').count();
  assert.equal(await openAreas(), 0, 'every area is folded at first');
  assert.equal(await areaButton('Number').getAttribute('aria-expanded'), 'false');
  assert.equal(await link('/en/math/arith').isVisible(), false);
  // Without a search or a filter an area lists its units only (one line each, linking to the unit's page), highlighted when they have problems.
  assert.equal(await link('/en/math/factorization').getAttribute('data-playable'), 'true');
  assert.equal(await link('/en/math/factorization/trinomial').count(), 0, 'no learning items without a search');
  await main.getByRole('button', { name: 'Higher', exact: true }).click();
  assert.deepEqual(await units.allTextContents(), ['Statistics & probability', 'Sets & logic', 'Vectors & matrices', 'Calculus']);
  await main.getByRole('button', { name: 'Higher', exact: true }).click();
  await main.getByLabel('Playable sets only').check();
  assert.ok(await main.locator('ul ul a').count() > 0);
  assert.equal(await main.locator('a[data-playable]').count(), await main.locator('ul ul a').count(), 'only playable items');
  await main.getByLabel('Playable sets only').uncheck();
  await main.getByRole('searchbox').fill('solid shapes');
  assert.deepEqual(await main.locator('ul ul a').allTextContents(), ['Solid shapes']);
  assert.equal(await link('/en/math/shapes/solids-basic').getAttribute('data-playable'), 'true', 'a found item with problems is highlighted');
  assert.ok(await link('/en/math/shapes/solids-basic').isVisible(), 'a search opens the area with the match');
  await main.getByRole('searchbox').fill('');
  // Japanese school year: only that year's items; the Suken filter is Japanese only.
  assert.equal(await main.getByRole('combobox').count(), 1);
  await main.getByRole('combobox', { name: 'Filter by Japanese school year' }).selectOption('m3');
  assert.ok(await link('/en/math/factorization/trinomial').isVisible());
  assert.equal(await link('/en/math/factoring/ac-method').count(), 0, 'Math I items are not Junior high 3');
  assert.equal(await link('/en/math/arith/order-of-operations').count(), 0);
  await main.getByRole('combobox', { name: 'Filter by Japanese school year' }).selectOption('');
  // The level filter follows each item's own school year: 数学II's cubic expansion sits in a
  // middle-school unit (展開) but is a high-school item, and a 中3 item is not.
  await main.getByRole('button', { name: 'Advanced', exact: true }).click();
  assert.ok(await link('/en/math/expansion/cubic').isVisible(), 'a high-school item in a middle-school unit shows under the high-school level');
  assert.equal(await link('/en/math/expansion/square').count(), 0, 'a middle-school item does not');
  await main.getByRole('button', { name: 'Advanced', exact: true }).click();
  await main.locator('[data-math-list="toggle-all"]').click();
  assert.equal(await openAreas(), 8, 'open all');
  await main.locator('[data-math-list="toggle-all"]').click();
  assert.equal(await openAreas(), 0, 'close all');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  // On a phone only the search shows; the other filters are behind "Filters".
  const moreFilters = main.getByRole('button', { name: 'Filters' });
  assert.equal(await main.getByRole('button', { name: 'Higher', exact: true }).isVisible(), false);
  await moreFilters.click();
  assert.equal(await moreFilters.getAttribute('aria-expanded'), 'true');
  await main.getByRole('button', { name: 'Higher', exact: true }).click();
  assert.equal(await moreFilters.innerText(), 'Filters1', 'the button counts the filters that are on');
  await main.getByRole('button', { name: 'Higher', exact: true }).click();
  await moreFilters.click();
  assert.ok(await page.evaluate(() => document.body.scrollHeight) < 3000, 'folded, the list is short on a phone');
  await page.setViewportSize({ width: 1100, height: 900 });
  console.log('PASS: math lists units and learning items folded by area (opened by a search, a filter or open all), highlights playable ones and filters by level, playability and name');

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
  // The math list offers to go on from there.
  const nextSet = await main.getByRole('link', { name: /^Next practice/ }).getAttribute('href');
  await go('math');
  assert.equal(await main.locator('[data-math-resume]').getAttribute('href'), nextSet);
  assert.deepEqual(errors, []);
  console.log('PASS: one tap answers; the result marks each problem and links the next set, which the math list offers to continue');

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
