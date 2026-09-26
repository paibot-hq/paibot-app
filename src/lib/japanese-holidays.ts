// Japanese public holidays under the 国民の祝日に関する法律, including the
// rule changes since 1949 and the one-off dates around the 2019 accession and
// the 2020 Olympics. Dates are handled at UTC midnight so a calendar day never
// shifts with the viewer's time zone.
const DAY = 86400000;

export const HOLIDAY_YEARS = { first: 1949, last: 2099 };

export function toDay(year: number, month: number, date: number) {
  return Date.UTC(year, month - 1, date);
}
export function formatDay(day: number) {
  return new Date(day).toISOString().slice(0, 10);
}
export function weekdayOf(day: number) {
  return new Date(day).getUTCDay();
}

// The nth given weekday of a month, e.g. the 2nd Monday of January.
function nthWeekday(year: number, month: number, weekday: number, n: number) {
  const first = toDay(year, month, 1);
  const offset = (weekday - weekdayOf(first) + 7) % 7;
  return first + (offset + (n - 1) * 7) * DAY;
}

// Approximations accurate across the range this calendar allows.
function equinox(year: number, spring: boolean) {
  const base = year < 1980
    ? (spring ? 20.8357 : 23.2588)
    : (spring ? 20.8431 : 23.2488);
  const drift = year < 1980 ? Math.floor((year - 1983) / 4) : Math.floor((year - 1980) / 4);
  return toDay(year, spring ? 3 : 9, Math.floor(base + 0.242194 * (year - 1980) - drift));
}

// Years where a holiday was moved by special legislation.
const MOVED: Record<number, Partial<Record<string, number>>> = {
  2020: { marine: toDay(2020, 7, 23), sports: toDay(2020, 7, 24), mountain: toDay(2020, 8, 10) },
  2021: { marine: toDay(2021, 7, 22), sports: toDay(2021, 7, 23), mountain: toDay(2021, 8, 8) },
};

function statutoryHolidays(year: number) {
  const held = new Map<number, string>();
  const add = (day: number | null, key: string) => {
    if (day === null) return;
    held.set(MOVED[year]?.[key] ?? day, key);
  };
  const between = (from: number, to = Infinity) => year >= from && year <= to;

  add(toDay(year, 1, 1), 'newYear');
  add(between(2000) ? nthWeekday(year, 1, 1, 2) : toDay(year, 1, 15), 'comingOfAge');
  if (between(1967)) add(toDay(year, 2, 11), 'nationalFoundation');
  if (between(2020)) add(toDay(year, 2, 23), 'emperorBirthday');
  add(equinox(year, true), 'vernalEquinox');
  // April 29 was the emperor's birthday, then Greenery Day, then Showa Day.
  if (between(1949, 1988)) add(toDay(year, 4, 29), 'emperorBirthday');
  else if (between(1989, 2006)) add(toDay(year, 4, 29), 'greenery');
  else add(toDay(year, 4, 29), 'showa');
  if (between(2019, 2019)) add(toDay(year, 5, 1), 'enthronement');
  add(toDay(year, 5, 3), 'constitution');
  if (between(2007)) add(toDay(year, 5, 4), 'greenery');
  add(toDay(year, 5, 5), 'children');
  if (between(2003)) add(nthWeekday(year, 7, 1, 3), 'marine');
  else if (between(1996, 2002)) add(toDay(year, 7, 20), 'marine');
  if (between(2016)) add(toDay(year, 8, 11), 'mountain');
  if (between(2003)) add(nthWeekday(year, 9, 1, 3), 'respectForAged');
  else if (between(1966, 2002)) add(toDay(year, 9, 15), 'respectForAged');
  add(equinox(year, false), 'autumnalEquinox');
  if (between(2000)) add(nthWeekday(year, 10, 1, 2), 'sports');
  else if (between(1966, 1999)) add(toDay(year, 10, 10), 'sports');
  if (between(2019, 2019)) add(toDay(year, 10, 22), 'enthronementCeremony');
  add(toDay(year, 11, 3), 'culture');
  add(toDay(year, 11, 23), 'labor');
  if (between(1989, 2018)) add(toDay(year, 12, 23), 'emperorBirthday');
  return held;
}

// Statutory holidays plus the two derived kinds: a holiday falling on a Sunday
// moves to the next free day, and a lone weekday wedged between two holidays
// becomes one itself.
export function holidaysOfYear(year: number) {
  if (year < HOLIDAY_YEARS.first || year > HOLIDAY_YEARS.last) return new Map<number, string>();
  const statutory = statutoryHolidays(year);
  const all = new Map(statutory);
  if (year >= 1973) {
    for (const day of [...statutory.keys()].sort((a, b) => a - b)) {
      if (weekdayOf(day) !== 0) continue;
      let next = day + DAY;
      while (all.has(next)) next += DAY;
      all.set(next, 'substitute');
    }
  }
  if (year >= 1988) {
    for (const day of [...statutory.keys()]) {
      const middle = day + DAY;
      if (all.has(middle) || weekdayOf(middle) === 0 || !statutory.has(middle + DAY)) continue;
      all.set(middle, 'citizens');
    }
  }
  return all;
}

// A holiday can be pulled in from the neighbouring year by the grid, so look
// at both when a month's weeks spill over.
export function holidaysForRange(from: number, to: number) {
  const held = new Map<number, string>();
  for (let year = new Date(from).getUTCFullYear(); year <= new Date(to).getUTCFullYear(); year++) {
    for (const [day, key] of holidaysOfYear(year)) if (day >= from && day <= to) held.set(day, key);
  }
  return held;
}

// Sunday-first weeks covering the whole month.
export function monthGrid(year: number, month: number) {
  const first = toDay(year, month, 1);
  const start = first - weekdayOf(first) * DAY;
  const last = toDay(year, month + 1, 0);
  const end = last + (6 - weekdayOf(last)) * DAY;
  const holidays = holidaysForRange(start, end);
  const weeks: { day: number; date: number; month: number; holiday: string | null; weekday: number }[][] = [];
  for (let day = start; day <= end; day += 7 * DAY) {
    weeks.push(Array.from({ length: 7 }, (_, index) => {
      const cell = day + index * DAY;
      const at = new Date(cell);
      return {
        day: cell,
        date: at.getUTCDate(),
        month: at.getUTCMonth() + 1,
        holiday: holidays.get(cell) ?? null,
        weekday: index,
      };
    }));
  }
  return weeks;
}
