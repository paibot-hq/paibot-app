// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
export default async function ({ page, main, go, errors }) {
  await go('pinball');
  await main.getByText('Hold Launch and release to shoot the ball', { exact: true }).waitFor();
  await page.keyboard.down('Space');
  await page.waitForTimeout(700);
  await page.keyboard.up('Space');
  // The launch clears the hint; the flippers answer to keys without errors.
  await page.waitForFunction(() => !document.querySelector('main [aria-live]')?.textContent);
  await page.keyboard.down('KeyZ'); await page.keyboard.down('Slash');
  await page.waitForTimeout(200);
  await page.keyboard.up('KeyZ'); await page.keyboard.up('Slash');
  console.log('PASS: pinball launches with Space and flips with Z and / (see table.test.mjs)');
}
