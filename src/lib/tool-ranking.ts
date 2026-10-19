import { APP_CATALOG, type AppData } from "./app-catalog.ts";

// The tool ranking: how often each tool's page is viewed, counted per tool and per day in D1 (tool_views) by
// workers/app.ts, and ranked over the last RANK_DAYS days (the top page shows the first few, /ranking all of them).
// Pure functions, so they are tested without a Worker.

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

// Counted: browsers only (every browser's user agent starts "Mozilla/"), so scripts and this site's own checks, which
// fetch every page from Node on each deploy, are not; and of browsers, not crawlers, link previews or headless ones
// (this site's browser tests).
export const isBot = (userAgent: string) => !userAgent.startsWith("Mozilla/") || /bot|crawl|spider|slurp|preview|headless|playwright|lighthouse/i.test(userAgent);

// A day as counted: the date in Japan (UTC+9, no daylight saving), YYYY-MM-DD.
export const dayOf = (time: Date) => new Date(time.getTime() + 9 * 3_600_000).toISOString().slice(0, 10);

// The first day of the last `days` days, today included.
export const firstDay = (now: Date, days: number) => dayOf(new Date(now.getTime() - (days - 1) * 86_400_000));
