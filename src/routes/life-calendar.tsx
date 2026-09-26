import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useLocale, useTranslations } from 'use-intl';
import PublicHead from '../components/public-head';
import ToolLayout from '../components/tool-layout';
import { buildLifeCalendar, localToday } from '../lib/life-calendar';
import styles from './life-calendar.module.css';

export default function LifeCalendar() {
  const locale = useLocale();
  const t = useTranslations('App.lifeCalendar');
  const [birthday, setBirthday] = useState('');
  const [years, setYears] = useState(90);
  const [today, setToday] = useState('');
  const grid = useRef<HTMLDivElement>(null);
  const [gridHeight, setGridHeight] = useState<number>();
  useEffect(() => {
    const update = () => setToday(localToday());
    update();
    const timer = setInterval(update, 60000);
    document.addEventListener('visibilitychange', update);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', update); };
  }, []);
  const calendar = useMemo(() => buildLifeCalendar(birthday, today, years), [birthday, today, years]);
  const dateFormat = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }), [locale]);
  const count = new Intl.NumberFormat(locale);
  useEffect(() => {
    if (!calendar || !grid.current) return;
    const fit = () => {
      if (!grid.current) return;
      const top = grid.current.getBoundingClientRect().top + window.scrollY;
      setGridHeight(Math.max(160, Math.min(window.innerHeight * .65, window.innerHeight - top - 24)));
    };
    fit();
    const observer = new ResizeObserver(fit);
    // Observe preceding content, not the grid whose height we are changing.
    const container = grid.current.parentElement;
    if (container) for (const child of container.children) if (child !== grid.current) observer.observe(child);
    window.addEventListener('resize', fit);
    return () => { observer.disconnect(); window.removeEventListener('resize', fit); };
  }, [calendar]);
  function renderGrid() {
    if (!calendar) return null;
    const ageStep = [1, 5, 10, 20].find(step => (gridHeight ?? 400) / years * step >= 16) ?? 20;
    return (<div ref={grid} className={styles.grid} style={{ height: gridHeight, '--rows': calendar.rows.length } as CSSProperties} role="img" aria-label={t('gridLabel', { completed: calendar.completedWeeks, total: calendar.totalWeeks })} data-life-grid>
            <div className={styles.ageAxis} aria-hidden="true">
              {calendar.ages.filter(marker => marker.age % ageStep === 0 || marker.age === years).map(marker =>
                <span key={marker.age} data-age={marker.age} style={{ top: marker.age === years ? '100%' : `${marker.week / (calendar.rows.length * 52) * 100}%`, transform: marker.age === 0 ? 'none' : marker.age === years ? 'translateY(-100%)' : 'translateY(-50%)' }}>{t('age', { count: marker.age })}</span>)}
            </div>
            {calendar.rows.map((row, index) => <div key={index} className={styles.row} aria-hidden="true">
              <div className={styles.weeks}>{row.map(week => <span key={week.index} className={styles.week} data-state={week.state}
                title={`${dateFormat.format(week.start)} – ${dateFormat.format(week.end)}`} />)}</div>
            </div>)}
          </div>);
  }
  return <><PublicHead locale={locale} path="/life-calendar" title={`${t('title')} | PAIBOT.app`} description={t('description')} />
    <ToolLayout title={t('title')}>
      <div className={styles.calendar}>
        <p className={styles.intro}>{t('intro')}</p>
        <div className={styles.controls}>
          <label>{t('birthday')}<input type="date" min="1900-01-01" max={today || undefined} value={birthday} onChange={event => setBirthday(event.target.value)} aria-invalid={Boolean(birthday && today && !calendar)} /></label>
          <label>{t('range')}<select value={years} onChange={event => setYears(Number(event.target.value))}>
            {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120].map(value => <option key={value} value={value}>{t('years', { count: value })}</option>)}
          </select></label>
        </div>
        <p className={styles.note}>{t('privacy')}</p>
        {!birthday ? <p className={styles.empty}>{t('empty')}</p> : !calendar ? <p role="alert">{t('invalid')}</p> : <>
          <div className={styles.summary} aria-live="polite">
            <p><strong data-current-age>{t('age', { count: calendar.currentAge })}</strong><span>{t('currentAge')}</span></p>
            <p><strong>{t('weeks', { count: count.format(Math.floor(calendar.elapsedDays / 7)) })}</strong><span>{t('weeksLived')}</span></p>
            <p><strong>{t('days', { count: count.format(calendar.elapsedDays) })}</strong><span>{t('daysLived')}</span></p>
            <p><strong data-remaining-weeks>{t('weeks', { count: count.format(calendar.remainingWeeks) })}</strong><span>{t('remainingWeeks', { years })}</span></p>
          </div>
          {calendar.outside && <p role="status">{t('outside')}</p>}
          <div className={styles.legend}>
            <span><i data-state="past" />{t('past')}</span><span><i data-state="current" />{t('current')}</span><span><i data-state="future" />{t('future')}</span>
          </div>
          <p className={styles.note}>{t('gridNote')}</p>
          {renderGrid()}
          <p className={styles.note}>{t('rangeNote')}</p>
        </>}
      </div>
    </ToolLayout>
  </>;
}
