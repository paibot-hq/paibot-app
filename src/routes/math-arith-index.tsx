import { useLocale, useTranslations } from 'use-intl';
import MathSetPicker from '../components/math-set-picker';
import PublicHead from '../components/public-head';
import type { DynamicT } from '../lib/apps';
import { getSetRecords } from '../lib/math-attempts.server';
import { ARITH_SETS } from '../lib/math-arith-sets';
import type { Route } from './+types/math-arith-index';

// Signed-in users see their latest and best score on each set's card.
export async function loader(args: Route.LoaderArgs) {
  return { records: await getSetRecords(args, 'arith') };
}

export default function MathArithIndex({ loaderData }: Route.ComponentProps) {
  const locale = useLocale();
  const t = useTranslations('App.math.arith');
  // Set label keys are only known at runtime, like the app categories in
  // src/lib/apps.tsx - cast once here, same reasoning.
  const td = t as unknown as DynamicT;
  const sets = ARITH_SETS.map(({ id, labelKey, descriptionKey }) => ({
    href: `/math/arith/${id}`, label: td(labelKey), description: td(descriptionKey), record: loaderData.records[id],
  }));
  return <><PublicHead locale={locale} path="/math/arith" title={`${t('title')} | PAIBOT.app`} description={t('description')} />
    <MathSetPicker title={t('title')} sets={sets} />
  </>;
}
