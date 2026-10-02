// PAIBOT is several sites on one domain, served by one Worker and told apart by host name:
//   hub    paibot.dev        the cover of the three sites (also localhost)
//   app    app.paibot.dev    the tools (app-dev.paibot.dev in development)
//   learn  learn.paibot.dev  the drills (learn-dev.paibot.dev)
//   tools  tools.paibot.dev  the tools you open and use (network, developer and everyday ones) and, later, monitoring
//   doc    doc.paibot.dev    articles - a separate static site, listed here only so the header can link to it
// Locally, localhost is the hub and app.localhost / learn.localhost the others (browsers resolve *.localhost).
import { APP_CATALOG } from "./app-catalog.ts";

export type SiteKey = "hub" | "app" | "learn" | "tools" | "doc";
export const SITE_KEYS: readonly SiteKey[] = ["hub", "app", "learn", "tools", "doc"];

const SUBDOMAIN = /^(app|learn|tools|doc)(-dev)?\.(.+)$/;

// Which site a request for this host name is for. An unknown host (localhost, the apex, a workers.dev preview) is the hub.
export function siteOfHost(hostname: string): SiteKey {
  return (SUBDOMAIN.exec(hostname)?.[1] as SiteKey | undefined) ?? "hub";
}

// The origin of each site, given any one origin of the group (the request's, or the configured SITE_URL):
// https://app.paibot.dev -> hub https://paibot.dev, learn https://learn.paibot.dev, ...; http://learn.localhost:3038 -> ...
export function siteOrigins(origin: string): Record<SiteKey, string> {
  const url = new URL(origin);
  const match = SUBDOMAIN.exec(url.hostname);
  const root = match?.[3] ?? url.hostname, suffix = match?.[2] ?? "";
  const at = (host: string) => `${url.protocol}//${host}${url.port ? `:${url.port}` : ""}`;
  return { hub: at(root), app: at(`app${suffix}.${root}`), learn: at(`learn${suffix}.${root}`), tools: at(`tools${suffix}.${root}`), doc: at(`doc${suffix}.${root}`) };
}

const TOOL_CATEGORIES = ["network", "dev", "utility"];
const TOOL_PATH = new RegExp(`^/(${APP_CATALOG.filter(app => app.href && TOOL_CATEGORIES.includes(app.category)).map(app => app.href!.slice(1)).join("|")})(/|\\.data$|$)`);

// Which site owns a path (without the locale prefix), so the others can send a visitor there; null when any site
// may serve it (each cover, and the pages every site shares).
export function ownerOfPath(path: string): SiteKey | null {
  if (path === "" || path === "/") return null;
  // `.data` is a page's data request (the same page, fetched by the client router), so it follows its page.
  if (/^\/(about|supporter|legal|sign-in|sign-up|profile)(\/|\.data$|$)/.test(path)) return null;
  if (/^\/math(\/|\.data$|$)/.test(path)) return "learn";
  // The tools of the catalog in the categories below: stateless ones you open and use. Their paths come from the
  // catalog, so a new tool needs no edit here.
  return TOOL_PATH.test(path) ? "tools" : "app";
}

// The sites the header's switcher lists, in order. A site joins once it is served (doc.paibot.dev is not yet).
export const SWITCHER: readonly { key: Exclude<SiteKey, "hub">; live: boolean }[] = [
  { key: "app", live: true },
  { key: "learn", live: true },
  { key: "tools", live: true },
  { key: "doc", live: false },
];
