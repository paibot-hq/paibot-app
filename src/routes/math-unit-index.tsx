import { useTranslations } from 'use-intl';
import MathSetPicker from '../components/math-set-picker';
import type { DynamicT } from '../lib/apps';
import { getComingSoonUnit } from '../lib/math-catalog';
import type { Route } from './+types/math-unit-index';

export function loader({ params }: Route.LoaderArgs) {
  const unit = getComingSoonUnit(params.unit);
  if (!unit) throw new Response('Not Found', { status: 404 });
  return { unit };
}

export default function MathUnitIndex({ loaderData: { unit } }: Route.ComponentProps) {
  const t = useTranslations('App.math') as unknown as DynamicT;
  const title = t(`units.${unit.id}.title`);
  return <><title>{`${title} | PAIBOT.app`}</title>
    <MathSetPicker title={title} sets={unit.sets.map(set => ({
      href: `/math/${unit.id}/${set.id}`,
      label: t(`units.${unit.id}.sets.${set.id}`),
      description: t('comingSoon'),
    }))} />
  </>;
}
