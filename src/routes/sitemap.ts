import { publicPaths, localizedUrl, languageAlternates, pathLocales } from '../lib/seo';
import { siteOrigin } from '../lib/seo.server';

// Set by vite.config.ts at build time.
declare const __BUILD_DATE__: string;
const lastmod = typeof __BUILD_DATE__ === 'string' ? `<lastmod>${__BUILD_DATE__}</lastmod>` : '';

function escapeXml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function loader() {
  const entries = publicPaths.flatMap(path => pathLocales(path).map(locale => {
    const alternates = languageAlternates(siteOrigin, path);
    const links = Object.entries(alternates)
      .map(([hreflang, href]) => `<xhtml:link rel="alternate" hreflang="${hreflang}" href="${escapeXml(href)}" />`)
      .join('');
    return `<url><loc>${escapeXml(localizedUrl(siteOrigin, locale, path))}</loc>${lastmod}${links}</url>`;
  }));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${entries.join('')}</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}
