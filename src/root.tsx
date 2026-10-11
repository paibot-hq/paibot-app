import { Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse, useParams, useRouteLoaderData, useLocation } from 'react-router';
import { clerkMiddleware, rootAuthLoader } from '@clerk/react-router/server';
import { env } from 'cloudflare:workers';
import { IntlProvider } from 'use-intl';
import type { ReactNode } from 'react';
import type { Route } from './+types/root';
import Providers from './components/providers';
import Header from './components/header';
import { isLocale } from './i18n/routing';
import { useNonce } from './lib/csp-nonce';
import { siteOrigin, isIndexable } from './lib/seo.server';
import { isComingSoonMathPath } from './lib/math-catalog';
import ja from '../messages/ja.json';
import en from '../messages/en.json';
import zh from '../messages/zh.json';
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
  clerkMiddleware(isProductionClerk ? { authorizedParties: [siteOrigin] } : {}),
];
// siteOrigin/isIndexable (from lib/seo.server, server-only: reads Workers
// runtime env) ride along in loaderData for descendant components to read
// via useSiteMeta() below — never import lib/seo.server.ts from component
// code, or "cloudflare:workers" fails to resolve in the client build.
export const loader = (args: Route.LoaderArgs) =>
  rootAuthLoader(args, () => ({ siteOrigin, isIndexable }));
export function useSiteMeta() {
  const data = useRouteLoaderData<typeof loader>('root');
  return { siteOrigin: data?.siteOrigin ?? 'https://paibot.app', isIndexable: data?.isIndexable ?? false };
}
// Not a secret - GA4 measurement IDs are public (visible in every page's
// source on any site that uses them). Only loaded when isIndexable (i.e.
// production, per wrangler.jsonc's SITE_INDEXABLE), so dev/CI
// traffic never pollutes real analytics data.
const GA_MEASUREMENT_ID = "G-5WNRMDB15J";

export function Layout({ children }: { children: ReactNode }) {
  const { locale } = useParams();
  const { isIndexable } = useSiteMeta();
  const { pathname } = useLocation();
  const nonce = useNonce();
  const indexPage = isIndexable && !isComingSoonMathPath(pathname) && !/^\/(ja|en|zh)\/(sign-in|sign-up|diary|profile|legal\/commerce)(\/|$)/.test(pathname);
  return <html lang={isLocale(locale) ? locale : 'ja'}><head>
    {isIndexable && <>
      <script async nonce={nonce} src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
      <script nonce={nonce} dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}');` }} />
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
  const locale = isLocale(params.locale) ? params.locale : 'ja';
  const messages = { ja, en, zh }[locale];
  return <IntlProvider locale={locale} messages={messages} timeZone="Asia/Tokyo">
    <Providers loaderData={loaderData}><Header /><Outlet /></Providers>
  </IntlProvider>;
}
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const missing = isRouteErrorResponse(error) && error.status === 404;
  return <main className="section"><title>{`${missing ? '404' : 'Error'} | PAIBOT.app`}</title><h1>{missing ? '404' : 'Error'}</h1>
    <p>{missing ? 'Page not found' : 'The page could not be loaded.'}</p><a href="/ja">PAIBOT.app</a></main>;
}
