import ToolRanking from '../components/tool-ranking';
import PublicHead from '../components/public-head';
import { getRanking } from '../lib/tool-ranking.server';
import { useLocale, useTranslations } from 'use-intl';
import type { Route } from './+types/ranking';

export async function loader() {
  return { ranking: await getRanking() };
}

export default function Page({ loaderData }: Route.ComponentProps) {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/ranking" title={`${t('ranking.title')} | PAIBOT.app`} description={t('ranking.description')} /><ToolRanking ranking={loaderData.ranking} year={new Date().getFullYear()} /></>;
}
