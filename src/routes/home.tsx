import SearchHome from '../components/search-home';
import PublicHead from '../components/public-head';
import { getRanking } from '../lib/tool-ranking.server';
import { TOP_COUNT } from '../lib/tool-ranking';
import { getPublishedProblemCount } from '../lib/math-problems.server';
import { useLocale, useTranslations } from 'use-intl';
import type { Route } from './+types/home';

// The week's most viewed tools, shown above the list (none when nothing has been counted yet), and the number of published
// math problems, one of the figures under the search box.
export async function loader() {
  const [popular, problemCount] = await Promise.all([getRanking(TOP_COUNT), getPublishedProblemCount()]);
  return { popular, problemCount };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="" title={t('title')} description={t('description')} /><SearchHome year={new Date().getFullYear()} popular={loaderData.popular} problemCount={loaderData.problemCount} /></>;
}
