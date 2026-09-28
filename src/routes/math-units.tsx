import { useLocale, useTranslations } from 'use-intl';
import PublicHead from '../components/public-head';
import ToolLayout from '../components/tool-layout';
import { BackToMath, UnitsByDomain } from '../components/math-units';
import { MATH_CATALOG } from '../lib/math-catalog';

export default function MathUnits() {
  const locale = useLocale();
  const t = useTranslations('App.math');
  const title = t('entrances.units.title');
  return <><PublicHead locale={locale} path="/math/units" title={`${title} - ${t('title')} | PAIBOT.app`} description={t('unitsIntro')} />
    <ToolLayout title={title} centerTitle aboveTitle={<BackToMath />}>
      <p>{t('unitsIntro')}</p>
      <UnitsByDomain units={MATH_CATALOG} />
    </ToolLayout>
  </>;
}
