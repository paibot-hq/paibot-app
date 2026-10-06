// Dates without time zones: a date is a UTC midnight, so a day is always 86,400,000 ms and a daylight-saving change
// cannot make a day 23 or 25 hours long.

const DAY = 86_400_000;

export function parseDate(text: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const time = Date.UTC(year, month - 1, day);
  const check = new Date(time);
  // Date.UTC rolls 2026-02-31 over to March: refuse what does not exist.
  return check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day && year >= 1 ? time : null;
}

export function formatDate(time: number): string {
  const date = new Date(time);
  const pad = (n: number, width = 2) => String(n).padStart(width, "0");
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function today(now = new Date()): number {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

// The days from a to b (negative if b is earlier).
export function daysBetween(a: number, b: number): number {
  return Math.round((b - a) / DAY);
}

export function addDays(time: number, days: number): number {
  return time + days * DAY;
}

// A month later, or earlier: the day stays the same, or is the last day of a shorter month (Jan 31 + 1 month = Feb 28).
export function addMonths(time: number, months: number): number {
  const date = new Date(time);
  const total = date.getUTCFullYear() * 12 + date.getUTCMonth() + months;
  const year = Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Date.UTC(year, month, Math.min(date.getUTCDate(), last));
}

export const addYears = (time: number, years: number) => addMonths(time, years * 12);

// 0 (Sunday) to 6 (Saturday).
export function weekday(time: number): number {
  return new Date(time).getUTCDay();
}

// The Monday-to-Friday days from a up to b, with or without b itself. Holidays are not known here.
export function weekdaysBetween(a: number, b: number, inclusive: boolean): number {
  const [from, to] = a <= b ? [a, b] : [b, a];
  const total = daysBetween(from, to) + (inclusive ? 1 : 0);
  let count = 0;
  for (let i = 0; i < total; i++) {
    const day = weekday(addDays(from, i));
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

// The difference as years, months and days (like an age), from the earlier date to the later.
export function span(a: number, b: number): { years: number; months: number; days: number } {
  const [from, to] = a <= b ? [a, b] : [b, a];
  const start = new Date(from);
  const end = new Date(to);
  let months = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth();
  if (addMonths(from, months) > to) months--;
  return { years: Math.floor(months / 12), months: months % 12, days: daysBetween(addMonths(from, months), to) };
}

// The Japanese era of a date, and its year number (元年 is 1): Reiwa began on 2019-05-01, Heisei 1989-01-08, Showa
// 1926-12-25, Taisho 1912-07-30, Meiji 1868-10-23 (the first year counted here: the calendar was lunar before 1873).
const ERAS: { id: "reiwa" | "heisei" | "showa" | "taisho" | "meiji"; start: number; year: number }[] = [
  { id: "reiwa", start: Date.UTC(2019, 4, 1), year: 2019 },
  { id: "heisei", start: Date.UTC(1989, 0, 8), year: 1989 },
  { id: "showa", start: Date.UTC(1926, 11, 25), year: 1926 },
  { id: "taisho", start: Date.UTC(1912, 6, 30), year: 1912 },
  { id: "meiji", start: Date.UTC(1868, 9, 23), year: 1868 },
];

export function era(time: number): { id: string; year: number } | null {
  const found = ERAS.find(entry => time >= entry.start);
  return found ? { id: found.id, year: new Date(time).getUTCFullYear() - found.year + 1 } : null;
}
