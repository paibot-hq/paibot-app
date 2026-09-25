import { createRequestHandler } from 'react-router';
import { locales } from '../src/i18n/routing';
import { siteOrigin, isIndexable } from '../src/lib/seo.server';
import { buildContentSecurityPolicy } from '../src/lib/security-headers.server';

const handle = createRequestHandler(() => import('virtual:react-router/server-build'), import.meta.env.MODE);
const AUTH_PATH = new RegExp(`^/(${locales.join('|')})/(sign-in|sign-up|math)(/|$)`);
const csp = buildContentSecurityPolicy();

export default {
  async fetch(request: Request) {
    const url = new URL(request.url);
    let response: Response;
    if (url.pathname === '/robots.txt') {
      const body = isIndexable
        ? `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${siteOrigin}/sitemap.xml\n`
        : 'User-agent: *\nDisallow: /\n';
      response = new Response(body, { headers: { 'Content-Type': 'text/plain' } });
    } else {
      response = await handle(request);
    }
    const secured = new Response(response.body, response);
    if (!isIndexable || response.status >= 400 || AUTH_PATH.test(url.pathname)) {
      secured.headers.set('X-Robots-Tag', 'noindex');
    }
    secured.headers.set('X-Content-Type-Options', 'nosniff');
    secured.headers.set('X-Frame-Options', 'DENY');
    secured.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    secured.headers.set('Content-Security-Policy', csp);
    return secured;
  },
};
