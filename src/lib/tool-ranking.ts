import { APP_CATALOG, type AppData } from "./app-catalog.ts";

// The tool ranking: how often people enter each tool from outside the site, counted per tool and per day in D1
// (tool_views) by routes/api.view.ts from the page's own beacon (lib/view-beacon.ts), and ranked over the last
// RANK_DAYS days (the top page shows the first few, /ranking all of them). Pure functions, so they are tested
// without a Worker.

export const RANK_DAYS = 7;
export const TOP_COUNT = 5;

const byHref = new Map((APP_CATALOG as readonly AppData[]).filter(app => app.status === "published" && app.href && !app.private).map(app => [app.href!, app.slug]));

// The tool a request is a view of, or null: /ja/noise and /ja/noise.data (the client router's fetch of the same page)
// are the noise tool; /en/math/arith/order is math; the top page, other pages, files and the API are no tool.
export function toolOf(pathname: string): string | null {
  const m = /^\/(?:ja|en|zh)\/([^/.]+)(?:[/.].*)?$/.exec(pathname);
  if (!m) return null;
  // A file under a language (an image, say) is not a view; the client router's .data is.
  const rest = pathname.slice(4 + m[1].length);
  if (rest && !rest.startsWith("/") && rest !== ".data") return null;
  return byHref.get(`/${m[1]}`) ?? null;
}

// A view is counted at a visit's entrance: the page the browser opened from outside this site (a search result, a link
// on another site, a bookmark or a typed address), not the links between our own pages, so that a tool of 269 drill
// pages is ranked like a one-page tool. The beacon is sent once per document load with the page's path and referrer
// (lib/view-beacon.ts); this turns it into the tool to count, or null. Anyone can POST the endpoint junk, so every
// field is checked here rather than trusted.
export function beaconView(path: unknown, referrer: unknown, origin: string): string | null {
  if (typeof path !== "string" || path.length > 512) return null;
  if (typeof referrer !== "string" || referrer.length > 4096) return null;
  // A page reached from one of our own pages is the same visit, not an entrance. No referrer is a bookmark or a
  // typed address; a referrer that is not a URL never comes from a browser.
  if (referrer) {
    try { if (new URL(referrer).origin === origin) return null; } catch { return null; }
  }
  return toolOf(path);
}

// Counted: browsers only (every browser's user agent starts "Mozilla/"), so scripts and this site's own checks, which
// fetch every page from Node on each deploy, are not; and of browsers, not crawlers, link previews or headless ones
// (this site's browser tests). Crawlers that wear a plain browser User-Agent slip past this, which is why views are
// counted from the page's beacon (script execution) rather than from the page request.
export const isBot = (userAgent: string) => !userAgent.startsWith("Mozilla/") || /bot|crawl|spider|slurp|preview|headless|playwright|lighthouse/i.test(userAgent);

// A day as counted: the date in Japan (UTC+9, no daylight saving), YYYY-MM-DD.
export const dayOf = (time: Date) => new Date(time.getTime() + 9 * 3_600_000).toISOString().slice(0, 10);

// The first day of the last `days` days, today included.
export const firstDay = (now: Date, days: number) => dayOf(new Date(now.getTime() - (days - 1) * 86_400_000));
