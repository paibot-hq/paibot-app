import SearchHome from '../components/search-home';
import PublicHead from '../components/public-head';
import { getRanking } from '../lib/tool-ranking.server';
import { TOP_COUNT } from '../lib/tool-ranking';
import { useLocale, useTranslations } from 'use-intl';
import type { Route } from './+types/home';

// The week's most viewed tools, shown above the list (none when nothing has been counted yet).
export async function loader() {
  return { popular: await getRanking(TOP_COUNT) };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="" title={t('title')} description={t('description')} /><SearchHome year={new Date().getFullYear()} popular={loaderData.popular} /></>;
}
