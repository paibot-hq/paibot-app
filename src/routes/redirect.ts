import { redirect } from 'react-router';
import { getAuth } from '@clerk/react-router/server';
import type { Route } from './+types/redirect';
import { defaultLocale } from '../i18n/routing';
import { getProfile } from '../lib/profile.server';

export async function loader(args: Route.LoaderArgs) {
  const { pathname, search } = new URL(args.request.url);
  const { userId } = await getAuth(args);
  let locale = defaultLocale;
  if (userId) {
    try { locale = (await getProfile(userId)).locale ?? defaultLocale; }
    catch { /* The redirect matters more than the preference. */ }
  }
  return redirect(`/${locale}${pathname === '/' ? '' : pathname}${search}`, {
    status: 307,
    // Signed in, the target depends on the visitor: a shared cache must not
    // hand one person's language to the next.
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
