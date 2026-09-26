import { Outlet, useRouteLoaderData } from 'react-router';
import { getAuth } from '@clerk/react-router/server';
import { isLocale } from '../i18n/routing';
import { listFavorites } from '../lib/favorites.server';
import type { Route } from './+types/locale';

// Shared by every locale-scoped page (all 13 tools, home, apps, about, ...),
// so a tool page can show its own favorite star without each of the 13
// tool components needing a loader of their own - see useFavoritesData below
// and ToolLayout. Signed-out visitors never touch D1 (early return).
export async function loader(args: Route.LoaderArgs) {
  if (!isLocale(args.params.locale)) throw new Response('Not Found', { status: 404 });
  const { userId } = await getAuth(args);
  if (!userId) return { signedIn: false, favoriteSlugs: [] as string[] };
  const result = await listFavorites(userId);
  return { signedIn: true, favoriteSlugs: result.status === 'ok' ? result.slugs : [] };
}

export default function LocaleLayout() { return <Outlet />; }

export function useFavoritesData() {
  const data = useRouteLoaderData<typeof loader>('routes/locale');
  return { signedIn: data?.signedIn ?? false, favoriteSlugs: data?.favoriteSlugs ?? [] };
}
