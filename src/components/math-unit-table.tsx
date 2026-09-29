import { useState } from 'react';
import { useTranslations } from 'use-intl';
import { Link } from '../i18n/navigation';
import type { DynamicT } from '../lib/apps';
import { MATH_CATALOG, MATH_DOMAINS, MATH_STAGES, type MathStage } from '../lib/math-catalog';
import { unitSets } from '../lib/math-unit-sets';
import { useUnitText } from './math-units';
import styles from './math-units.module.css';

// Every unit with all of its sets, grouped by area of mathematics. `playable`
// lists "unit/setId" of the sets with published problems. The filters are
// client-side; the server renders the full list.
export default function MathUnitTable({ playable }: { playable: readonly string[] }) {
  const t = useTranslations('App.math');
  const td = t as unknown as DynamicT;
  const unitText = useUnitText();
  const [stage, setStage] = useState<MathStage | ''>('');
  const [playableOnly, setPlayableOnly] = useState(false);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const matches = (text: string) => !q || text.toLowerCase().includes(q);

  const sections = MATH_DOMAINS.map(domain => {
    const rows = MATH_STAGES.flatMap(s => MATH_CATALOG.filter(unit => unit.domain === domain && unit.stage === s))
      .filter(unit => !stage || unit.stage === stage)
      .map(unit => {
        const title = unitText(unit.id, 'title');
        const sets = unitSets(unit).map(set => ({ ...set, label: td(set.labelKey), playable: playable.includes(`${unit.id}/${set.id}`) }))
          .filter(set => (!playableOnly || set.playable) && (matches(title) || matches(set.label)));
        return { unit, title, sets };
      })
      .filter(row => row.sets.length);
    return { domain, rows };
  }).filter(section => section.rows.length);

  return <>
    <div className={styles.filters} role="group" aria-label={t('unitList.filters')}>
      <ul className={styles.stageLinks}>
        {MATH_STAGES.map(s => (
          <li key={s}><button type="button" className={styles.filterChip} aria-pressed={stage === s} onClick={() => setStage(stage === s ? '' : s)}>{t(`stages.${s}`)}</button></li>
        ))}
      </ul>
      <label className={styles.filterCheck}>
        <input type="checkbox" checked={playableOnly} onChange={event => setPlayableOnly(event.target.checked)} />
        {t('unitList.playableOnly')}
      </label>
      <input type="search" className={styles.filterSearch} value={query} onChange={event => setQuery(event.target.value)}
        placeholder={t('unitList.search')} aria-label={t('unitList.search')} />
    </div>
    {sections.length === 0 && <p className={styles.note}>{t('unitList.empty')}</p>}
    {sections.map(({ domain, rows }) => (
      <section key={domain} className={`${styles.domain} ${styles.wide}`} aria-labelledby={`math-domain-${domain}`}>
        <div className={styles.domainHeading}>
          <h2 id={`math-domain-${domain}`}>{t(`domains.${domain}`)}</h2>
          <span className={styles.domainCount}>{t('unitCount', { count: rows.length })}</span>
        </div>
        <ul className={styles.unitRows}>
          {rows.map(({ unit, title, sets }) => (
            <li key={unit.id} className={styles.unitRow}>
              <div className={styles.unitRowHead}>
                <Link href={`/math/${unit.id}`} className={styles.unitRowTitle}>{title}</Link>
                <span className={styles.badge}>{t(`stages.${unit.stage}`)}</span>
              </div>
              <ul className={styles.setChips}>
                {sets.map(set => (
                  <li key={set.id}>
                    <Link href={`/math/${unit.id}/${set.id}`} className={styles.setChip} data-playable={set.playable || undefined}>
                      {set.label}{!set.playable && <span className={styles.srOnly}> ({t('comingSoon')})</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    ))}
  </>;
}
