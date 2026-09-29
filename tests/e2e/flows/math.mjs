// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

// /math lists units and their learning items; an item's page lists its
// practice sets; a set is the quiz. Works whether or not the newer sets are
// published in the local D1 (CI imports them unpublished).
export default async function ({ page, main, base, go, errors }) {
  const link = href => main.locator(`a[href="${href}"]`);
  // A missing translation renders its key (e.g. "App.math.units.arith.title").
  await go('math');
  assert.ok(!(await main.textContent()).includes('App.math.'), 'no untranslated keys on the math page');
  assert.deepEqual(await main.getByRole('heading', { level: 2 }).allTextContents(), [
    'Number', 'Algebra', 'Functions', 'Geometry & measurement',
    'Statistics & probability', 'Sets & logic', 'Vectors & matrices', 'Calculus',
  ]);
  // Items link to their page; those with problems are highlighted.
  assert.equal(await link('/en/math/factorization/trinomial').getAttribute('data-playable'), 'true');
  assert.equal(await link('/en/math/matrix/operations').getAttribute('data-playable'), null);
  await main.getByRole('button', { name: 'Higher', exact: true }).click();
  assert.deepEqual(await main.getByRole('heading', { level: 2 }).allTextContents(), ['Statistics & probability', 'Sets & logic', 'Vectors & matrices', 'Calculus']);
  await main.getByRole('button', { name: 'Higher', exact: true }).click();
  await main.getByLabel('Playable sets only').check();
  assert.ok(await main.locator('ul ul a').count() > 0);
  assert.equal(await main.locator('a[data-playable]').count(), await main.locator('ul ul a').count(), 'only playable items');
  await main.getByLabel('Playable sets only').uncheck();
  await main.getByRole('searchbox').fill('cramer');
  assert.deepEqual(await main.locator('ul ul a').allTextContents(), ["n×n determinants: cofactors & Cramer's rule (Coming soon)"]);
  await main.getByRole('searchbox').fill('');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.setViewportSize({ width: 1100, height: 900 });
  console.log('PASS: math lists units and learning items, highlights playable ones and filters by level, playability and name');

  // An item's page lists its practice sets; a set opens its quiz, whose
  // "choose a different set" returns to the item's page.
  await link('/en/math/arith/order-of-operations').click();
  await page.waitForURL(`${base}/en/math/arith/order-of-operations`);
  await main.getByRole('heading', { level: 1, name: 'Order of operations' }).waitFor();
  assert.deepEqual(await main.locator('ul a').evaluateAll(cards => cards.map(card => card.getAttribute('href'))),
    ['/en/math/arith/order-of-operations/1', '/en/math/arith/order-of-operations/2']);
  assert.equal(await page.title(), 'Order of operations & word problems - Order of operations | PAIBOT.app');
  await main.getByText('Japanese school year: Elementary 4', { exact: true }).waitFor();
  for (const [item, set, label] of [
    ['arith/order-of-operations', '2', 'Order of operations Practice 2'],
    ['factorization/trinomial', '1', 'Factoring trinomials'],
    ['signed/four-operations', '1', 'Negative numbers'],
    ['pythagoras/sides', '1', 'Side lengths'],
  ]) {
    await go(`math/${item}`);
    await link(`/en/math/${item}/${set}`).click();
    await page.waitForURL(`${base}/en/math/${item}/${set}`);
    await main.getByText(label, { exact: true }).last().waitFor();
    await main.getByText('1 / 5', { exact: true }).waitFor();
    await page.getByRole('link', { name: '← Choose a different set' }).click();
    await page.waitForURL(`${base}/en/math/${item}`);
  }
  assert.deepEqual(errors, []);
  console.log('PASS: item pages list their sets; sets open their quiz and link back to the item');

  // A unit without problems yet: its sets show the preparation message and are noindex.
  await go('math/matrix/operations/1');
  await main.getByRole('status').filter({ hasText: 'being prepared' }).waitFor();
  assert.equal(await page.title(), 'Matrices - Matrix addition & multiplication | PAIBOT.app');
  assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow');
  assert.equal((await page.goto(`${base}/en/math/arith/nothing`)).status(), 404);
  assert.equal((await page.goto(`${base}/en/math/arith/order-of-operations/9`)).status(), 404);
  console.log('PASS: coming-soon sets show the preparation message; unknown items and sets are 404');

  // Former URLs land on the new pages.
  for (const [from, to] of [['arith', '/ja/math'], ['units', '/ja/math'], ['level/middle', '/ja/math'],
    ['arith/order-a', '/ja/math/arith/order-of-operations/1'], ['factorization/squares-a', '/ja/math/factorization/difference-of-squares/1'],
    ['factorization/trinomial-a', '/ja/math/factorization/trinomial/1'], ['fraction/add-sub-a', '/ja/math/fraction/add-sub/1']]) {
    await page.goto(`${base}/ja/math/${from}`);
    assert.equal(new URL(page.url()).pathname, to, from);
  }
  assert.deepEqual(errors, []);
  console.log('PASS: former unit, entry and set URLs redirect to the new pages');
}
