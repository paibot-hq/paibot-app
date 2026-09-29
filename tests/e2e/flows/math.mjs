// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, base, go, errors }) {
  // A missing translation renders its key (e.g. "App.math.pythagorasLink").
  await go('math');
  assert.ok(!(await main.textContent()).includes('App.math.'), 'no untranslated keys on the math landing');
  assert.equal(await main.getByRole('combobox').count(), 0, 'the Suken filter is Japanese only');
  // Unit titles by href: a unit and one of its sets can share a name.
  await main.locator('a[href="/en/math/factorization"]').click();
  await page.waitForURL(`${base}/en/math/factorization`);
  // Matched by the exact set name: the "(larger numbers)" set starts the same.
  await main.getByRole('link').filter({ has: page.getByText('Factoring trinomials', { exact: true }) }).click();
  await page.waitForURL(`${base}/en/math/factorization/trinomial-a`);
  await main.locator('h1').waitFor();
  await main.getByText('Factoring trinomials', { exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  console.log('PASS: math landing and unit list link through to the factoring set picker and set trinomial-a');
  await go('math');
  await main.locator('a[href="/en/math/arith"]').click();
  await page.waitForURL(`${base}/en/math/arith`);
  await main.getByRole('link', { name: /^Multi-step word problems/ }).click();
  await page.waitForURL(`${base}/en/math/arith/word-b`);
  await main.getByText('Multi-step word problems', { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS: math landing links through to the arithmetic set picker and set word-b');
  await go('math');
  await main.locator('a[href="/en/math/signed"]').click();
  await page.waitForURL(`${base}/en/math/signed`);
  await page.locator('h1', { hasText: 'Negative numbers' }).waitFor();
  await main.locator('a[href="/en/math/signed/four-ops-a"]').click();
  await page.waitForURL(`${base}/en/math/signed/four-ops-a`);
  await main.getByText('Negative numbers', { exact: true }).last().waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS: math landing links through to the signed-number set picker and set four-ops-a');
  await go('math');
  await main.locator('a[href="/en/math/fraction"]').click();
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
  await go('math');
  assert.deepEqual(await main.getByRole('heading', { level: 2 }).allTextContents(), [
    'Number', 'Algebra', 'Functions', 'Geometry & measurement',
    'Statistics & probability', 'Sets & logic', 'Vectors & matrices', 'Calculus',
  ]);
  // Every set is listed and linked; only sets with problems are highlighted.
  const chip = href => main.locator(`a[href="${href}"]`);
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
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  console.log('PASS: unit list shows every set, highlights playable ones and filters by level, playability and name');
  await main.locator('a[href="/en/math/matrix"]').click();
  await page.waitForURL(`${base}/en/math/matrix`);
  for (const name of ['Matrix addition & multiplication', '2×2 determinants', 'Inverse matrices']) {
    await main.getByRole('link', { name: `${name} Coming soon`, exact: true }).waitFor();
  }
  assert.equal(await page.title(), 'Matrices | PAIBOT.app');
  assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  console.log('PASS: math domains and coming-soon matrices unit with all three sets');
  // Former entry pages now land on /math.
  for (const path of ['units', 'level/middle', 'kentei']) {
    await page.goto(`${base}/ja/math/${path}`);
    assert.equal(new URL(page.url()).pathname, '/ja/math', path);
  }
  await page.waitForFunction(() => document.documentElement.dataset.theme);
  await main.getByRole('combobox', { name: '数検の級で絞り込む' }).selectOption('3');
  assert.ok(await main.locator('a[href="/ja/math/factorization"]').isVisible());
  assert.equal(await main.locator('a[href="/ja/math/arith"]').count(), 0, 'only units for grade 3');
  await main.getByText('日本数学検定協会とは関係ありません', { exact: false }).waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  console.log('PASS: former entry pages redirect to /math, and the Japanese Suken filter lists a grade\'s units');
}
