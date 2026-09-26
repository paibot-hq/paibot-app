import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'use-intl';
import PublicHead from '../components/public-head';
import ToolLayout from '../components/tool-layout';
import type { DynamicT } from '../lib/apps';
import { formatDay, HOLIDAY_YEARS, monthGrid, toDay } from '../lib/japanese-holidays';
import { localToday } from '../lib/life-calendar';
import styles from './calendar.module.css';

export default function Calendar() {
  const locale = useLocale();
  const t = useTranslations('App.calendar');
  // Holiday keys are only known at runtime, like the app categories in
  // src/lib/apps.tsx - cast once, same reasoning.
  const td = t as unknown as DynamicT;
  // The server cannot know the viewer's date, so settle it after hydration.
  const [today, setToday] = useState('');
  const [cursor, setCursor] = useState<{ year: number; month: number } | null>(null);

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

  const weeks = useMemo(() => cursor ? monthGrid(cursor.year, cursor.month) : [], [cursor]);
  const monthLabel = useMemo(() => cursor
    ? new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', timeZone: 'UTC' }).format(toDay(cursor.year, cursor.month, 1))
    : '', [cursor, locale]);
  const weekdayNames = useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
    // 2026-03-01 is a Sunday, so this walks Sunday through Saturday.
    return Array.from({ length: 7 }, (_, index) => format.format(toDay(2026, 3, 1 + index)));
  }, [locale]);

  function step(months: number) {
    setCursor(current => {
      if (!current) return current;
      const at = new Date(toDay(current.year, current.month + months, 1));
      const year = at.getUTCFullYear();
      if (year < HOLIDAY_YEARS.first || year > HOLIDAY_YEARS.last) return current;
      return { year, month: at.getUTCMonth() + 1 };
    });
  }
  function goToday() {
    const [year, month] = today.split('-').map(Number);
    setCursor({ year, month });
  }

  const holidays = weeks.flat().filter(cell => cell.holiday && cell.month === cursor?.month);
  const showingToday = Boolean(cursor && today.startsWith(`${cursor.year}-${String(cursor.month).padStart(2, '0')}`));

  return <><PublicHead locale={locale} path="/calendar" title={`${t('title')} | PAIBOT.app`} description={t('description')} />
    <ToolLayout title={t('title')}>
      <div className={styles.calendar}>
        {!cursor ? <p className={styles.loading}>{t('loading')}</p> : <>
          <div className={styles.controls}>
            <button type="button" onClick={() => step(-1)} aria-label={t('previousMonth')}>←</button>
            <strong aria-live="polite" data-calendar-month>{monthLabel}</strong>
            <button type="button" onClick={() => step(1)} aria-label={t('nextMonth')}>→</button>
            <button type="button" className={styles.today} onClick={goToday} disabled={showingToday}>{t('today')}</button>
          </div>

          <table className={styles.grid} data-calendar-grid>
            <caption className={styles.caption}>{monthLabel}</caption>
            <thead><tr>{weekdayNames.map((name, index) =>
              <th key={name} scope="col" data-weekday={index}>{name}</th>)}</tr></thead>
            <tbody>{weeks.map(week => <tr key={week[0].day}>{week.map(cell => {
              const outside = cell.month !== cursor.month;
              const isToday = formatDay(cell.day) === today;
              return <td key={cell.day} data-weekday={cell.weekday} data-outside={outside || undefined}
                data-holiday={cell.holiday ? '' : undefined} data-today={isToday || undefined}
                aria-current={isToday ? 'date' : undefined}>
                <span className={styles.date}>{cell.date}</span>
                {cell.holiday && !outside && <span className={styles.name}>{td(`holidays.${cell.holiday}`)}</span>}
              </td>;
            })}</tr>)}</tbody>
          </table>

          {holidays.length > 0 && <ul className={styles.list} data-calendar-holidays>
            {holidays.map(cell => <li key={cell.day}>
              <span>{new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(cell.day)}</span>
              <span>{td(`holidays.${cell.holiday}`)}</span>
            </li>)}
          </ul>}
          <p className={styles.note}>{t('note')}</p>
        </>}
      </div>
    </ToolLayout>
  </>;
}
