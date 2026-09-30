import { useLocale, useTranslations } from 'use-intl';
import MathUnitTable from '../components/math-unit-table';
import PublicHead from '../components/public-head';
import ToolLayout from '../components/tool-layout';
import { getPlayableSets } from '../lib/math-problems.server';
import type { Route } from './+types/math';

export async function loader() {
  return { playable: await getPlayableSets() };
}

// One page for all of math: every unit and learning item, filtered in the browser.
export default function Math({ loaderData }: Route.ComponentProps) {
  const locale = useLocale();
  const t = useTranslations('App.math');
  return <><PublicHead locale={locale} path="/math" title={`${t('title')} | PAIBOT.app`} description={t('description')} />
    <ToolLayout title={t('title')} centerTitle>
      <p>{t('intro')}</p>
      <MathUnitTable playable={loaderData.playable} />
    </ToolLayout>
  </>;
}
