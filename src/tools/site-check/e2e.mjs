// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
export default async function ({ main, go, result }) {
  await go('site-check');
  const siteInput = main.getByLabel('https://example.com');
  await siteInput.fill('not a url');
  await main.getByRole('button', { name: 'Check', exact: true }).click();
  await result("That doesn't look like a valid URL. Enter a URL starting with http:// or https://, or a domain name.");
  await siteInput.fill('http://127.0.0.1:8080/admin');
  await main.getByRole('button', { name: 'Check', exact: true }).click();
  await result("Internal addresses such as localhost or private IP addresses can't be checked.");
  console.log('PASS: site check rejects invalid URLs and internal addresses (see e2e site-check for real requests)');
}
