// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
export default async function ({ main, go, result }) {
  await go('json');
  await main.locator('textarea').fill('{"a":1}');
  await result('{\n  "a": 1\n}');
  await main.getByRole('button', { name: 'Minify', exact: true }).click();
  await result('{"a":1}');
  await main.locator('textarea').fill('{');
  await main.getByText("That isn't valid JSON").waitFor();
  console.log('PASS: JSON format/minify/validation');
}
