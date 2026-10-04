import { publicPaths, localizedUrl, languageAlternates, pathLocales } from '../lib/seo';
import { siteOrigin as configuredOrigin } from '../lib/seo.server';
import { ownerOfPath, siteOfHost, siteOrigins } from '../lib/sites';
import type { Route } from './+types/sitemap';

function escapeXml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// One sitemap per site: each lists its cover and the pages it owns (src/lib/sites.ts); the app also the shared pages,
// the hub only the shared pages.
const SHARED = /^\/(about|supporter|legal)(\/|$)/;
export function loader({ request }: Route.LoaderArgs) {
  const site = siteOfHost(new URL(request.url).hostname);
  const siteOrigin = siteOrigins(configuredOrigin)[site];
  const paths = publicPaths.filter(path => path === '' || ownerOfPath(path) === site || (site === 'hub' ? SHARED.test(path) : site === 'app' && ownerOfPath(path) === null));
  const entries = paths.flatMap(path => pathLocales(path).map(locale => {
    const alternates = languageAlternates(siteOrigin, path);
    const links = Object.entries(alternates)
      .map(([hreflang, href]) => `<xhtml:link rel="alternate" hreflang="${hreflang}" href="${escapeXml(href)}" />`)
      .join('');
    return `<url><loc>${escapeXml(localizedUrl(siteOrigin, locale, path))}</loc>${links}</url>`;
  }));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${entries.join('')}</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}
