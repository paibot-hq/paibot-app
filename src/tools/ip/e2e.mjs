// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
export default async function ({ page, go, result }) {
  await go('ip');
  await result('192.0.2.10'); await result('2001:db8::10');
  await page.route('https://ipv6.icanhazip.com/**', route => route.fulfill({ status: 503, body: '', headers: { 'Access-Control-Allow-Origin': '*' } }));
  await go('ip');
  await result('192.0.2.10'); await result('Not available');
  console.log('PASS: IP results and one-protocol failure (mocked network)');
}
