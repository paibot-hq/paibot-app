import { test } from 'node:test';
import assert from 'node:assert/strict';
import { marketOverview, heatmap, SYMBOLS, TABS, WIDGET_LOCALE, SITE, scriptUrl, CONSENT_KEY } from './widgets.ts';

const titles = { indices: 'Indices', currencies: 'Currencies', others: 'Others' };

test('every tab has symbols named EXCHANGE:SYMBOL, with none twice', () => {
  const all = TABS.flatMap(tab => SYMBOLS[tab]);
  assert.ok(all.length >= 15);
  for (const symbol of all) assert.match(symbol, /^[A-Z0-9_]+:[A-Z0-9.]+$/, symbol);
  assert.equal(new Set(all).size, all.length, 'no symbol is in two places');
  for (const tab of TABS) assert.ok(SYMBOLS[tab].length >= 4, tab);
});

test('the market overview has the tabs, titled in the visitor\'s words, with the theme and the language', () => {
  const config = marketOverview('ja', 'dark', titles);
  assert.equal(config.colorTheme, 'dark');
  assert.equal(config.locale, 'ja');
  assert.deepEqual(config.tabs.map(t => t.title), ['Indices', 'Currencies', 'Others']);
  assert.deepEqual(config.tabs[0].symbols[0], { s: SYMBOLS.indices[0] });
  assert.equal(marketOverview('zh', 'light', titles).locale, 'zh_CN');
  assert.equal(marketOverview('en', 'light', titles).locale, 'en');
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(config)), 'it is plain JSON, as the widget reads it from the script');
});

test('the heatmap follows the theme and the language and is the S&P 500 by sector', () => {
  const config = heatmap('en', 'light');
  assert.equal(config.dataSource, 'SPX500');
  assert.equal(config.grouping, 'sector');
  assert.equal(config.colorTheme, 'light');
  assert.equal(heatmap('zh', 'dark').locale, 'zh_CN');
});

test('scripts and links point at TradingView, and the choice has a key', () => {
  assert.equal(scriptUrl('market-overview'), 'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js');
  assert.equal(scriptUrl('stock-heatmap'), 'https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js');
  for (const link of Object.values(SITE)) assert.match(link, /^https:\/\/[a-z]+\.tradingview\.com\/$/);
  assert.deepEqual(Object.keys(WIDGET_LOCALE).sort(), Object.keys(SITE).sort());
  assert.match(CONSENT_KEY, /tradingview/);
});
