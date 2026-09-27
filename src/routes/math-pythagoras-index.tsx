import { useLocale, useTranslations } from 'use-intl';
import MathSetPicker from '../components/math-set-picker';
import PublicHead from '../components/public-head';
import type { DynamicT } from '../lib/apps';
import { getSetRecords } from '../lib/math-attempts.server';
import { PYTHAGORAS_SETS } from '../lib/math-pythagoras-sets';
import type { Route } from './+types/math-pythagoras-index';

// Signed-in users see their latest and best score on each set's card.
export async function loader(args: Route.LoaderArgs) {
  return { records: await getSetRecords(args, 'pythagoras') };
}

export default function MathPythagorasIndex({ loaderData }: Route.ComponentProps) {
  const locale = useLocale();
  const t = useTranslations('App.math.pythagoras');
  // Pattern label keys are only known at runtime, like the app categories in
  // src/lib/apps.tsx - cast once here, same reasoning.
  const td = t as unknown as DynamicT;
  const sets = PYTHAGORAS_SETS.map(({ id, labelKey, descriptionKey }) => ({
    href: `/math/pythagoras/${id}`, label: td(labelKey), description: td(descriptionKey), record: loaderData.records[id],
  }));
  return <><PublicHead locale={locale} path="/math/pythagoras" title={`${t('title')} | PAIBOT.app`} description={t('description')} />
    <MathSetPicker title={t('title')} sets={sets} />
  </>;
}
