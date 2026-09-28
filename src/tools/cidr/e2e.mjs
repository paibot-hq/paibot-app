// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go, errors }) {
  await go('cidr');
  const cidrValue = key => page.locator(`[data-cidr="${key}"] dd`).textContent();
  const cidrInput = main.getByLabel('IPv4 address and prefix length');
  await cidrInput.fill('10.20.30.40/255.255.240.0');
  await page.waitForFunction(() => document.querySelector('[data-cidr="network"] dd')?.textContent === '10.20.16.0/20');
  assert.equal(await cidrValue('broadcast'), '10.20.31.255');
  assert.equal(await cidrValue('hostRange'), '10.20.16.1 – 10.20.31.254');
  assert.equal(await cidrValue('hostCount'), '4,094');
  assert.equal(await cidrValue('kind'), 'Private (RFC 1918)');
  await cidrInput.fill('192.168.1.300/24');
  await main.getByRole('alert').waitFor();
  assert.equal(await page.locator('[data-cidr]').count(), 0);
  await page.setViewportSize({ width: 390, height: 844 });
  await cidrInput.fill('203.0.113.7/31');
  await main.getByText(/point-to-point/).waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.setViewportSize({ width: 1100, height: 900 });
  assert.deepEqual(errors, []);
  console.log('PASS: CIDR calculator: subnet mask input, host range and count, address type, invalid input, /31 note, mobile width');
}
