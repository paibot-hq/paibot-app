// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
export default async function ({ main, go, result }) {
  await go('wc');
  await main.locator('textarea').fill('Aあ😀');
  await result('3');
  console.log('PASS: character count');
}
