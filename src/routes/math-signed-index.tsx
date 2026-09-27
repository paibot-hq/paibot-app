import { useLocale, useTranslations } from 'use-intl';
import MathSetPicker from '../components/math-set-picker';
import PublicHead from '../components/public-head';
import type { DynamicT } from '../lib/apps';
import { getSetRecords } from '../lib/math-attempts.server';
import { SIGNED_SETS } from '../lib/math-signed-sets';
import type { Route } from './+types/math-signed-index';

// Signed-in users see their latest and best score on each set's card.
export async function loader(args: Route.LoaderArgs) {
  return { records: await getSetRecords(args, 'signed') };
}

export default function MathSignedIndex({ loaderData }: Route.ComponentProps) {
  const locale = useLocale();
  const t = useTranslations('App.math.signed');
  // Set label keys are only known at runtime, like the app categories in
  // src/lib/apps.tsx - cast once here, same reasoning.
  const td = t as unknown as DynamicT;
  const sets = SIGNED_SETS.map(({ id, labelKey, descriptionKey }) => ({
    href: `/math/signed/${id}`, label: td(labelKey), description: td(descriptionKey), record: loaderData.records[id],
  }));
  return <><PublicHead locale={locale} path="/math/signed" title={`${t('title')} | PAIBOT.app`} description={t('description')} />
    <MathSetPicker title={t('title')} sets={sets} />
  </>;
}
