import { locales, defaultLocale, isLocale } from "../i18n/routing";
import { localizedUrl, languageAlternates, ogLocales } from "../lib/seo";
import { useSiteMeta } from "../root";

// Renders the <title>/<meta>/<link> tags for a public, indexable page.
// React hoists these into <head> regardless of where they render in the
// tree, so this can be dropped directly into any route's leaf component —
// see https://react.dev/reference/react-dom/components/title. Only one
// route in the tree should render this per navigation (leaf pages only,
// never root) to avoid duplicate canonical/og tags. `title` is used verbatim
// (not auto-suffixed) — pass "X | PAIBOT.app" for tool pages, or the bare
// site name for home, matching the main app's src/lib/seo.ts callers.
export default function PublicHead({ locale: rawLocale, path, title, description }: {
  locale: string;
  path: string;
  title: string;
  description: string;
}) {
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const { siteOrigin } = useSiteMeta();
  const url = localizedUrl(siteOrigin, locale, path);
  const alternates = languageAlternates(siteOrigin, path);
  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {locales.map(l => (
        <link key={l} rel="alternate" hrefLang={l} href={alternates[l]} />
      ))}
      <link rel="alternate" hrefLang="x-default" href={alternates["x-default"]} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="PAIBOT.app" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:locale" content={ogLocales[locale]} />
      {locales.filter(l => l !== locale).map(l => (
        <meta key={l} property="og:locale:alternate" content={ogLocales[l]} />
      ))}
      <meta property="og:image" content={`${siteOrigin}/opengraph-image.png`} />
      <meta name="twitter:image" content={`${siteOrigin}/opengraph-image.png`} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </>
  );
}
