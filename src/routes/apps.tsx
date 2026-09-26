import { getAuth } from '@clerk/react-router/server';
import Apps from '../components/apps';
import PublicHead from '../components/public-head';
import { addFavorite, listFavorites, removeFavorite } from '../lib/favorites.server';
import { useLocale, useTranslations } from 'use-intl';
import type { Route } from './+types/apps';

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) return { signedIn: false, favoriteSlugs: [] as string[] };
  const result = await listFavorites(userId);
  // A D1 failure degrades to "no favorites shown", not a broken /apps page -
  // favorites is an enhancement on top of an otherwise-static page.
  return { signedIn: true, favoriteSlugs: result.status === 'ok' ? result.slugs : [] };
}

export async function action(args: Route.ActionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) return { status: 'error', reason: 'signed_out' } as const;
  const form = await args.request.formData();
  const appSlug = String(form.get('appSlug') ?? '');
  const intent = form.get('intent') === 'remove' ? 'remove' : 'add';
  return intent === 'remove' ? removeFavorite(userId, appSlug) : addFavorite(userId, appSlug);
}

export default function Page({ loaderData }: Route.ComponentProps) {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/apps" title={t('apps.title')} description={t('description')} />
    <Apps year={new Date().getFullYear()} signedIn={loaderData.signedIn} favoriteSlugs={loaderData.favoriteSlugs} /></>;
}
