import { locales, defaultLocale, isLocale, type Locale } from "../i18n/routing.ts";
import { APP_CATALOG, type AppData } from "./app-catalog.ts";

// Pure helpers only — no env access here. This module is reachable from
// client-rendered components (via PublicHead), so it must bundle safely for
// the browser. siteOrigin/isIndexable read Workers runtime env and live in
// seo.server.ts instead, which only the root loader may import (see there
// for why: importing "cloudflare:workers" from anything client-reachable
// breaks the client build).

// Every published, non-private app in the catalog is public, so a new tool
// needs no edit here; add only pages outside the catalog below.
const sitePaths = ["", "/apps", "/daily", "/game", "/utility", "/study", "/dev", "/network", "/about", "/supporter", "/legal/terms", "/legal/privacy", "/legal/commerce"];
const mathSetPaths = ["/math/pythagoras/sides-a", "/math/factorization/trinomial-a", "/math/arith/order-a", "/math/signed/four-ops-a"];
export const publicPaths: readonly string[] = [
  ...sitePaths,
  ...(APP_CATALOG as readonly AppData[]).filter(app => app.status === "published" && app.href && !app.private).map(app => app.href!),
  ...mathSetPaths,
];

export function localizedUrl(origin: string, locale: Locale, path: string) {
  return `${origin}/${locale}${path}`;
}

// Pages that exist only in some locales (the rest 404); none at the moment.
const localeOnlyPaths: Record<string, readonly Locale[]> = {};

// The locales a public path is served in, for hreflang and the sitemap.
export function pathLocales(path: string): readonly Locale[] {
  return localeOnlyPaths[path] ?? locales;
}

// x-default is the locale-less URL (e.g. https://paibot.app/), which
// routes/redirect.ts sends to the visitor's language - what Google recommends
// for auto-redirecting pages. A page missing from some locales can't use it
// (the redirect could land on a 404), so it points at a served locale.
export function languageAlternates(origin: string, path: string): Partial<Record<Locale, string>> & { "x-default": string } {
  const available = pathLocales(path);
  return {
    ...Object.fromEntries(available.map(locale => [locale, localizedUrl(origin, locale, path)])),
    "x-default": available.length === locales.length
      ? `${origin}${path || "/"}`
      : localizedUrl(origin, available.includes(defaultLocale) ? defaultLocale : available[0], path),
  };
}

export const ogLocales: Record<Locale, string> = { ja: "ja_JP", en: "en_US", zh: "zh_CN" };

// Strips the /:locale prefix from a pathname to recover the path shape used
// by publicPaths/localizedUrl (e.g. "/ja/json" -> "/json", "/ja" -> "").
export function pathWithoutLocale(pathname: string): string {
  const parts = pathname.split("/");
  if (!isLocale(parts[1])) return pathname;
  const rest = parts.slice(2).join("/");
  return rest ? `/${rest}` : "";
}
