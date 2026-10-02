import { publicPaths, localizedUrl, languageAlternates, pathLocales } from '../lib/seo';
import { siteOrigin as configuredOrigin } from '../lib/seo.server';
import { siteOfHost, siteOrigins } from '../lib/sites';
import type { Route } from './+types/sitemap';

function escapeXml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// One sitemap per site: the learning site lists its cover and the drills, the app everything but the drills, and the
// hub only its cover and the shared pages.
const SHARED = /^\/(about|supporter|legal)(\/|$)/;
export function loader({ request }: Route.LoaderArgs) {
  const site = siteOfHost(new URL(request.url).hostname);
  const siteOrigin = siteOrigins(configuredOrigin)[site];
  const paths = publicPaths.filter(path => path === '' || (site === 'learn' ? path.startsWith('/math') : site === 'hub' ? SHARED.test(path) : !path.startsWith('/math')));
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
