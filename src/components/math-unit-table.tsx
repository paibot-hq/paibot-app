import { useState } from 'react';
import { useLocale, useTranslations } from 'use-intl';
import { Link } from '../i18n/navigation';
import type { DynamicT } from '../lib/apps';
import { MATH_CATALOG, MATH_DOMAINS, MATH_STAGES, type MathStage } from '../lib/math-catalog';
import { KENTEI_GRADES, KENTEI_LOCALES, KENTEI_OFFICIAL_URL } from '../lib/math-kentei';
import type { MathSetRecord } from '../lib/math-attempts';
import { unitSets } from '../lib/math-unit-sets';
import styles from './math-unit-table.module.css';

// Every unit with all of its sets, grouped by area of mathematics. `playable`
// lists "unit/setId" of the sets with published problems; `records` holds a
// signed-in user's scores by the same key. The filters are
// client-side; the server renders the full list.
export default function MathUnitTable({ playable, records }: { playable: readonly string[]; records: Record<string, MathSetRecord> }) {
  const tq = useTranslations('App.math.quiz');
  const locale = useLocale();
  const t = useTranslations('App.math');
  const td = t as unknown as DynamicT;
  // Units added through the catalog keep their text under units.<id>; only
  // the first three units use <id>Link.
  const unitTitle = (id: string) => td(t.has(`units.${id}.title` as Parameters<typeof t.has>[0]) ? `units.${id}.title` : `${id}Link`);
  const [stage, setStage] = useState<MathStage | ''>('');
  const [grade, setGrade] = useState('');
  const [playableOnly, setPlayableOnly] = useState(false);
  const [query, setQuery] = useState('');
  const showKentei = (KENTEI_LOCALES as readonly string[]).includes(locale);
  const gradeUnits = KENTEI_GRADES.find(g => g.id === grade)?.units;
  const q = query.trim().toLowerCase();
  const matches = (text: string) => !q || text.toLowerCase().includes(q);

  const sections = MATH_DOMAINS.map(domain => {
    const rows = MATH_STAGES.flatMap(s => MATH_CATALOG.filter(unit => unit.domain === domain && unit.stage === s))
      .filter(unit => (!stage || unit.stage === stage) && (!gradeUnits || gradeUnits.includes(unit.id)))
      .map(unit => {
        const title = unitTitle(unit.id);
        const sets = unitSets(unit).map(set => ({ ...set, label: td(set.labelKey), playable: playable.includes(`${unit.id}/${set.id}`) }))
          .filter(set => (!playableOnly || set.playable) && (matches(title) || matches(set.label)));
        return { unit, title, sets };
      })
      .filter(row => row.sets.length);
    return { domain, rows };
  }).filter(section => section.rows.length);

  return <>
    <div className={styles.filters} role="group" aria-label={t('unitList.filters')}>
      <ul className={styles.stages}>
        {MATH_STAGES.map(s => (
          <li key={s}><button type="button" className={styles.chip} aria-pressed={stage === s} onClick={() => setStage(stage === s ? '' : s)}>{t(`stages.${s}`)}</button></li>
        ))}
      </ul>
      {showKentei && <select className={styles.select} value={grade} onChange={event => setGrade(event.target.value)} aria-label={t('unitList.kentei')}>
        <option value="">{t('unitList.kentei')}</option>
        {KENTEI_GRADES.map(g => <option key={g.id} value={g.id}>{`${td(`kentei.grades.${g.id}`)}（${td(`kentei.targets.${g.target}`)}）`}</option>)}
      </select>}
      <label className={styles.check}>
        <input type="checkbox" checked={playableOnly} onChange={event => setPlayableOnly(event.target.checked)} />
        {t('unitList.playableOnly')}
      </label>
      <input type="search" className={styles.search} value={query} onChange={event => setQuery(event.target.value)}
        placeholder={t('unitList.search')} aria-label={t('unitList.search')} />
    </div>
    {gradeUnits && <p className={styles.note}>
      {t('kentei.note')} <a href={KENTEI_OFFICIAL_URL} rel="noopener noreferrer" target="_blank">{t('kentei.official')}</a>
    </p>}
    {sections.length === 0 && <p className={styles.note}>{t('unitList.empty')}</p>}
    {sections.map(({ domain, rows }) => (
      <section key={domain} className={styles.domain} aria-labelledby={`math-domain-${domain}`}>
        <div className={styles.domainHeading}>
          <h2 id={`math-domain-${domain}`}>{t(`domains.${domain}`)}</h2>
          <span className={styles.domainCount}>{t('unitCount', { count: rows.length })}</span>
        </div>
        <ul className={styles.rows}>
          {rows.map(({ unit, title, sets }) => (
            <li key={unit.id} className={styles.row}>
              <div className={styles.rowHead}>
                <h3 className={styles.title}>{title}</h3>
                <span className={styles.badge}>{t(`stages.${unit.stage}`)}</span>
              </div>
              <ul className={styles.sets}>
                {sets.map(set => {
                  const record = records[`${unit.id}/${set.id}`];
                  return <li key={set.id}>
                    <Link href={`/math/${unit.id}/${set.id}`} className={styles.set} data-playable={set.playable || undefined}
                      title={record ? tq('record', { last: record.last, best: record.best, total: record.total }) : undefined}>
                      {set.label}{!set.playable && <span className={styles.srOnly}> ({t('comingSoon')})</span>}
                      {record && <span className={styles.record}>{t('unitList.best', { best: record.best, total: record.total })}</span>}
                    </Link>
                  </li>;
                })}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    ))}
  </>;
}
