import { useLocale, useTranslations } from 'use-intl';
import PublicHead from '../components/public-head';
import ToolLayout from '../components/tool-layout';
import { BackToMath, StageLinks, UnitsByDomain } from '../components/math-units';
import { MATH_CATALOG, MATH_STAGES, type MathStage } from '../lib/math-catalog';
import type { Route } from './+types/math-level';

export function loader({ params }: Route.LoaderArgs) {
  const stage = MATH_STAGES.find(stage => stage === params.stage);
  if (!stage) throw new Response('Not Found', { status: 404 });
  return { stage };
}

export default function MathLevel({ loaderData: { stage } }: Route.ComponentProps) {
  const locale = useLocale();
  const t = useTranslations('App.math');
  const title = t('levelTitle', { stage: t(`stages.${stage as MathStage}`) });
  return <><PublicHead locale={locale} path={`/math/level/${stage}`} title={`${title} - ${t('title')} | PAIBOT.app`} description={t('levelIntro')} />
    <ToolLayout title={title} centerTitle aboveTitle={<BackToMath />}>
      <StageLinks current={stage} centered />
      <UnitsByDomain units={MATH_CATALOG.filter(unit => unit.stage === stage)} />
    </ToolLayout>
  </>;
}
