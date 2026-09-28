import { locales, defaultLocale, isLocale, type Locale } from "../i18n/routing.ts";

// Pure helpers only — no env access here. This module is reachable from
// client-rendered components (via PublicHead), so it must bundle safely for
// the browser. siteOrigin/isIndexable read Workers runtime env and live in
// seo.server.ts instead, which only the root loader may import (see there
// for why: importing "cloudflare:workers" from anything client-reachable
// breaks the client build).

// Add only real public pages as tools become available.
export const publicPaths = ["", "/apps", "/daily", "/game", "/utility", "/study", "/dev", "/network", "/about", "/supporter", "/legal/terms", "/legal/privacy", "/legal/commerce", "/ip", "/domain", "/cidr", "/site-check", "/wc", "/arith", "/quiz", "/age", "/clock", "/calendar", "/life-calendar", "/password", "/base64", "/json", "/urlencode", "/dice", "/reaction", "/timing", "/pinball", "/stopwatch", "/math", "/math/pythagoras", "/math/pythagoras/sides-a", "/math/factorization", "/math/factorization/trinomial-a", "/math/arith", "/math/arith/add-sub-a", "/math/signed", "/math/signed/four-ops-a"] as const;

export function localizedUrl(origin: string, locale: Locale, path: string) {
  return `${origin}/${locale}${path}`;
}

export function languageAlternates(origin: string, path: string): Record<Locale | "x-default", string> {
  return {
    ...(Object.fromEntries(locales.map(locale => [locale, localizedUrl(origin, locale, path)])) as Record<Locale, string>),
    "x-default": localizedUrl(origin, defaultLocale, path),
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
