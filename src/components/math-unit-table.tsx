import { useState } from 'react';
import { useTranslations } from 'use-intl';
import { Link } from '../i18n/navigation';
import type { DynamicT } from '../lib/apps';
import { MATH_CATALOG, MATH_DOMAINS, MATH_STAGES, type MathStage } from '../lib/math-catalog';
import styles from './math-unit-table.module.css';

// Every unit with its learning items, grouped by area of mathematics; each
// item links to its page, where a practice set is chosen. `playable` lists
// "unit/item/set" of the sets with published problems: an item with any is
// highlighted. The filters are client-side; the server renders the full list.
export default function MathUnitTable({ playable }: { playable: readonly string[] }) {
  const t = useTranslations('App.math');
  const td = t as unknown as DynamicT;
  const [stage, setStage] = useState<MathStage | ''>('');
  const [playableOnly, setPlayableOnly] = useState(false);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const matches = (text: string) => !q || text.toLowerCase().includes(q);

  const sections = MATH_DOMAINS.map(domain => {
    const rows = MATH_STAGES.flatMap(s => MATH_CATALOG.filter(unit => unit.domain === domain && unit.stage === s))
      .filter(unit => !stage || unit.stage === stage)
      .map(unit => {
        const title = td(`units.${unit.id}.title`);
        const items = unit.items.map(item => ({
          id: item.id, label: td(`units.${unit.id}.items.${item.id}.title`),
          playable: item.sets.some(set => playable.includes(`${unit.id}/${item.id}/${set.id}`)),
        })).filter(item => (!playableOnly || item.playable) && (matches(title) || matches(item.label)));
        return { unit, title, items };
      })
      .filter(row => row.items.length);
    return { domain, rows };
  }).filter(section => section.rows.length);

  return <>
    <div className={styles.filters} role="group" aria-label={t('unitList.filters')}>
      <ul className={styles.stages}>
        {MATH_STAGES.map(s => (
          <li key={s}><button type="button" className={styles.chip} aria-pressed={stage === s} onClick={() => setStage(stage === s ? '' : s)}>{t(`stages.${s}`)}</button></li>
        ))}
      </ul>
      <label className={styles.check}>
        <input type="checkbox" checked={playableOnly} onChange={event => setPlayableOnly(event.target.checked)} />
        {t('unitList.playableOnly')}
      </label>
      <input type="search" className={styles.search} value={query} onChange={event => setQuery(event.target.value)}
        placeholder={t('unitList.search')} aria-label={t('unitList.search')} />
    </div>
    {sections.length === 0 && <p className={styles.note}>{t('unitList.empty')}</p>}
    {sections.map(({ domain, rows }) => (
      <section key={domain} className={styles.domain} aria-labelledby={`math-domain-${domain}`}>
        <div className={styles.domainHeading}>
          <h2 id={`math-domain-${domain}`}>{t(`domains.${domain}`)}</h2>
          <span className={styles.domainCount}>{t('unitCount', { count: rows.length })}</span>
        </div>
        <ul className={styles.rows}>
          {rows.map(({ unit, title, items }) => (
            <li key={unit.id} className={styles.row}>
              <div className={styles.rowHead}>
                <h3 className={styles.title}>{title}</h3>
                <span className={styles.badge}>{t(`stages.${unit.stage}`)}</span>
              </div>
              <ul className={styles.sets}>
                {items.map(item => (
                  <li key={item.id}>
                    <Link href={`/math/${unit.id}/${item.id}`} className={styles.set} data-playable={item.playable || undefined}>
                      {item.label}{!item.playable && <span className={styles.srOnly}> ({t('comingSoon')})</span>}
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
