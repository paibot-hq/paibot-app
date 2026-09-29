import { useLocale, useTranslations } from 'use-intl';
import PublicHead from '../components/public-head';
import ToolLayout from '../components/tool-layout';
import { mathUnitStyles as styles, StageLinks } from '../components/math-units';
import { Link } from '../i18n/navigation';
import { pathLocales } from '../lib/seo';

// Three ways in: by area of mathematics, by level, and (Japanese only) by
// Suken grade.
export default function Math() {
  const locale = useLocale();
  const t = useTranslations('App.math');
  return <><PublicHead locale={locale} path="/math" title={`${t('title')} | PAIBOT.app`} description={t('description')} />
    <ToolLayout title={t('title')} centerTitle>
      <p>{t('intro')}</p>
      <ul className={styles.entrances}>
        <li className={styles.entrance}>
          <h2><Link href="/math/units">{t('entrances.units.title')}</Link></h2>
          <p>{t('entrances.units.body')}</p>
        </li>
        <li className={styles.entrance}>
          <h2>{t('entrances.level.title')}</h2>
          <p>{t('entrances.level.body')}</p>
          <StageLinks />
        </li>
        {(pathLocales('/math/kentei') as readonly string[]).includes(locale) && <li className={styles.entrance}>
          <h2><Link href="/math/kentei">{t('entrances.kentei.title')}</Link></h2>
          <p>{t('entrances.kentei.body')}</p>
        </li>}
      </ul>
    </ToolLayout>
  </>;
}
