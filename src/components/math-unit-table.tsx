import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'use-intl';
import { Link } from '../i18n/navigation';
import type { DynamicT } from '../lib/apps';
import { MATH_CATALOG, MATH_DOMAINS, MATH_STAGES, type MathStage } from '../lib/math-catalog';
import { JP_GRADES, jpGrade, type JpGrade } from '../lib/math-curriculum-jp';
import { KENTEI_LEVELS, KENTEI_LOCALES, KENTEI_OFFICIAL_URL } from '../lib/math-kentei';
import { useDoneSets } from '../lib/math-local-done';
import { readResume, type MathResume } from '../lib/math-resume';
import styles from './math-unit-table.module.css';

// Every unit, in views: "By area" (the first), every unit folded by area of mathematics, and one per school stage (elementary ...
// university: its units, under small area headings). Each unit links to its page, which lists its learning items. A search or a filter shows the matching
// learning items of every unit instead, grouped by area. `playable` lists "unit/item/set" of the sets with published problems: a unit or
// item with any is highlighted. The filters are client-side; the server renders "By area", whose folded areas hold every
// unit's link in the page as it is sent. Grades are Japan's school years (math-curriculum-jp.ts); the Suken filter, derived from
// them, is shown in Japanese only.
const OPENED_KEY = 'math-list-open:v1';
const VIEW_KEY = 'math-list-view:v1';
type View = MathStage | 'areas';
const VIEWS: readonly View[] = ['areas', ...MATH_STAGES];

