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
  // Units added through the catalog keep their text under units.<id>, whether
  // coming soon or published; only the first three units use <id>Link/<id>Summary.
  const hasUnitText = (id: string) => t.has(`units.${id}.title` as Parameters<typeof t.has>[0]);
  const unitText = (id: string, part: 'title' | 'summary') =>
    td(hasUnitText(id) ? `units.${id}.${part}` : `${id}${part === 'title' ? 'Link' : 'Summary'}`);
  return <><PublicHead locale={locale} path="/math" title={`${t('title')} | PAIBOT.app`} description={t('description')} />
    <ToolLayout title={t('title')} centerTitle>
      <p>{t('intro')}</p>
      {MATH_DOMAINS.map(domain => (
        // Collapsible so ~60 units stay scannable; domains with playable units start open.
        <details key={domain} className={styles.domain} open={MATH_CATALOG.some(unit => unit.domain === domain && unit.status === 'published')}>
          <summary>
            <h2 id={`math-domain-${domain}`}>{t(`domains.${domain}`)}</h2>
            <span className={styles.domainCount}>{t('unitCount', { count: MATH_CATALOG.filter(unit => unit.domain === domain).length })}</span>
          </summary>
          <ul className={styles.units}>
            {MATH_STAGES.flatMap(stage => MATH_CATALOG.filter(unit => unit.domain === domain && unit.stage === stage)).map(unit => (
              <li key={unit.id}>
                <Link href={`/math/${unit.id}`} className={styles.card}>
                  <span className={styles.cardTitle}>
                    {unitText(unit.id, 'title')}
                    <span className={styles.badge}>{t(`stages.${unit.stage}`)}</span>
                    {unit.status === 'comingSoon' && <span className={`${styles.badge} ${styles.comingSoon}`}>{t('comingSoon')}</span>}
                  </span>
                  <span className={styles.cardDescription}>
                    {unitText(unit.id, 'summary')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </ToolLayout>
  </>;
}
