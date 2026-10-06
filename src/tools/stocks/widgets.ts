// The configuration of the TradingView widgets shown on the stocks page (https://www.tradingview.com/widget-docs/): the market
// overview with its tabs of indices, currencies and others, and the heatmap of the S&P 500. TradingView supplies and licenses the data;
// we only describe what to show. Pure functions, tested without a browser.

export type Locale = "ja" | "en" | "zh";
export type Theme = "light" | "dark";

// The language code each widget wants.
export const WIDGET_LOCALE: Record<Locale, string> = { ja: "ja", en: "en", zh: "zh_CN" };
// TradingView's own site in the visitor's language, for the link under each widget.
export const SITE: Record<Locale, string> = { ja: "https://jp.tradingview.com/", en: "https://www.tradingview.com/", zh: "https://cn.tradingview.com/" };

export type Tab = "indices" | "currencies" | "others";
export const TABS: readonly Tab[] = ["indices", "currencies", "others"];

// Symbols as TradingView names them: EXCHANGE:SYMBOL.
export const SYMBOLS: Record<Tab, string[]> = {
  // Chosen because the free widget shows a price for them (KOSPI and TOPIX, for one, show none).
  indices: ["FOREXCOM:SPXUSD", "FOREXCOM:NSXUSD", "FOREXCOM:DJI", "INDEX:NKY", "HSI:HSI", "SSE:000001", "BSE:SENSEX", "INDEX:DEU40", "INDEX:CAC40", "FOREXCOM:UKXGBP", "OANDA:AU200AUD"],
  currencies: ["FX_IDC:USDJPY", "FX_IDC:EURJPY", "FX_IDC:GBPJPY", "FX_IDC:AUDJPY", "FX_IDC:EURUSD", "FX_IDC:USDCNY"],
  others: ["BITSTAMP:BTCUSD", "BITSTAMP:ETHUSD", "TVC:GOLD", "TVC:SILVER", "TVC:USOIL"],
};

export function marketOverview(locale: Locale, theme: Theme, titles: Record<Tab, string>) {
  return {
    colorTheme: theme,
    dateRange: "1D",
    showChart: true,
    locale: WIDGET_LOCALE[locale],
    width: "100%",
    height: "100%",
    largeChartUrl: "",
    isTransparent: false,
    showSymbolLogo: true,
    showFloatingTooltip: false,
    tabs: TABS.map(tab => ({ title: titles[tab], symbols: SYMBOLS[tab].map(s => ({ s })), originalTitle: tab })),
  };
}

export function heatmap(locale: Locale, theme: Theme) {
  return {
    exchanges: [],
    dataSource: "SPX500",
    grouping: "sector",
    blockSize: "market_cap_basic",
    blockColor: "change",
    locale: WIDGET_LOCALE[locale],
    symbolUrl: "",
    colorTheme: theme,
    hasTopBar: false,
    isDataSetEnabled: false,
    isZoomEnabled: true,
    hasSymbolTooltip: true,
    isMonoSize: false,
    width: "100%",
    height: "100%",
  };
}

// The script of a widget: https://s3.tradingview.com/external-embedding/embed-widget-<name>.js
export const scriptUrl = (name: "market-overview" | "stock-heatmap") => `https://s3.tradingview.com/external-embedding/embed-widget-${name}.js`;

// What the visitor chose is kept in the browser: the widgets are only loaded after a click, and again on later visits if they said so.
export const CONSENT_KEY = "paibot-tradingview";
