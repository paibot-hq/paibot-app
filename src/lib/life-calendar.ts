const DAY = 86400000;
export const WEEKS_PER_ROW = 52;

// Calendar days are represented at UTC midnight to avoid DST affecting counts.
export function parseCalendarDay(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const day = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(day) && new Date(day).toISOString().slice(0, 10) === value ? day : null;
}
export function localToday(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function buildLifeCalendar(birthday: string, today: string, years: number) {
  const birth = parseCalendarDay(birthday);
  const current = parseCalendarDay(today);
  if (birth === null || current === null || birthday < '1900-01-01' || birth > current || !Number.isInteger(years) || years < 10 || years > 120) return null;
  const date = new Date(birth);
  const anniversary = (age: number) => {
    const year = date.getUTCFullYear() + age;
    const lastDay = new Date(Date.UTC(year, date.getUTCMonth() + 1, 0)).getUTCDate();
    return Date.UTC(year, date.getUTCMonth(), Math.min(date.getUTCDate(), lastDay));
  };
  const end = anniversary(years);
  const elapsedDays = Math.floor((current - birth) / DAY);
  const totalWeeks = Math.ceil((end - birth) / DAY / 7);
  const currentWeek = Math.floor(elapsedDays / 7);
  const outside = current >= end;
  let currentAge = new Date(current).getUTCFullYear() - date.getUTCFullYear();
  if (current < anniversary(currentAge)) currentAge--;
  const remainingDays = Math.max(0, Math.round((end - current) / DAY));
  return {
    birth, end, elapsedDays, totalWeeks, currentWeek, currentAge, remainingDays,
    remainingWeeks: Math.floor(remainingDays / 7),
    ages: Array.from({ length: years + 1 }, (_, age) => ({ age, week: (anniversary(age) - birth) / DAY / 7 })),
    completedWeeks: outside ? totalWeeks : Math.min(currentWeek, totalWeeks), outside,
    rows: Array.from({ length: Math.ceil(totalWeeks / WEEKS_PER_ROW) }, (_, row) =>
      Array.from({ length: Math.min(WEEKS_PER_ROW, totalWeeks - row * WEEKS_PER_ROW) }, (_, column) => {
        const index = row * WEEKS_PER_ROW + column;
        return { index, start: birth + index * 7 * DAY, end: Math.min(end, birth + (index + 1) * 7 * DAY) - DAY,
          state: outside || index < currentWeek ? 'past' : index === currentWeek ? 'current' : 'future' };
      })),
  };
}
