import { useLocale, useTranslations } from 'use-intl';
import MathSetPicker from '../components/math-set-picker';
import PublicHead from '../components/public-head';
import type { DynamicT } from '../lib/apps';
import { getSetRecords } from '../lib/math-attempts.server';
import { FACTORIZATION_SETS } from '../lib/math-factorization-sets';
import type { Route } from './+types/math-factorization-index';

// Signed-in users see their latest and best score on each set's card.
export async function loader(args: Route.LoaderArgs) {
  return { records: await getSetRecords(args, 'factorization') };
}

export default function MathFactorizationIndex({ loaderData }: Route.ComponentProps) {
  const locale = useLocale();
  const t = useTranslations('App.math.factorization');
  // Pattern label keys are only known at runtime, like the app categories in
  // src/lib/apps.tsx - cast once here, same reasoning.
  const td = t as unknown as DynamicT;
  const sets = FACTORIZATION_SETS.map(({ id, rule, labelKey, descriptionKey }) => ({
    href: `/math/factorization/${id}`, label: td(labelKey), description: td(descriptionKey), record: loaderData.records[id], comingSoon: !rule,
  }));
  return <><PublicHead locale={locale} path="/math/factorization" title={`${t('title')} | PAIBOT.app`} description={t('description')} />
    <MathSetPicker title={t('title')} sets={sets} />
  </>;
}
