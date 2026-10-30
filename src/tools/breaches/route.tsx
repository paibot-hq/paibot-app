import BreachesView, { type Breaches } from './breaches-view';
import PublicHead from '../../components/public-head';
import { getBreaches } from './breaches.server';
import { useLocale, useTranslations } from 'use-intl';
import type { Route } from './+types/route';

// The list is read from D1, not built into the app, so that the daily update reaches production without a release (docs/breaches.md).
export async function loader() {
  const list = await getBreaches();
  if (!list) throw new Response('Incident list unavailable', { status: 503 });
  return { list: list as Breaches };
}

export default function Page({ loaderData }: Route.ComponentProps) {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/breaches" title={`${t('breaches.title')} | PAIBOT.app`} description={t('breaches.description')} /><BreachesView list={loaderData.list} /></>;
}
