import { Outlet, useRouteLoaderData } from 'react-router';
import { getAuth } from '@clerk/react-router/server';
import { isLocale } from '../i18n/routing';
import { listFavorites } from '../lib/favorites.server';
import { getProfile } from '../lib/profile.server';
import type { Route } from './+types/locale';

// Shared by every locale-scoped page (all 14 tools, home, apps, about, ...),
// so a tool page can show its own favorite star without each of the 14
// tool components needing a loader of their own - see useFavoritesData below
// and ToolLayout. Signed-out visitors never touch D1 (early return).
//
// The birth date deliberately stays out of this loader: it runs on every page
// and its response carries no private cache headers. Only /profile and
// /life-calendar read it, and both set 'private, no-store'.
export async function loader(args: Route.LoaderArgs) {
  if (!isLocale(args.params.locale)) throw new Response('Not Found', { status: 404 });
  const { userId } = await getAuth(args);
  if (!userId) return { signedIn: false, favoriteSlugs: [] as string[], theme: null };
  const [favorites, profile] = await Promise.all([
    listFavorites(userId),
    getProfile(userId).catch(() => null),
  ]);
  return {
    signedIn: true,
    favoriteSlugs: favorites.status === 'ok' ? favorites.slugs : [],
    theme: profile?.theme ?? null,
  };
}

export default function LocaleLayout() { return <Outlet />; }

export function useFavoritesData() {
  const data = useRouteLoaderData<typeof loader>('routes/locale');
  return { signedIn: data?.signedIn ?? false, favoriteSlugs: data?.favoriteSlugs ?? [] };
}

export function useProfileData() {
  const data = useRouteLoaderData<typeof loader>('routes/locale');
  return { signedIn: data?.signedIn ?? false, theme: data?.theme ?? null };
}
