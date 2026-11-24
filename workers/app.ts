import { env } from 'cloudflare:workers';
import { createRequestHandler } from 'react-router';
import { isComingSoonMathPath } from '../src/lib/math-catalog';
import { isUnpublishedAiDsPath } from '../src/tools/ai-ds/catalog';
import { isUnpublishedCsPath } from '../src/tools/cs/catalog';
import { locales } from '../src/i18n/routing';
import { siteOrigin, isIndexable } from '../src/lib/seo.server';
import { buildContentSecurityPolicy } from '../src/lib/security-headers.server';
import { dayOf, isBot, isEntrance, toolOf } from '../src/lib/tool-ranking';

const handle = createRequestHandler(() => import('virtual:react-router/server-build'), import.meta.env.MODE);
// Pages kept out of search results: the signed-in ones, and the notice under the Specified Commercial Transactions Act
// (it names the seller; it stays reachable by its link and from the footer).
const AUTH_PATH = new RegExp(`^/(${locales.join('|')})/(sign-in|sign-up|diary|profile|legal/commerce)(/|\\.data$|$)`);
const csp = buildContentSecurityPolicy();

// A view of a tool's page, for the tool ranking (src/lib/tool-ranking.ts): one more for the tool today, written after
// the response has gone (it never holds a page up, and a failed write only loses that one view). Only entrances from outside
// this site count (a search result, bookmark or typed address); client router .data fetches and links between our own pages
// do not. Crawlers and headless browsers (this site's tests) do not.
const COUNT_VIEW = 'INSERT INTO tool_views (slug, day, views) VALUES (?1, ?2, 1) ON CONFLICT (slug, day) DO UPDATE SET views = views + 1';
function countView(request: Request, response: Response, pathname: string, ctx: ExecutionContext) {
  if (request.method !== 'GET' || response.status !== 200 || isBot(request.headers.get('User-Agent') ?? '')) return;
  if (!isEntrance(pathname, request.headers, siteOrigin)) return;
  const slug = toolOf(pathname);
  if (!slug) return;
  ctx.waitUntil(env.DB.prepare(COUNT_VIEW).bind(slug, dayOf(new Date())).run().catch(() => {}));
}

export default {
  async fetch(request: Request, _env: unknown, ctx: ExecutionContext) {
    const url = new URL(request.url);
    let response: Response;
    if (url.pathname === '/robots.txt') {
      const body = isIndexable
        ? `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${siteOrigin}/sitemap.xml\n`
        : 'User-agent: *\nDisallow: /\n';
      response = new Response(body, { headers: { 'Content-Type': 'text/plain' } });
    } else {
      try {
        response = await handle(request);
      } catch (error) {
        console.error(error);
        response = new Response('Internal Server Error', { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    }
    countView(request, response, url.pathname, ctx);
    const secured = new Response(response.body, response);
    if (!isIndexable || response.status >= 400 || AUTH_PATH.test(url.pathname) || isComingSoonMathPath(url.pathname) || isUnpublishedAiDsPath(url.pathname) || isUnpublishedCsPath(url.pathname)) {
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
    secured.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
    if (url.protocol === 'https:') {
      secured.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    // A page has its own, with the nonce of its scripts (src/entry.server.tsx); everything else gets this one.
    if (!secured.headers.has('Content-Security-Policy')) secured.headers.set('Content-Security-Policy', csp);
    return secured;
  },
};
