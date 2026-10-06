// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';
export default async function ({ page, go, result }) {
  await page.route('**/api/ip', route => route.fulfill({ json: { ip: '203.0.113.7', country: 'JP', region: 'Tokyo', city: 'Shinjuku', timezone: 'Asia/Tokyo', asn: 64500, organization: 'Example Net', colo: 'NRT', protocol: 'HTTP/3', tls: 'TLSv1.3', userAgent: 'Test Agent/1.0', acceptLanguage: 'ja,en;q=0.8' } }));
  await go('ip');
  await result('192.0.2.10'); await result('2001:db8::10');
  // The connection as the site sees it, and the browser's own facts.
  const details = page.locator('main dl');
  await details.first().waitFor();
  const text = await page.locator('main').innerText();
  for (const expected of ['Example Net · AS64500', 'Japan (JP) / Tokyo / Shinjuku', 'Asia/Tokyo', 'NRT', 'HTTP/3 · TLSv1.3', 'Test Agent/1.0']) assert.ok(text.includes(expected), expected);
  assert.ok(text.includes('Screen size') && text.includes('Do Not Track'), 'the browser section');

  await page.route('https://ipv6.icanhazip.com/**', route => route.fulfill({ status: 503, body: '', headers: { 'Access-Control-Allow-Origin': '*' } }));
  await page.unroute('**/api/ip');
  await page.route('**/api/ip', route => route.fulfill({ status: 500, body: 'x' }));
  await go('ip');
  await result('192.0.2.10'); await result('Not available');
  await page.getByText('The connection details could not be loaded.').waitFor();
  console.log('PASS: IP results and one-protocol failure (mocked network)');
}
