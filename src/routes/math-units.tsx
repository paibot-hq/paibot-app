import { useLocale, useTranslations } from 'use-intl';
import PublicHead from '../components/public-head';
import ToolLayout from '../components/tool-layout';
import MathUnitTable from '../components/math-unit-table';
import { BackToMath } from '../components/math-units';
import { getPlayableSets } from '../lib/math-problems.server';
import type { Route } from './+types/math-units';

export async function loader() {
  return { playable: await getPlayableSets() };
}

export default function MathUnits({ loaderData }: Route.ComponentProps) {
  const locale = useLocale();
  const t = useTranslations('App.math');
  const title = t('entrances.units.title');
  return <><PublicHead locale={locale} path="/math/units" title={`${title} - ${t('title')} | PAIBOT.app`} description={t('unitsIntro')} />
    <ToolLayout title={title} centerTitle aboveTitle={<BackToMath />}>
      <p>{t('unitsIntro')}</p>
      <MathUnitTable playable={loaderData.playable} />
    </ToolLayout>
  </>;
}
