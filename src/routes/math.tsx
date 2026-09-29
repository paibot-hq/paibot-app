import { useLocale, useTranslations } from 'use-intl';
import MathUnitTable from '../components/math-unit-table';
import PublicHead from '../components/public-head';
import ToolLayout from '../components/tool-layout';
import { getSetRecords } from '../lib/math-attempts.server';
import type { MathUnit } from '../lib/math-attempts';
import { getPlayableSets } from '../lib/math-problems.server';
import type { Route } from './+types/math';

// Signed-in users also see their latest and best score on each set they finished.
export async function loader(args: Route.LoaderArgs) {
  const units: MathUnit[] = ['arith', 'signed', 'factorization', 'pythagoras'];
  const [playable, ...records] = await Promise.all([getPlayableSets(), ...units.map(unit => getSetRecords(args, unit))]);
  return {
    playable,
    records: Object.fromEntries(units.flatMap((unit, i) => Object.entries(records[i]).map(([setId, record]) => [`${unit}/${setId}`, record]))),
  };
}

// One page for all of math: every unit and set, filtered in the browser.
export default function Math({ loaderData }: Route.ComponentProps) {
  const locale = useLocale();
  const t = useTranslations('App.math');
  return <><PublicHead locale={locale} path="/math" title={`${t('title')} | PAIBOT.app`} description={t('description')} />
    <ToolLayout title={t('title')} centerTitle>
      <p>{t('intro')}</p>
      <MathUnitTable playable={loaderData.playable} records={loaderData.records} />
    </ToolLayout>
  </>;
}