export default function MathUnitTable({ playable, done: finished }: { playable: readonly string[]; done: readonly string[] }) {
  const t = useTranslations('App.math');
  const td = t as unknown as DynamicT;
  const done = useDoneSets(finished);
  const locale = useLocale();
  const [grade, setGrade] = useState<JpGrade | ''>('');
  const [kentei, setKentei] = useState('');
  const showKentei = (KENTEI_LOCALES as readonly string[]).includes(locale);
  const level = KENTEI_LEVELS.find(entry => entry.id === kentei);
  const gradeFits = (unitId: string, itemId: string) => {
    const itemGrade = jpGrade(unitId, itemId);
    const inLevel = !level || (!!itemGrade && (level.grades.includes(itemGrade) || level.below.includes(itemGrade))) || !!level.extra?.includes(`${unitId}/${itemId}`);
    return (!grade || itemGrade === grade) && inLevel;
  };
  const [playableOnly, setPlayableOnly] = useState(false);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const matches = (text: string) => !q || text.toLowerCase().includes(q);

  // The areas are folded at first, so that the page starts as a short list of them; the ones a visitor opened are remembered in this browser. While a
  // filter or a search is on, every area with a match is open.
  const filtering = Boolean(grade || kentei || playableOnly || q);
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

  // On a phone only the search shows at first; the other filters are behind "Filters" (always shown on a wider screen, by the CSS).
  const [moreFilters, setMoreFilters] = useState(false);
  const activeFilters = [grade, kentei, playableOnly].filter(Boolean).length;
  // The practice set last opened in this browser, to go back to in one tap.
  const [resume, setResume] = useState<MathResume | null>(null);
  // The view chosen last in this browser; at first, "By area".
  const [view, setView] = useState<View>('areas');
  useEffect(() => {
    setResume(readResume());
    let saved: string | null = null;
    try { saved = window.localStorage.getItem(VIEW_KEY); } catch { /* storage blocked */ }
    if ((VIEWS as readonly string[]).includes(saved ?? '')) setView(saved as View);
  }, []);
  // Choosing a view ends a search or a filter, whose results are shown in place of the views.
  const choose = (next: View) => {
    setView(next); setQuery(''); setGrade(''); setKentei(''); setPlayableOnly(false);
    try { window.localStorage.setItem(VIEW_KEY, next); } catch { /* storage blocked */ }
  };
  const resumeItem = resume && td(`units.${resume.unit}.items.${resume.item}.title`);
  const resumeSeveral = resume && (MATH_CATALOG.find(unit => unit.id === resume.unit)?.items.find(item => item.id === resume.item)?.sets.length ?? 0) > 1;

  const sections = MATH_DOMAINS.map(domain => {
    const rows = MATH_STAGES.flatMap(s => MATH_CATALOG.filter(unit => unit.domain === domain && unit.stage === s))
      .map(unit => {
        const title = td(`units.${unit.id}.title`);
        const items = unit.items.map(item => ({
          id: item.id, label: td(`units.${unit.id}.items.${item.id}.title`),
          playable: item.sets.some(set => playable.includes(`${unit.id}/${item.id}/${set.id}`)),
          // Every practice set of the item that can be played has been finished: the item is green.
          done: item.sets.some(set => playable.includes(`${unit.id}/${item.id}/${set.id}`)) && item.sets.filter(set => playable.includes(`${unit.id}/${item.id}/${set.id}`)).every(set => done.includes(`${unit.id}/${item.id}/${set.id}`)),
        })).filter(item => (!playableOnly || item.playable) && gradeFits(unit.id, item.id) && (matches(title) || matches(item.label)));
        return { unit, title, items };
      })
      .filter(row => row.items.length);
    return { domain, rows };
  }).filter(section => section.rows.length);

  // A unit in one line: its name, how many items (and how many done), and its stage when the view is not a stage's; it links to its page.
  const unitLine = ({ unit, title, items }: (typeof sections)[number]['rows'][number], withStage: boolean) => {
    const unitDone = items.filter(item => item.done).length;
    const playableItems = items.filter(item => item.playable).length;
    return <li key={unit.id}>
      <Link href={`/math/${unit.id}`} className={styles.unitLink} data-playable={playableItems > 0 || undefined} data-done={(playableItems > 0 && unitDone === playableItems) || undefined}>
        <span className={styles.unitName}>{title}</span>
        <span className={styles.unitMeta}>
          {t('unitList.itemCount', { count: items.length })}
          {unitDone > 0 && <> · <span className={styles.done}>{t('unitList.doneCount', { done: unitDone, total: items.length })}</span></>}
        </span>
        {withStage && <span className={styles.badge}>{t(`stages.${unit.stage}`)}</span>}
      </Link>
    </li>;
  };

  return <>
    {resume && <Link href={`/math/${resume.unit}/${resume.item}/${resume.set}`} className={styles.resume} data-math-resume>
      <span className={styles.resumeLabel}>{t('quiz.resume')}</span>
      <span>{resumeItem}{resumeSeveral && ` ${t('quiz.practice', { number: resume.set })}`}</span>
    </Link>}
    <div className={styles.views} role="group" aria-label={t('unitList.views')}>
      {VIEWS.map(v => <button key={v} type="button" className={styles.view} aria-pressed={!filtering && view === v} data-math-view={v} onClick={() => choose(v)}>
        {v === 'areas' ? t('unitList.byArea') : t(`stages.${v}`)}
      </button>)}
    </div>
    <div className={styles.filters} role="group" aria-label={t('unitList.filters')}>
      <input type="search" className={styles.search} value={query} onChange={event => setQuery(event.target.value)}
        placeholder={t('unitList.search')} aria-label={t('unitList.search')} />
      <button type="button" className={styles.more} aria-expanded={moreFilters} aria-controls="math-list-filters" onClick={() => setMoreFilters(!moreFilters)}>
        {t('unitList.filters')}{activeFilters > 0 && <span className={styles.activeCount}>{activeFilters}</span>}
      </button>
      <div className={styles.moreFilters} id="math-list-filters" data-open={moreFilters || undefined}>
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
      </div>
      {!filtering && view === 'areas' && (
        <button type="button" className={styles.chip} onClick={() => remember(opened.size >= MATH_DOMAINS.length ? new Set() : new Set(MATH_DOMAINS))} data-math-list="toggle-all">
          {opened.size >= MATH_DOMAINS.length ? t('unitList.closeAll') : t('unitList.openAll')}
        </button>
      )}
    </div>
    {filtering && <h2 className={styles.resultsHeading}>{t('unitList.results')}</h2>}
    {level && <p className={styles.note}>
      {t('kentei.note')} <a href={KENTEI_OFFICIAL_URL} rel="noopener noreferrer" target="_blank">{t('kentei.official')}</a>
    </p>}
    {filtering && sections.length === 0 && <p className={styles.note}>{t('unitList.empty')}</p>}
    {/* Every stage's panel is in the page; only the chosen one shows. */}
    {!filtering && view !== 'areas' && MATH_STAGES.map(s => (
      <div key={s} className={styles.stagePanel} data-math-stage={s} hidden={view !== s}>
        {sections.map(({ domain, rows }) => {
          const units = rows.filter(row => row.unit.stage === s);
          return units.length > 0 && <section key={domain} aria-labelledby={`math-${s}-${domain}`}>
            <h2 className={styles.stageDomain} id={`math-${s}-${domain}`}>{t(`domains.${domain}`)}</h2>
            <ul className={styles.rows} data-compact>{units.map(row => unitLine(row, false))}</ul>
          </section>;
        })}
      </div>
    ))}
    {(filtering || view === 'areas') && sections.map(({ domain, rows }) => {
      const items = rows.flatMap(row => row.items);
      const areaDone = items.filter(item => item.done).length;
      const areaPlayable = items.filter(item => item.playable).length;
      const open = filtering || opened.has(domain);
      return (
        <section key={domain} className={styles.domain} aria-labelledby={`math-domain-${domain}`} data-math-domain={domain} data-open={open || undefined}>
          {/* A heading with a button in it (not <summary>, which hides the heading from screen readers), and the units below, hidden while
              folded but in the page as it is sent (search engines read the links). */}
          <h2 className={styles.domainHeading} id={`math-domain-${domain}`}>
            <button type="button" className={styles.domainButton} data-done={(areaPlayable > 0 && areaDone === areaPlayable) || undefined} aria-expanded={open} aria-controls={`math-domain-units-${domain}`} onClick={() => toggle(domain, !open)}>
              <span className={styles.domainName} data-math-domain-name>{t(`domains.${domain}`)}</span>
              <span className={styles.domainCount}>
                {t('unitCount', { count: rows.length })} · {t('unitList.itemCount', { count: items.length })}
                {areaDone > 0 && <> · <span className={styles.done}>{t('unitList.doneCount', { done: areaDone, total: items.length })}</span></>}
              </span>
            </button>
          </h2>
          <ul className={styles.rows} data-compact={!filtering || undefined} id={`math-domain-units-${domain}`} hidden={!open}>
            {rows.map(row => {
              // Without a search or a filter an area lists only its units, one line each (the unit's page lists its items); with one, the
              // matching items are shown, to be found.
              if (!filtering) return unitLine(row, true);
              const { unit, title, items } = row;
              return <li key={unit.id} className={styles.row}>
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
              </li>;
            })}
          </ul>
        </section>
      );
    })}
  </>;
}
