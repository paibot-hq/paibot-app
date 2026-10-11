import { getAuth } from '@clerk/react-router/server';
import { data, redirect } from 'react-router';
import { addFavorite, removeFavorite } from '../lib/favorites.server';
import type { Route } from './+types/favorites';

// The write side of the favorite star. Favorites state itself comes from routes/locale.tsx's shared loader (see
// useFavoritesData) - every locale-scoped page has it - so a star on the app's list or on a tool's own page
// submits here explicitly (action={`/${locale}/favorites`}).
// A route without a page is outside React Router's own check of where a write comes from, so it is checked here, as
// the diary and the profile check theirs: only the site's own pages may post it.
export async function action(args: Route.ActionArgs) {
  const fail = (reason: 'signed_out' | 'invalid', status: number) => data({ status: 'error', reason } as const, { status });
  if (args.request.method !== 'POST') return fail('invalid', 405);
  const { userId } = await getAuth(args);
  if (!userId) return fail('signed_out', 401);
  if (args.request.headers.get('Origin') !== new URL(args.request.url).origin) return fail('invalid', 403);
  const form = await args.request.formData();
  const appSlug = String(form.get('appSlug') ?? '');
  const intent = form.get('intent') === 'remove' ? 'remove' : 'add';
  return intent === 'remove' ? removeFavorite(userId, appSlug) : addFavorite(userId, appSlug);
}

// Nothing to read here: send a visitor who opens it to the app's list.
export function loader({ params }: Route.LoaderArgs) {
  return redirect(`/${params.locale}`, 301);
}
