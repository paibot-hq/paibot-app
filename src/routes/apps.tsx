import { getAuth } from '@clerk/react-router/server';
import Apps from '../components/apps';
import PublicHead from '../components/public-head';
import { addFavorite, removeFavorite } from '../lib/favorites.server';
import { useFavoritesData } from './locale';
import { useLocale, useTranslations } from 'use-intl';
import type { Route } from './+types/apps';

// Favorites state itself comes from routes/locale.tsx's shared loader (see
// useFavoritesData) - every locale-scoped page has it, not just this one, so
// a tool page can show its own star too (see ToolLayout). This route keeps
// the write side: ToolLayout's fetcher submits here explicitly
// (action={`/${locale}/apps`}) regardless of which page it's rendered from.
export async function action(args: Route.ActionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) return { status: 'error', reason: 'signed_out' } as const;
  const form = await args.request.formData();
  const appSlug = String(form.get('appSlug') ?? '');
  const intent = form.get('intent') === 'remove' ? 'remove' : 'add';
  return intent === 'remove' ? removeFavorite(userId, appSlug) : addFavorite(userId, appSlug);
}

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  const { signedIn, favoriteSlugs } = useFavoritesData();
  return <><PublicHead locale={locale} path="/apps" title={t('apps.title')} description={t('description')} />
    <Apps year={new Date().getFullYear()} signedIn={signedIn} favoriteSlugs={favoriteSlugs} /></>;
}
