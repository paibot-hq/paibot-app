import type { Metadata } from "next";
import { routing, type Locale } from "../i18n/routing";

// Never derive canonical URLs from request headers or localhost.
export const siteOrigin = new URL(process.env.SITE_URL || "https://paibot.app").origin;
export const isIndexable = process.env.SITE_INDEXABLE === "true";
// Add only real public pages as tools become available.
export const publicPaths = ["", "/ip", "/wc", "/arith", "/age", "/password", "/base64", "/urlencode", "/dice", "/reaction", "/timing", "/math"] as const;
export function localizedUrl(locale: Locale, path: string) {
  return `${siteOrigin}/${locale}${path}`;
}
export function languageAlternates(path: string) {
  return {
    ...Object.fromEntries(routing.locales.map(locale => [locale, localizedUrl(locale, path)])),
    "x-default": localizedUrl(routing.defaultLocale, path),
  };
}
export function publicMetadata(locale: Locale, path: string, title: string, description: string): Metadata {
  return {
    title: { absolute: title }, description,
    alternates: { canonical: localizedUrl(locale, path), languages: languageAlternates(path) },
    openGraph: {
      type: "website", siteName: "PAIBOT.app", title, description,
      url: localizedUrl(locale, path),
      locale: locale === "ja" ? "ja_JP" : "en_US",
      alternateLocale: locale === "ja" ? ["en_US"] : ["ja_JP"],
    },
    twitter: { card: "summary", title, description },
  };
}
