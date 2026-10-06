// Browser flow for this tool, run by tests/e2e/tools.mjs against a preview.
import assert from 'node:assert/strict';

export default async function ({ page, main, go, base }) {
  // TradingView itself is not contacted: its scripts are answered by a stub that adds a marker where the widget would be.
  const requested = [];
  await page.route('https://s3.tradingview.com/**', route => {
    requested.push(route.request().url());
    return route.fulfill({ contentType: 'text/javascript', body: "document.currentScript.previousElementSibling.insertAdjacentHTML('beforeend', '<span data-stub=\"yes\">widget</span>');" });
  });
  await go('stocks');
  // Nothing is loaded from TradingView, and nothing is stored, until the visitor asks.
  assert.equal(await page.locator('script[src*="tradingview"]').count(), 0, 'no TradingView script before the click');
  assert.equal(requested.length, 0);
  assert.equal(await page.evaluate(() => localStorage.getItem('paibot-tradingview')), null);
  await main.locator('[data-stocks="show"]').click();
  await page.waitForFunction(() => document.querySelectorAll('script[src*="embed-widget-"]').length === 2);
  // Each widget is built once, and with the whole settings (no second build that would leave a script running in a removed container).
  await page.waitForTimeout(400);
  assert.equal(requested.length, 2, 'each script is fetched once');
  await page.waitForFunction(() => document.querySelectorAll('[data-stub="yes"]').length === 2);
  assert.ok(requested.some(url => url.includes('embed-widget-market-overview.js')) && requested.some(url => url.includes('embed-widget-stock-heatmap.js')));
  // The settings are written inside the script tag, as the widget reads them: the tabs of the market overview, in the language shown.
  const settings = await page.evaluate(() => JSON.parse(document.querySelector('script[src*="market-overview"]').text));
  assert.equal(settings.locale, 'en');
  assert.deepEqual(settings.tabs.map(tab => tab.title), ['Indices', 'Currencies', 'Others']);
  assert.equal(await main.getByRole('link', { name: /TradingView/ }).count(), 2, 'TradingView is credited under each widget');
  // The choice is remembered: after a reload the widgets come back by themselves.
  requested.length = 0;
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('script[src*="embed-widget-"]').length === 2);
  await page.waitForTimeout(400);
  assert.equal(requested.length, 2, 'after a reload too, each script is fetched once');
  // ...and can be taken back, which removes the widgets and the stored choice.
  await main.locator('[data-stocks="hide"]').click();
  await main.locator('[data-stocks="show"]').waitFor();
  assert.equal(await page.locator('script[src*="tradingview"]').count(), 0);
  assert.equal(await page.evaluate(() => localStorage.getItem('paibot-tradingview')), null);
  // The page's security policy lets the widget's frame in, and nothing broader.
  const csp = (await page.request.get(`${base}/en/stocks`)).headers()['content-security-policy'];
  assert.match(csp, /frame-src [^;]*https:\/\/www\.tradingview-widget\.com/);
  assert.doesNotMatch(csp, /frame-src [^;]*\*\.tradingview/);
  console.log('PASS: stocks: nothing loads until asked, the widgets come with their settings and credit, the choice is remembered and can be undone, the CSP allows the frame');
}
