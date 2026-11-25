import { Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse, useParams, useRouteLoaderData, useLocation, useMatches, useRouteError } from 'react-router';
import { clerkMiddleware, rootAuthLoader } from '@clerk/react-router/server';
import { env } from 'cloudflare:workers';
import { IntlProvider } from 'use-intl';
import { useEffect, useState, type ReactNode } from 'react';
import type { Route } from './+types/root';
import Providers from './components/providers';
import Header from './components/header';
import { isLocale, type Locale } from './i18n/routing';
import { getCachedMessages, loadMessages, type AppMessages } from './i18n/messages';
import { useNonce } from './lib/csp-nonce';
import { siteOrigin, isIndexable } from './lib/seo.server';
import { responseHeadersMiddleware } from './lib/response-headers.server';
import { isComingSoonMathPath } from './lib/math-catalog';
import { isUnpublishedAiDsPath } from './tools/ai-ds/catalog';
import { isUnpublishedCsPath } from './tools/cs/catalog';
import './styles/theme.css';
import './styles/shared-controls.css';
import './styles/shell.css';
import './styles/content.css';
import './styles/responsive.css';

// Clerk uses a `pk_test_`/`pk_live_` prefix to distinguish dev and production
// instances. Restricting authorizedParties only makes sense once we're
// actually talking to production Clerk — same reasoning as the main app's
// proxy.ts (gating on SITE_INDEXABLE instead would tie it to an unrelated
// SEO setting and leave a real, not-yet-indexable deployment on production
// keys unprotected).
const isProductionClerk = env.CLERK_PUBLISHABLE_KEY?.startsWith('pk_live_') ?? false;
export const middleware: Route.MiddlewareFunction[] = [
  // First, so its headers go on everything the others answer with too.
  responseHeadersMiddleware,
  clerkMiddleware(isProductionClerk ? { authorizedParties: [siteOrigin] } : {}),
];
// siteOrigin/isIndexable (from lib/seo.server, server-only: reads Workers
// runtime env) ride along in loaderData for descendant components to read
// via useSiteMeta() below — never import lib/seo.server.ts from component
// code, or "cloudflare:workers" fails to resolve in the client build.
export const loader = async (args: Route.LoaderArgs) => {
  const segment = new URL(args.request.url).pathname.split('/')[1];
  await loadMessages(isLocale(segment) ? segment : 'ja');
  return rootAuthLoader(args, () => ({ siteOrigin, isIndexable }));
};
export function useSiteMeta() {
  const data = useRouteLoaderData<typeof loader>('root');
  return { siteOrigin: data?.siteOrigin ?? 'https://paibot.app', isIndexable: data?.isIndexable ?? false };
}
// Not a secret - GA4 measurement IDs are public (visible in every page's
// source on any site that uses them). Only loaded when isIndexable (i.e.
// production, per wrangler.jsonc's SITE_INDEXABLE), so dev/CI
// traffic never pollutes real analytics data.
const GA_MEASUREMENT_ID = "G-5WNRMDB15J";

// Ownership verification while the site is awaiting approval. Keep ads.txt too.
// Do not load Auto ads globally: account, error and unfinished pages are not ad inventory.
// https://support.google.com/adsense/answer/7584263
const ADSENSE_CLIENT = "ca-pub-8043848570527700";

export function Layout({ children }: { children: ReactNode }) {
  const { locale } = useParams();
  const { isIndexable } = useSiteMeta();
  const { pathname } = useLocation();
  const nonce = useNonce();
  const matches = useMatches();
  const error = useRouteError();
  const excluded = matches.some(match => (match.handle as { noindex?: boolean } | undefined)?.noindex
    || (match.loaderData as { pageIndexable?: boolean } | undefined)?.pageIndexable === false);
  const indexPage = isIndexable && !error && !excluded && !isComingSoonMathPath(pathname) && !isUnpublishedAiDsPath(pathname) && !isUnpublishedCsPath(pathname) && !/^\/(ja|en|zh)\/(sign-in|sign-up|diary|profile|legal\/commerce)(\/|$)/.test(pathname);
  return <html lang={isLocale(locale) ? locale : 'ja'}><head>
    {isIndexable && <>
      <script async nonce={nonce} src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
      <script nonce={nonce} dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}');` }} />
      {ADSENSE_CLIENT && <meta name="google-adsense-account" content={ADSENSE_CLIENT} />}
    </>}
    <meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content={indexPage ? 'index, follow' : 'noindex, nofollow'} />
    <meta name="theme-color" content="#0f1720" />
    <link rel="apple-touch-icon" href="/apple-icon.png" />
    <link rel="icon" href="/icon.svg" type="image/svg+xml" />
    <Meta /><Links />
  </head><body>{children}<ScrollRestoration /><Scripts /></body></html>;
}
export default function App({ loaderData }: Route.ComponentProps) {
  const params = useParams();
  const locale: Locale = isLocale(params.locale) ? params.locale : 'ja';
  const [state, setState] = useState<{ locale: Locale; messages: AppMessages }>(() => ({
    locale,
    messages: getCachedMessages(locale) ?? {},
  }));
  const cached = getCachedMessages(locale);
  const activeLocale = cached ? locale : state.locale;
  const activeMessages = cached ?? state.messages;

  useEffect(() => {
    if (getCachedMessages(locale)) return;
    let cancelled = false;
    loadMessages(locale).then(messages => {
      if (!cancelled) setState({ locale, messages });
    });
    return () => { cancelled = true; };
  }, [locale]);

  return <IntlProvider locale={activeLocale} messages={activeMessages} timeZone="Asia/Tokyo">
    <Providers loaderData={loaderData}><Header /><Outlet /></Providers>
  </IntlProvider>;
}
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const missing = isRouteErrorResponse(error) && error.status === 404;
  return <main className="section"><title>{`${missing ? '404' : 'Error'} | PAIBOT.app`}</title><h1>{missing ? '404' : 'Error'}</h1>
    <p>{missing ? 'Page not found' : 'The page could not be loaded.'}</p><a href="/ja">PAIBOT.app</a></main>;
}
