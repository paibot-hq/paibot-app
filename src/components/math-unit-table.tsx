import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'use-intl';
import { Link } from '../i18n/navigation';
import type { DynamicT } from '../lib/apps';
import { MATH_CATALOG, MATH_DOMAINS, MATH_STAGES, type MathStage } from '../lib/math-catalog';
import { JP_GRADES, jpGrade, stageOfGrade, type JpGrade } from '../lib/math-curriculum-jp';
import { KENTEI_LEVELS, KENTEI_LOCALES, KENTEI_OFFICIAL_URL } from '../lib/math-kentei';
import styles from './math-unit-table.module.css';

// Every unit with its learning items, grouped by area of mathematics; each
// item links to its page, where a practice set is chosen. `playable` lists
// "unit/item/set" of the sets with published problems: an item with any is
// highlighted. The filters are client-side; the server renders the full list.
// Grades are Japan's school years (math-curriculum-jp.ts); the Suken filter,
// derived from them, is shown in Japanese only.
const OPENED_KEY = 'math-list-open:v1';

export default function MathUnitTable({ playable, done }: { playable: readonly string[]; done: readonly string[] }) {
  const t = useTranslations('App.math');
  const td = t as unknown as DynamicT;
  const locale = useLocale();
  const [stage, setStage] = useState<MathStage | ''>('');
  const [grade, setGrade] = useState<JpGrade | ''>('');
  const [kentei, setKentei] = useState('');
  const showKentei = (KENTEI_LOCALES as readonly string[]).includes(locale);
  const level = KENTEI_LEVELS.find(entry => entry.id === kentei);
  const gradeFits = (unitId: string, itemId: string) => {
    const itemGrade = jpGrade(unitId, itemId);
    const inLevel = !level || (!!itemGrade && (level.grades.includes(itemGrade) || level.below.includes(itemGrade))) || !!level.extra?.includes(`${unitId}/${itemId}`);
    return (!grade || itemGrade === grade) && inLevel;
  };
  // A unit's stage is a default; the level filter follows each item's own school year (数学II's 3次の展開 sits in a middle-school unit).
  const stageFits = (unit: { id: string; stage: MathStage }, itemId: string) => {
    const itemGrade = jpGrade(unit.id, itemId);
    return !stage || (itemGrade ? stageOfGrade(itemGrade) : unit.stage) === stage;
  };
  const [playableOnly, setPlayableOnly] = useState(false);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const matches = (text: string) => !q || text.toLowerCase().includes(q);

  // The areas are folded at first, so that the page starts as a short list of them; the ones a visitor opened are remembered in this browser. While a
  // filter or a search is on, every area with a match is open.
  const filtering = Boolean(stage || grade || kentei || playableOnly || q);
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    try { setOpened(new Set(JSON.parse(window.localStorage.getItem(OPENED_KEY) ?? '[]'))); } catch { /* storage blocked */ }
  }, []);
  const remember = (next: ReadonlySet<string>) => {
    setOpened(next);
    try { window.localStorage.setItem(OPENED_KEY, JSON.stringify([...next])); } catch { /* storage blocked */ }
  };
  const toggle = (domain: string, open: boolean) => {
    if (filtering || open === opened.has(domain)) return;
    const next = new Set(opened);
    if (open) next.add(domain); else next.delete(domain);
    remember(next);
  };

  const sections = MATH_DOMAINS.map(domain => {
    const rows = MATH_STAGES.flatMap(s => MATH_CATALOG.filter(unit => unit.domain === domain && unit.stage === s))
      .map(unit => {
        const title = td(`units.${unit.id}.title`);
        const items = unit.items.map(item => ({
          id: item.id, label: td(`units.${unit.id}.items.${item.id}.title`),
          playable: item.sets.some(set => playable.includes(`${unit.id}/${item.id}/${set.id}`)),
          // Every practice set of the item that can be played has been finished: the item is green.
          done: item.sets.some(set => playable.includes(`${unit.id}/${item.id}/${set.id}`)) && item.sets.filter(set => playable.includes(`${unit.id}/${item.id}/${set.id}`)).every(set => done.includes(`${unit.id}/${item.id}/${set.id}`)),
        })).filter(item => (!playableOnly || item.playable) && stageFits(unit, item.id) && gradeFits(unit.id, item.id) && (matches(title) || matches(item.label)));
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
      <select className={styles.select} value={grade} onChange={event => setGrade(event.target.value as JpGrade | '')} aria-label={t('unitList.grade')}>
        <option value="">{t('unitList.grade')}</option>
        {JP_GRADES.map(code => <option key={code} value={code}>{td(`grades.${code}`)}</option>)}
      </select>
      {showKentei && <select className={styles.select} value={kentei} onChange={event => setKentei(event.target.value)} aria-label={t('unitList.kentei')}>
        <option value="">{t('unitList.kentei')}</option>
        {[...KENTEI_LEVELS].reverse().map(level => <option key={level.id} value={level.id}>{td(`kentei.levels.${level.id}`)}</option>)}
      </select>}
      <label className={styles.check}>
        <input type="checkbox" checked={playableOnly} onChange={event => setPlayableOnly(event.target.checked)} />
        {t('unitList.playableOnly')}
      </label>
      <input type="search" className={styles.search} value={query} onChange={event => setQuery(event.target.value)}
        placeholder={t('unitList.search')} aria-label={t('unitList.search')} />
      {!filtering && (
        <button type="button" className={styles.chip} onClick={() => remember(opened.size >= MATH_DOMAINS.length ? new Set() : new Set(MATH_DOMAINS))} data-math-list="toggle-all">
          {opened.size >= MATH_DOMAINS.length ? t('unitList.closeAll') : t('unitList.openAll')}
        </button>
      )}
    </div>
    {level && <p className={styles.note}>
      {t('kentei.note')} <a href={KENTEI_OFFICIAL_URL} rel="noopener noreferrer" target="_blank">{t('kentei.official')}</a>
    </p>}
    {sections.length === 0 && <p className={styles.note}>{t('unitList.empty')}</p>}
    {sections.map(({ domain, rows }) => {
      const items = rows.flatMap(row => row.items);
      const done = items.filter(item => item.done).length;
      const open = filtering || opened.has(domain);
      return (
        <section key={domain} className={styles.domain} aria-labelledby={`math-domain-${domain}`} data-math-domain={domain} data-open={open || undefined}>
          {/* A heading with a button in it (not <summary>, which hides the heading from screen readers), and the units below, hidden while
              folded but in the page as it is sent (search engines read the links). */}
          <h2 className={styles.domainHeading} id={`math-domain-${domain}`}>
            <button type="button" className={styles.domainButton} aria-expanded={open} aria-controls={`math-domain-units-${domain}`} onClick={() => toggle(domain, !open)}>
              <span className={styles.domainName} data-math-domain-name>{t(`domains.${domain}`)}</span>
              <span className={styles.domainCount}>
                {t('unitCount', { count: rows.length })} · {t('unitList.itemCount', { count: items.length })}
                {done > 0 && <> · <span className={styles.done}>{t('unitList.doneCount', { done, total: items.length })}</span></>}
              </span>
            </button>
          </h2>
          <ul className={styles.rows} id={`math-domain-units-${domain}`} hidden={!open}>
            {rows.map(({ unit, title, items }) => (
              <li key={unit.id} className={styles.row}>
                <div className={styles.rowHead}>
                  <h3 className={styles.title}><Link href={`/math/${unit.id}`}>{title}</Link></h3>
                  <span className={styles.badge}>{t(`stages.${unit.stage}`)}</span>
                </div>
                <ul className={styles.sets}>
                  {items.map(item => (
                    <li key={item.id}>
                      <Link href={`/math/${unit.id}/${item.id}`} className={styles.set} data-playable={item.playable || undefined} data-done={item.done || undefined}>
                        {item.label}{!item.playable && <span className={styles.srOnly}> ({t('comingSoon')})</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      );
    })}
  </>;
}
