// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, base, go, errors }) {
  // A missing translation renders its key (e.g. "App.math.pythagorasLink").
  await go('math');
  assert.ok(!(await main.textContent()).includes('App.math.'), 'no untranslated keys on the math landing');
  // Anchored: other units' summaries (e.g. quadratics) also mention factoring.
  await main.getByRole('link', { name: /^Factoring/ }).click();
  await page.waitForURL(`${base}/en/math/factorization`);
  // Matched by the exact set name: the "(larger numbers)" set starts the same.
  await main.getByRole('link').filter({ has: page.getByText('Factoring trinomials', { exact: true }) }).click();
  await page.waitForURL(`${base}/en/math/factorization/trinomial-a`);
  await main.locator('h1').waitFor();
  await main.getByText('Factoring trinomials', { exact: true }).waitFor();
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
  await go('math');
  assert.deepEqual(await main.getByRole('heading', { level: 2 }).allTextContents(), [
    'Number', 'Algebra', 'Functions', 'Geometry & measurement',
    'Statistics & probability', 'Sets & logic', 'Vectors & matrices', 'Calculus',
  ]);
  await main.getByRole('link', { name: /^Matrices Higher Coming soon/ }).click();
  await page.waitForURL(`${base}/en/math/matrix`);
  for (const name of ['Matrix addition & multiplication', '2×2 determinants', 'Inverse matrices']) {
    await main.getByRole('link', { name: `${name} Coming soon`, exact: true }).waitFor();
  }
  assert.equal(await page.title(), 'Matrices | PAIBOT.app');
  assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  console.log('PASS: math domains and coming-soon matrices unit with all three sets');
}
