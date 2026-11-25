import { siteOrigin, isIndexable } from '../lib/seo.server';

// Only production is crawled; every other deployment (dev, previews) asks to be left alone.
export function loader() {
  const body = isIndexable
    ? `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${siteOrigin}/sitemap.xml\n`
    : 'User-agent: *\nDisallow: /\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
}
