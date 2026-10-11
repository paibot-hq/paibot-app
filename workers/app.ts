import { env } from 'cloudflare:workers';
import { createRequestHandler } from 'react-router';
import { isComingSoonMathPath } from '../src/lib/math-catalog';
import { locales } from '../src/i18n/routing';
import { siteOrigin, isIndexable } from '../src/lib/seo.server';
import { buildContentSecurityPolicy } from '../src/lib/security-headers.server';

const handle = createRequestHandler(() => import('virtual:react-router/server-build'), import.meta.env.MODE);
// Pages kept out of search results: the signed-in ones, and the notice under the Specified Commercial Transactions Act
// (it names the seller; it stays reachable by its link and from the footer).
const AUTH_PATH = new RegExp(`^/(${locales.join('|')})/(sign-in|sign-up|diary|profile|legal/commerce)(/|\\.data$|$)`);
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
    if (!isIndexable || response.status >= 400 || AUTH_PATH.test(url.pathname) || isComingSoonMathPath(url.pathname)) {
      secured.headers.set('X-Robots-Tag', 'noindex');
    }
    // Math pages carry a signed-in user's scores (the set list) or save them (set pages).
    if (/^\/(ja|en|zh)\/(diary|clock|profile|life-calendar|math)(?:\.data|\/|$)/.test(url.pathname)) {
      secured.headers.set('Cache-Control', 'private, no-store');
    }
    // Every page, and the data the client router fetches for it, carries who is signed in (src/root.tsx) and their
    // favourites and theme (routes/locale.tsx), so none is kept by a shared cache or stored by the browser. Not a list of
    // paths: a new page is covered without being named here. A response that gives its own Cache-Control keeps it.
    const type = response.headers.get('Content-Type') ?? '';
    if (!secured.headers.has('Cache-Control') && (type.startsWith('text/html') || url.pathname.endsWith('.data'))) {
      secured.headers.set('Cache-Control', 'private, no-store');
    }
    // Lets CI tell when a deploy has reached the edge (scripts/wait-for-deploy.mjs).
    secured.headers.set('X-App-Version', env.APP_VERSION);
    secured.headers.set('X-Content-Type-Options', 'nosniff');
    secured.headers.set('X-Frame-Options', 'DENY');
    secured.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    // A page has its own, with the nonce of its scripts (src/entry.server.tsx); everything else gets this one.
    if (!secured.headers.has('Content-Security-Policy')) secured.headers.set('Content-Security-Policy', csp);
    return secured;
  },
};
