import { useLocale, useTranslations } from 'use-intl';
import PublicHead from '../components/public-head';
import ToolLayout from '../components/tool-layout';
import { BackToMath, mathUnitStyles as styles, UnitCards } from '../components/math-units';
import { Link } from '../i18n/navigation';
import type { DynamicT } from '../lib/apps';
import { MATH_CATALOG } from '../lib/math-catalog';
import { KENTEI_GRADES, KENTEI_OFFICIAL_URL } from '../lib/math-kentei';
import { pathLocales } from '../lib/seo';
import type { Route } from './+types/math-kentei';

// Japan's Suken exam only means something in Japanese; other locales 404
// (and pathLocales keeps them out of hreflang and the sitemap).
export function loader({ params }: Route.LoaderArgs) {
  if (!(pathLocales('/math/kentei') as readonly string[]).includes(params.locale ?? '')) throw new Response('Not Found', { status: 404 });
  return null;
}

export default function MathKentei() {
  const locale = useLocale();
  const t = useTranslations('App.math');
  const td = t as unknown as DynamicT;
  const title = t('entrances.kentei.title');
  return <><PublicHead locale={locale} path="/math/kentei" title={`${title} - ${t('title')} | PAIBOT.app`} description={t('kentei.intro')} />
    <ToolLayout title={title} centerTitle aboveTitle={<BackToMath />}>
      <p>{t('kentei.intro')}</p>
      <p className={styles.note}>{t('kentei.elementary')} <Link href="/math/level/elementary">{t('stages.elementary')}</Link></p>
      {KENTEI_GRADES.map(grade => {
        const units = grade.units.map(id => MATH_CATALOG.find(unit => unit.id === id)!);
        return <section key={grade.id} id={`grade-${grade.id}`} className={styles.domain} aria-labelledby={`kentei-${grade.id}`}>
          <div className={styles.domainHeading}>
            <h2 id={`kentei-${grade.id}`}>{td(`kentei.grades.${grade.id}`)}</h2>
            <span className={styles.gradeTarget}>{td(`kentei.targets.${grade.target}`)}</span>
          </div>
          <UnitCards units={units} />
        </section>;
      })}
      <p className={styles.note}>
        {t('kentei.note')} <a href={KENTEI_OFFICIAL_URL} rel="noopener noreferrer" target="_blank">{t('kentei.official')}</a>
      </p>
    </ToolLayout>
  </>;
}
