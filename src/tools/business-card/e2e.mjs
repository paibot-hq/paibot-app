// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go }) {
  await go('business-card');
  await main.getByLabel('Name', { exact: true }).fill('Alex Taylor');
  await page.waitForFunction(() => document.querySelector('main [role=img]')?.textContent?.includes('Alex Taylor'));
  await main.getByRole('radio', { name: 'Stripe' }).click();
  const [cardDownload] = await Promise.all([page.waitForEvent('download'), main.getByRole('button', { name: 'Save image (PNG)' }).click()]);
  assert.equal(cardDownload.suggestedFilename(), 'business-card.png');
  const [pdfDownload] = await Promise.all([page.waitForEvent('download'), main.getByRole('button', { name: 'Save PDF (1 card)' }).click()]);
  assert.equal(pdfDownload.suggestedFilename(), 'business-card.pdf');
  const pdfStart = await new Promise(async resolve => { const chunks = []; for await (const chunk of await pdfDownload.createReadStream()) chunks.push(chunk); resolve(Buffer.concat(chunks)); });
  assert.ok(pdfStart.subarray(0, 8).toString() === '%PDF-1.4' && pdfStart.includes('/DCTDecode'), 'the PDF download is a PDF with the card image');
  await page.reload();
  await main.getByLabel('Name', { exact: true }).and(page.locator('[value="Alex Taylor"]')).waitFor();
  console.log('PASS: business card previews typed details, saves a PNG and a one-card PDF and keeps the input after reload (see card.test.mjs for the contact block)');
}
