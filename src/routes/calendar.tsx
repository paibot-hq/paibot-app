import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'use-intl';
import PublicHead from '../components/public-head';
import ToolLayout from '../components/tool-layout';
import type { DynamicT } from '../lib/apps';
import { formatDay, holidaysOfYear, HOLIDAY_YEARS, monthGrid, toDay } from '../lib/japanese-holidays';
import { localToday } from '../lib/life-calendar';
import styles from './calendar.module.css';

type View = 'month' | 'year';

export default function Calendar() {
  const locale = useLocale();
  const t = useTranslations('App.calendar');
  // Holiday keys are only known at runtime, like the app categories in
  // src/lib/apps.tsx - cast once, same reasoning.
  const td = t as unknown as DynamicT;
  // The server cannot know the viewer's date, so settle it after hydration.
  const [today, setToday] = useState('');
  const [cursor, setCursor] = useState<{ year: number; month: number } | null>(null);
  const [view, setView] = useState<View>('month');

  useEffect(() => {
    const update = () => setToday(localToday());
    update();
    const timer = setInterval(update, 60000);
    document.addEventListener('visibilitychange', update);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', update); };
  }, []);
  useEffect(() => {
    if (!today || cursor) return;
    const [year, month] = today.split('-').map(Number);
    setCursor({ year, month });
  }, [today, cursor]);

  const label = useMemo(() => {
    if (!cursor) return '';
    const options = view === 'year' ? { year: 'numeric' as const } : { year: 'numeric' as const, month: 'long' as const };
    return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(toDay(cursor.year, cursor.month, 1));
  }, [cursor, locale, view]);
  const weekdayNames = useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
    // 2026-03-01 is a Sunday, so this walks Sunday through Saturday.
    return Array.from({ length: 7 }, (_, index) => format.format(toDay(2026, 3, 1 + index)));
  }, [locale]);
  const narrowWeekdays = useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, { weekday: 'narrow', timeZone: 'UTC' });
    return Array.from({ length: 7 }, (_, index) => format.format(toDay(2026, 3, 1 + index)));
  }, [locale]);
  const monthNames = useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' });
    return Array.from({ length: 12 }, (_, index) => format.format(toDay(2026, index + 1, 1)));
  }, [locale]);
  const dayFormat = useMemo(() => new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' }), [locale]);

  function step(direction: number) {
    setCursor(current => {
      if (!current) return current;
      const at = new Date(toDay(current.year, current.month + (view === 'year' ? direction * 12 : direction), 1));
      const year = at.getUTCFullYear();
      if (year < HOLIDAY_YEARS.first || year > HOLIDAY_YEARS.last) return current;
      return { year, month: at.getUTCMonth() + 1 };
    });
  }
  function goToday() {
    const [year, month] = today.split('-').map(Number);
    setCursor({ year, month });
  }
  function openMonth(month: number) {
    setCursor(current => current && { year: current.year, month });
    setView('month');
  }

  // In year view the list covers the whole year; in month view, that month.
  const listed = useMemo(() => {
    if (!cursor) return [];
    return [...holidaysOfYear(cursor.year)]
      .filter(([day]) => view === 'year' || new Date(day).getUTCMonth() + 1 === cursor.month)
      .sort(([a], [b]) => a - b);
  }, [cursor, view]);
  const showingToday = Boolean(cursor && (view === 'year'
    ? today.startsWith(`${cursor.year}-`)
    : today.startsWith(`${cursor.year}-${String(cursor.month).padStart(2, '0')}`)));

  function renderMonth(month: number, compact: boolean) {
    if (!cursor) return null;
    return <table className={compact ? styles.mini : styles.grid} data-calendar-grid={compact ? undefined : ''} data-month={month}>
      <caption className={compact ? styles.miniCaption : styles.caption}>
        {compact
          ? <button type="button" onClick={() => openMonth(month)}>{monthNames[month - 1]}</button>
          : label}
      </caption>
      <thead><tr>{(compact ? narrowWeekdays : weekdayNames).map((name, index) =>
        <th key={index} scope="col" data-weekday={index}>{name}</th>)}</tr></thead>
      <tbody>{monthGrid(cursor.year, month).map(week => <tr key={week[0].day}>{week.map(cell => {
        const outside = cell.month !== month;
        const isToday = formatDay(cell.day) === today;
        return <td key={cell.day} data-weekday={cell.weekday} data-outside={outside || undefined}
          data-holiday={cell.holiday && !outside ? '' : undefined} data-today={isToday && !outside || undefined}
          aria-current={isToday && !outside ? 'date' : undefined}>
          <span className={styles.date}>{cell.date}</span>
          {!compact && cell.holiday && !outside && <span className={styles.name}>{td(`holidays.${cell.holiday}`)}</span>}
        </td>;
      })}</tr>)}</tbody>
    </table>;
  }

  return <><PublicHead locale={locale} path="/calendar" title={`${t('title')} | PAIBOT.app`} description={t('description')} />
    <ToolLayout title={t('title')}>
      <div className={styles.calendar}>
        {!cursor ? <p className={styles.loading}>{t('loading')}</p> : <>
          <div className={styles.controls}>
            <button type="button" onClick={() => step(-1)} aria-label={t(view === 'year' ? 'previousYear' : 'previousMonth')}>←</button>
            <strong aria-live="polite" data-calendar-label>{label}</strong>
            <button type="button" onClick={() => step(1)} aria-label={t(view === 'year' ? 'nextYear' : 'nextMonth')}>→</button>
            <button type="button" className={styles.today} onClick={goToday} disabled={showingToday}>{t('today')}</button>
          </div>
          <div className={styles.views} role="group" aria-label={t('view')}>
            {(['month', 'year'] as const).map(value =>
              <button key={value} type="button" aria-pressed={view === value} data-view={value}
                onClick={() => setView(value)}>{t(value === 'year' ? 'yearView' : 'monthView')}</button>)}
          </div>

          {view === 'month' ? renderMonth(cursor.month, false)
            : <div className={styles.year} data-calendar-year>
              {Array.from({ length: 12 }, (_, index) => <div key={index}>{renderMonth(index + 1, true)}</div>)}
            </div>}

          {listed.length > 0 && <ul className={styles.list} data-calendar-holidays>
            {listed.map(([day, key]) => <li key={day}>
              <span>{dayFormat.format(day)}</span>
              <span>{td(`holidays.${key}`)}</span>
            </li>)}
          </ul>}
          <p className={styles.note}>{t('note')}</p>
        </>}
      </div>
    </ToolLayout>
  </>;
}
