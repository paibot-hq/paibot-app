// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
export default async function ({ main, go, result }) {
  await go('domain');
  await main.getByLabel('example.com').fill('not a domain');
  await main.getByRole('button', { name: 'Look up', exact: true }).click();
  await result("That doesn't look like a valid domain name.");
  console.log('PASS: domain lookup rejects invalid input (no socket opened; see e2e whois for the real WHOIS lookup)');
}
