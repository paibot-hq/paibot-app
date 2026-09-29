import { useTranslations } from 'use-intl';
import MathSetQuiz from '../components/math-set-quiz';
import type { DynamicT } from '../lib/apps';
import { getComingSoonUnit } from '../lib/math-catalog';
import type { Route } from './+types/math-unit-set';

export function loader({ params }: Route.LoaderArgs) {
  const unit = getComingSoonUnit(params.unit);
  const set = unit?.sets.find(set => set.id === params.setId);
  if (!unit || !set) throw new Response('Not Found', { status: 404 });
  return { unitId: unit.id, setId: set.id };
}

export default function MathUnitSet({ loaderData: { unitId, setId } }: Route.ComponentProps) {
  const t = useTranslations('App.math') as unknown as DynamicT;
  const title = t(`units.${unitId}.title`);
  const setLabel = t(`units.${unitId}.sets.${setId}`);
  return <><title>{`${title} - ${setLabel} | PAIBOT.app`}</title>
    <MathSetQuiz key={`${unitId}/${setId}`} title={title} setLabel={setLabel} questions={[]} />
  </>;
}
