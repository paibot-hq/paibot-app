import { useTranslations } from 'use-intl';
import { Link } from '../i18n/navigation';
import type { DynamicT } from '../lib/apps';
import { MATH_DOMAINS, MATH_STAGES, type MathCatalogUnit, type MathStage } from '../lib/math-catalog';
import styles from './math-units.module.css';

export { styles as mathUnitStyles };

// Units added through the catalog keep their text under units.<id>, whether
// coming soon or published; only the first three units use <id>Link/<id>Summary.
export function useUnitText() {
  const t = useTranslations('App.math');
  const td = t as unknown as DynamicT;
  const hasUnitText = (id: string) => t.has(`units.${id}.title` as Parameters<typeof t.has>[0]);
  return (id: string, part: 'title' | 'summary') =>
    td(hasUnitText(id) ? `units.${id}.${part}` : `${id}${part === 'title' ? 'Link' : 'Summary'}`);
}

// Unit cards in the given order, each with its difficulty badge.
export function UnitCards({ units }: { units: readonly MathCatalogUnit[] }) {
  const t = useTranslations('App.math');
  const unitText = useUnitText();
  return <ul className={styles.units}>
    {units.map(unit => (
      <li key={unit.id}>
        <Link href={`/math/${unit.id}`} className={styles.card}>
          <span className={styles.cardTitle}>
            {unitText(unit.id, 'title')}
            <span className={styles.badge}>{t(`stages.${unit.stage}`)}</span>
            {unit.status === 'comingSoon' && <span className={`${styles.badge} ${styles.comingSoon}`}>{t('comingSoon')}</span>}
          </span>
          <span className={styles.cardDescription}>{unitText(unit.id, 'summary')}</span>
        </Link>
      </li>
    ))}
  </ul>;
}

// Units grouped by mathematical domain, easiest first within each; domains
// with no units are left out.
export function UnitsByDomain({ units }: { units: readonly MathCatalogUnit[] }) {
  const t = useTranslations('App.math');
  return <>{MATH_DOMAINS.map(domain => {
    const inDomain = MATH_STAGES.flatMap(stage => units.filter(unit => unit.domain === domain && unit.stage === stage));
    if (!inDomain.length) return null;
    return <section key={domain} className={styles.domain} aria-labelledby={`math-domain-${domain}`}>
      <div className={styles.domainHeading}>
        <h2 id={`math-domain-${domain}`}>{t(`domains.${domain}`)}</h2>
        <span className={styles.domainCount}>{t('unitCount', { count: inDomain.length })}</span>
      </div>
      <UnitCards units={inDomain} />
    </section>;
  })}</>;
}

export function StageLinks({ current, centered }: { current?: MathStage; centered?: boolean }) {
  const t = useTranslations('App.math');
  return <ul className={`${styles.stageLinks} ${centered ? styles.centered : ''}`}>
    {MATH_STAGES.map(stage => (
      <li key={stage}>
        <Link href={`/math/level/${stage}`} aria-current={stage === current ? 'page' : undefined}>{t(`stages.${stage}`)}</Link>
      </li>
    ))}
  </ul>;
}

export function BackToMath() {
  const t = useTranslations('App.math.quiz');
  return <p className={styles.back}><Link href="/math">{`← ${t('backToMath')}`}</Link></p>;
}
