import { env } from 'cloudflare:workers';
import { createRequestHandler } from 'react-router';
import { isComingSoonMathPath } from '../src/lib/math-catalog';
import { isLocale, locales } from '../src/i18n/routing';
import { siteOrigin, isIndexable } from '../src/lib/seo.server';
import { buildContentSecurityPolicy } from '../src/lib/security-headers.server';
import { pathWithoutLocale } from '../src/lib/seo';
import { ownerOfPath, siteOfHost, siteOrigins } from '../src/lib/sites';
import { legacyRedirect } from '../src/lib/legacy-host';

const handle = createRequestHandler(() => import('virtual:react-router/server-build'), import.meta.env.MODE);
const AUTH_PATH = new RegExp(`^/(${locales.join('|')})/(sign-in|sign-up|diary|profile)(/|\\.data$|$)`);
const csp = buildContentSecurityPolicy();

export default {
  async fetch(request: Request) {
    const url = new URL(request.url);
    const moved = legacyRedirect(url, siteOrigins(siteOrigin).hub);
    if (moved) return Response.redirect(moved, 301);
    const site = siteOfHost(url.hostname), origins = siteOrigins(siteOrigin);
    // Each page has one home: the drills on the learning site, the tools on the app. A request for the other
    // site's page is sent there (one URL per page, for search engines and for people).
    // Only pages (under a locale): assets, the sitemap, robots.txt and the API are served by every host.
    const owner = isLocale(url.pathname.split('/')[1]) ? ownerOfPath(pathWithoutLocale(url.pathname)) : null;
    // Pages only: a write (the favorite star posts to /apps from any site) is served where it is sent.
    if (owner && owner !== site && owner !== 'doc' && ['GET', 'HEAD'].includes(request.method)) return Response.redirect(`${siteOrigins(url.origin)[owner]}${url.pathname}${url.search}`, 301);
    let response: Response;
    if (url.pathname === '/robots.txt') {
      const body = isIndexable
        ? `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${origins[site]}/sitemap.xml\n`
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
    // Lets CI tell when a deploy has reached the edge (scripts/wait-for-deploy.mjs).
    secured.headers.set('X-App-Version', env.APP_VERSION);
    secured.headers.set('X-Content-Type-Options', 'nosniff');
    secured.headers.set('X-Frame-Options', 'DENY');
    secured.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    secured.headers.set('Content-Security-Policy', csp);
    return secured;
  },
};
