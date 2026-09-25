import { createRequestHandler } from 'react-router';
import { locales } from '../app/i18n/routing';
import { siteOrigin, isIndexable } from '../app/lib/seo.server';
import { buildContentSecurityPolicy } from '../app/lib/security-headers.server';

const handle = createRequestHandler(() => import('virtual:react-router/server-build'), import.meta.env.MODE);
const AUTH_PATH = new RegExp(`^/(${locales.join('|')})/(sign-in|sign-up)(/|$)`);
const csp = buildContentSecurityPolicy();

export default {
  async fetch(request: Request) {
    const url = new URL(request.url);
    if (url.pathname === '/robots.txt') {
      const body = isIndexable
        ? `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${siteOrigin}/sitemap.xml\n`
        : 'User-agent: *\nDisallow: /\n';
      return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
    }
    const response = await handle(request);
    const secured = new Response(response.body, response);
    if (!isIndexable || AUTH_PATH.test(url.pathname)) {
      secured.headers.set('X-Robots-Tag', 'noindex');
    }
    secured.headers.set('X-Content-Type-Options', 'nosniff');
    secured.headers.set('X-Frame-Options', 'DENY');
    secured.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    secured.headers.set('Content-Security-Policy', csp);
    return secured;
  },
};
