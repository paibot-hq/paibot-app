// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, base, go, errors }) {
  const chip = href => main.locator(`a[href="${href}"]`);
  // A missing translation renders its key (e.g. "App.math.pythagorasLink").
  await go('math');
  assert.ok(!(await main.textContent()).includes('App.math.'), 'no untranslated keys on the math page');
  assert.deepEqual(await main.getByRole('heading', { level: 2 }).allTextContents(), [
    'Number', 'Algebra', 'Functions', 'Geometry & measurement',
    'Statistics & probability', 'Sets & logic', 'Vectors & matrices', 'Calculus',
  ]);
  // Units are headings, not links: every set links straight to its quiz.
  assert.equal(await main.locator('a[href="/en/math/factorization"]').count(), 0, 'no unit pages');
  assert.equal(await chip('/en/math/factorization/trinomial-a').getAttribute('data-playable'), 'true');
  assert.equal(await chip('/en/math/fraction/simplify-a').getAttribute('data-playable'), null);
  await main.getByRole('button', { name: 'Higher', exact: true }).click();
  assert.deepEqual(await main.getByRole('heading', { level: 2 }).allTextContents(), ['Statistics & probability', 'Sets & logic', 'Vectors & matrices', 'Calculus']);
  await main.getByRole('button', { name: 'Higher', exact: true }).click();
  await main.getByLabel('Playable sets only').check();
  assert.deepEqual(await main.getByRole('heading', { level: 2 }).allTextContents(), ['Number', 'Algebra', 'Geometry & measurement']);
  assert.equal(await main.locator('a[data-playable]').count(), await main.locator('ul ul a').count(), 'only playable sets');
  await main.getByLabel('Playable sets only').uncheck();
  await main.getByRole('searchbox').fill('determinant');
  assert.deepEqual(await main.locator('ul ul a').allTextContents(), ['2×2 determinants (Coming soon)']);
  await main.getByRole('searchbox').fill('');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.setViewportSize({ width: 1100, height: 900 });
  console.log('PASS: math lists every set, highlights playable ones and filters by level, playability and name');

  // Each set opens its quiz, and "choose a different set" returns to /math.
  for (const [href, label] of [
    ['/en/math/factorization/trinomial-a', 'Factoring trinomials'],
    ['/en/math/arith/word-b', 'Multi-step word problems'],
    ['/en/math/signed/four-ops-a', 'Negative numbers'],
    ['/en/math/pythagoras/sides-a', 'Side lengths'],
  ]) {
    await go('math');
    await chip(href).click();
    await page.waitForURL(`${base}${href}`);
    await main.getByText(label, { exact: true }).last().waitFor();
    await page.getByRole('link', { name: '← Choose a different set' }).click();
    await page.waitForURL(`${base}/en/math`);
  }
  assert.deepEqual(errors, []);
  console.log('PASS: sets open their quiz and link back to /math');

  // A coming-soon set page shows the preparation message and is noindex.
  await go('math');
  await chip('/en/math/fraction/simplify-a').click();
  await page.waitForURL(`${base}/en/math/fraction/simplify-a`);
  await main.getByRole('status').filter({ hasText: 'being prepared' }).waitFor();
  assert.equal(await page.title(), 'Fractions - Simplifying & common denominators | PAIBOT.app');
  assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow');
  assert.deepEqual(errors, []);
  console.log('PASS: coming-soon sets show the preparation message');

  // Former pages (unit set pickers, entry pages by area and level) land on /math.
  for (const path of ['arith', 'factorization', 'fraction', 'units', 'level/middle']) {
    await page.goto(`${base}/ja/math/${path}`);
    assert.equal(new URL(page.url()).pathname, '/ja/math', path);
  }
  console.log('PASS: former pages redirect to /math');
}
