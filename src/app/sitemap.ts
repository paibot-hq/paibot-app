import type { MetadataRoute } from "next";
import { routing } from "../i18n/routing";
import { publicPaths, localizedUrl, languageAlternates } from "../lib/seo";
export default function sitemap(): MetadataRoute.Sitemap {
  return publicPaths.flatMap(path => routing.locales.map(locale => ({
    url: localizedUrl(locale, path),
    alternates: { languages: languageAlternates(path) },
  })));
}
