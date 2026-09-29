import { redirect } from 'react-router';
import { getAuth } from '@clerk/react-router/server';
import type { Route } from './+types/redirect';
import { defaultLocale } from '../i18n/routing';
import { localeFromAcceptLanguage, localeFromCookie } from '../i18n/negotiate';
import { getProfile } from '../lib/profile.server';

// A locale-less URL goes to, in order: the signed-in profile's language, the
// language last picked in the header menu (cookie), the browser's language,
// then Japanese — also what crawlers get, matching hreflang's x-default.
// Only locale-less URLs are negotiated; /ja/... never redirects by language,
// so crawlers reach every locale through hreflang and the sitemap.
export async function loader(args: Route.LoaderArgs) {
  const { pathname, search } = new URL(args.request.url);
  const { headers } = args.request;
  const { userId } = await getAuth(args);
  let profileLocale = null;
  if (userId) {
    try { profileLocale = (await getProfile(userId)).locale ?? null; }
    catch { /* The redirect matters more than the preference. */ }
  }
  const locale = profileLocale ?? localeFromCookie(headers.get('cookie')) ?? localeFromAcceptLanguage(headers.get('accept-language')) ?? defaultLocale;
  return redirect(`/${locale}${pathname === '/' ? '' : pathname}${search}`, {
    status: 307,
    // Signed in, the target depends on the visitor: a shared cache must not
    // hand one person's language to the next.
    headers: { 'Cache-Control': 'private, no-store', Vary: 'Accept-Language, Cookie' },
  });
}
