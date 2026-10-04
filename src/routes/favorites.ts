import { getAuth } from '@clerk/react-router/server';
import { redirect } from 'react-router';
import { addFavorite, removeFavorite } from '../lib/favorites.server';
import type { Route } from './+types/favorites';

// The write side of the favorite star. Favorites state itself comes from routes/locale.tsx's shared loader (see
// useFavoritesData) - every locale-scoped page has it - so a star on the app's list or on a tool's own page
// submits here explicitly (action={`/${locale}/favorites`}).
export async function action(args: Route.ActionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) return { status: 'error', reason: 'signed_out' } as const;
  const form = await args.request.formData();
  const appSlug = String(form.get('appSlug') ?? '');
  const intent = form.get('intent') === 'remove' ? 'remove' : 'add';
  return intent === 'remove' ? removeFavorite(userId, appSlug) : addFavorite(userId, appSlug);
}

// Nothing to read here: send a visitor who opens it to the app's list.
export function loader({ params }: Route.LoaderArgs) {
  return redirect(`/${params.locale}`, 301);
}
