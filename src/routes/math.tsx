import { useLocale, useTranslations } from 'use-intl';
import PublicHead from '../components/public-head';
import ToolLayout from '../components/tool-layout';
import { Link } from '../i18n/navigation';
import type { DynamicT } from '../lib/apps';
import { MATH_CATALOG, MATH_DOMAINS, MATH_STAGES } from '../lib/math-catalog';
import styles from './math.module.css';

export default function Math() {
  const locale = useLocale();
  const t = useTranslations('App.math');
  const td = t as unknown as DynamicT;
  return <><PublicHead locale={locale} path="/math" title={`${t('title')} | PAIBOT.app`} description={t('description')} />
    <ToolLayout title={t('title')} centerTitle>
      <p>{t('intro')}</p>
      {MATH_DOMAINS.map(domain => (
        <section key={domain} className={styles.domain} aria-labelledby={`math-domain-${domain}`}>
          <h2 id={`math-domain-${domain}`}>{t(`domains.${domain}`)}</h2>
          <ul className={styles.units}>
            {MATH_STAGES.flatMap(stage => MATH_CATALOG.filter(unit => unit.domain === domain && unit.stage === stage)).map(unit => (
              <li key={unit.id}>
                <Link href={`/math/${unit.id}`} className={styles.card}>
                  <span className={styles.cardTitle}>
                    {td(unit.status === 'published' ? `${unit.id}Link` : `units.${unit.id}.title`)}
                    <span className={styles.badge}>{t(`stages.${unit.stage}`)}</span>
                    {unit.status === 'comingSoon' && <span className={`${styles.badge} ${styles.comingSoon}`}>{t('comingSoon')}</span>}
                  </span>
                  <span className={styles.cardDescription}>
                    {td(unit.status === 'published' ? `${unit.id}Summary` : `units.${unit.id}.summary`)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </ToolLayout>
  </>;
}
