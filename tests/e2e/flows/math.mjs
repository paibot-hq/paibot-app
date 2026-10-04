// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';
import { siteOrigins } from '../../../src/lib/sites.ts';

// /math lists units and their learning items; an item's page lists its
// practice sets; a set is the quiz. Works whether or not the newer sets are
// published in the local D1 (CI imports them unpublished).
export default async function ({ page, main, base: appBase, go, errors }) {
  // The drills are on the learning site (src/lib/sites.ts); `go` starts at the app site and is sent there.
  const base = siteOrigins(appBase).learn;
  const link = href => main.locator(`a[href="${href}"]`);
  // The learning site's cover lists its subjects; math is open and links to the drills. The app site sends the
  // drills' pages there.
  await page.goto(`${base}/en`);
  assert.ok(!(await main.textContent()).includes('App.learn'), 'no untranslated keys on the learn page');
  assert.equal(await main.locator('a[href="/en/math"]').count(), 2, 'the start button and the math card');
  assert.equal((await page.goto(`${appBase}/en/math`)).url(), `${base}/en/math`, 'the app site redirects the drills to the learning site');
  // A missing translation renders its key (e.g. "App.math.units.arith.title").
  await go('math');
  assert.ok(!(await main.textContent()).includes('App.math.'), 'no untranslated keys on the math page');
  assert.deepEqual(await main.getByRole('heading', { level: 2 }).allTextContents(), [
    'Number', 'Algebra', 'Functions', 'Geometry & measurement',
    'Statistics & probability', 'Sets & logic', 'Vectors & matrices', 'Calculus',
  ]);
  // Items link to their page; those with problems are highlighted.
  assert.equal(await link('/en/math/factorization/trinomial').getAttribute('data-playable'), 'true');
  assert.equal(await link('/en/math/shapes/solids-basic').getAttribute('data-playable'), null);
  await main.getByRole('button', { name: 'Higher', exact: true }).click();
  assert.deepEqual(await main.getByRole('heading', { level: 2 }).allTextContents(), ['Statistics & probability', 'Sets & logic', 'Vectors & matrices', 'Calculus']);
  await main.getByRole('button', { name: 'Higher', exact: true }).click();
  await main.getByLabel('Playable sets only').check();
  assert.ok(await main.locator('ul ul a').count() > 0);
  assert.equal(await main.locator('a[data-playable]').count(), await main.locator('ul ul a').count(), 'only playable items');
  await main.getByLabel('Playable sets only').uncheck();
  await main.getByRole('searchbox').fill('solid shapes');
  assert.deepEqual(await main.locator('ul ul a').allTextContents(), ['Solid shapes (Coming soon)']);
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
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.setViewportSize({ width: 1100, height: 900 });
  console.log('PASS: math lists units and learning items, highlights playable ones and filters by level, playability and name');

  // An item's page lists its practice sets; a set opens its quiz, whose
  // "choose a different set" returns to the item's page.
  // A unit's page lists its learning items; the top page links to both.
  assert.ok(await link('/en/math/arith').isVisible());
  await link('/en/math/arith').click();
  await page.waitForURL(`${base}/en/math/arith`);
  await main.getByRole('heading', { level: 1, name: 'Order of operations & word problems' }).waitFor();
  assert.ok((await main.locator('ul a').evaluateAll(cards => cards.map(card => card.getAttribute('href')))).includes('/en/math/arith/order-of-operations'));
  assert.equal(await page.title(), 'Order of operations & word problems | PAIBOT');
  assert.equal((await page.goto(`${base}/en/math/nothing`)).status(), 404);
  await go('math');
  await link('/en/math/arith/order-of-operations').click();
  await page.waitForURL(`${base}/en/math/arith/order-of-operations`);
  await main.getByRole('heading', { level: 1, name: 'Order of operations' }).waitFor();
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
    await link(`/en/math/${item}/${set}`).click();
    await page.waitForURL(`${base}/en/math/${item}/${set}`);
    await main.getByText(label, { exact: true }).last().waitFor();
    await main.getByText('1 / 5', { exact: true }).waitFor();
    assert.match(await main.locator('[data-tier]').innerText(), /^(Basic|Standard|Advanced)$/);
    // A breadcrumb: Math Drills > unit > learning item > set (current, not a link).
    const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' });
    assert.deepEqual(await crumbs.getByRole('link').evaluateAll(links => links.map(link => link.getAttribute('href'))),
      ['/en/math', `/en/math/${item.split('/')[0]}`, `/en/math/${item}`]);
    assert.match(await crumbs.locator('[aria-current=page]').innerText(), /^Practice \d$/);
    await crumbs.getByRole('link').last().click();
    await page.waitForURL(`${base}/en/math/${item}`);
  }
  assert.deepEqual(errors, []);
  console.log('PASS: item pages list their sets with tier counts; sets open their quiz (with each problem\'s tier) and link back to the item');

  // A unit without problems yet: its sets show the preparation message and are noindex.
  await go('math/shapes/solids-basic/1');
  await main.getByRole('status').filter({ hasText: 'being prepared' }).waitFor();
  assert.equal(await page.title(), 'Basic shapes - Solid shapes | PAIBOT');
  assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow');
  assert.equal((await page.goto(`${base}/en/math/arith/nothing`)).status(), 404);
  assert.equal((await page.goto(`${base}/en/math/arith/order-of-operations/9`)).status(), 404);
  console.log('PASS: coming-soon sets show the preparation message; unknown items and sets are 404');

  // Former URLs land on the new pages.
  for (const [from, to] of [['units', '/ja/math'], ['level/middle', '/ja/math'],
    ['arith/order-a', '/ja/math/arith/order-of-operations/1'], ['factorization/squares-a', '/ja/math/factorization/difference-of-squares/1'],
    ['factorization/trinomial-a', '/ja/math/factorization/trinomial/1'], ['fraction/add-sub-a', '/ja/math/fraction/add-sub/1']]) {
    await page.goto(`${base}/ja/math/${from}`);
    assert.equal(new URL(page.url()).pathname, to, from);
  }
  assert.deepEqual(errors, []);
  console.log('PASS: former unit, entry and set URLs redirect to the new pages');

  // Suken levels (Japanese only) follow the school years: 準2級 = 数学I・A.
  await page.goto(`${base}/ja/math`);
  await page.waitForFunction(() => document.documentElement.dataset.theme);
  await main.getByRole('combobox', { name: '数検の級で絞り込む' }).selectOption('pre2');
  assert.ok(await link('/ja/math/factoring/ac-method').isVisible());
  assert.equal(await link('/ja/math/factorization/trinomial').count(), 0, '中3 items are 3級');
  await main.getByText('日本数学検定協会とは関係ありません', { exact: false }).waitFor();
  // 準1級 = 数学III・C, plus the matrices its official topic list names.
  await main.getByRole('combobox', { name: '数検の級で絞り込む' }).selectOption('pre1');
  assert.ok(await link('/ja/math/limit/sequence').isVisible());
  assert.ok(await link('/ja/math/matrix/operations').isVisible());
  assert.equal(await link('/ja/math/sequence/arithmetic').count(), 0, '数列 (数学B) is 2級');
  await main.getByRole('combobox', { name: '数検の級で絞り込む' }).selectOption('11');
  assert.ok(await link('/ja/math/addition/within-10').isVisible());
  assert.deepEqual(errors, []);
  console.log('PASS: school-year and (Japanese) Suken filters');
}
