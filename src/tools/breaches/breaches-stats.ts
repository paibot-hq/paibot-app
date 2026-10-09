// The numbers behind the charts of the incident list, kept apart from the drawing so that they can be tested without a browser.

export const KINDS = ["leak", "ransomware", "outage", "fraud", "other"] as const;
export type Kind = (typeof KINDS)[number];

export type StatItem = { id: string; name: string; date: string; type: string; count: number | null; countNote: string };

export type Month = { key: string; year: number; month: number; total: number; byType: Record<Kind, number>; ids: string[] };

const monthIndex = (key: string) => Number(key.slice(0, 4)) * 12 + Number(key.slice(5, 7)) - 1;

// One entry for every month from `from` (or the first incident) to `until` (YYYY-MM-DD), the empty ones included, so a quiet month shows as a gap and
// not as a jump. The charts pass the first month of the whole list as `from`, so that a filter takes columns down but never moves the axis.
export function monthly(items: StatItem[], until: string, from?: string): Month[] {
  if (!items.length && !from) return [];
  const first = from?.slice(0, 7) ?? items.reduce((min, item) => (item.date < min ? item.date : min), items[0].date).slice(0, 7);
  const last = until.slice(0, 7);
  const months: Month[] = [];
  for (let index = monthIndex(first); index <= monthIndex(last); index++) {
    const year = Math.floor(index / 12), month = (index % 12) + 1;
    months.push({ key: `${year}-${String(month).padStart(2, "0")}`, year, month, total: 0, byType: { leak: 0, ransomware: 0, outage: 0, fraud: 0, other: 0 }, ids: [] });
  }
  for (const item of items) {
    const slot = months.find(m => m.key === item.date.slice(0, 7));
    if (!slot || !(KINDS as readonly string[]).includes(item.type)) continue;
    slot.byType[item.type as Kind]++;
    slot.total++;
    slot.ids.push(item.id);
  }
  return months;
}

// Where a date falls on a time axis counted in months: 2026-03-16 is about 2.5 after January. A date with only the month is put in the middle of it
// (and not on a day nobody gave).
export function timePosition(date: string): number {
  const base = monthIndex(date);
  if (date.length === 7) return base + 0.5;
  const day = Number(date.slice(8, 10));
  const length = new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0)).getUTCDate();
  return base + (day - 1) / length;
}

export type Point = { id: string; name: string; date: string; count: number; countNote: string; t: number };

export function records(items: StatItem[]): Point[] {
  return items
    .filter((item): item is StatItem & { count: number } => item.count !== null)
    .map(item => ({ id: item.id, name: item.name, date: item.date, count: item.count, countNote: item.countNote, t: timePosition(item.date) }))
    .sort((a, b) => a.t - b.t);
}

// Axis ticks of 1, 2 or 5 times a power of ten, at most `max` of them, from 0 up to a value at or above `top`.
export function niceTicks(top: number, max = 5): number[] {
  if (top <= 0) return [0, 1];
  let step = 1;
  for (const mult of [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000]) {
    step = mult;
    if (Math.ceil(top / step) <= max) break;
  }
  const ticks: number[] = [];
  for (let value = 0; value < top + step; value += step) { ticks.push(value); if (value >= top) break; }
  return ticks;
}

// Decades of a log axis: 10, 100, ... 100,000,000.
export function decades(low: number, high: number): number[] {
  const out: number[] = [];
  for (let value = low; value <= high; value *= 10) out.push(value);
  return out;
}

// 1,000 / 1万 / 100万 / 1億 for ja and zh (万 and 亿), 1K / 10K / 1M / 100M for the rest.
export function compact(value: number, locale: string): string {
  if (locale === "ja" || locale === "zh") {
    const wan = locale === "ja" ? "万" : "万", yi = locale === "ja" ? "億" : "亿";
    if (value >= 1e8) return `${value / 1e8}${yi}`;
    if (value >= 1e4) return `${value / 1e4}${wan}`;
    return value.toLocaleString("en-US");
  }
  if (value >= 1e9) return `${value / 1e9}B`;
  if (value >= 1e6) return `${value / 1e6}M`;
  if (value >= 1e3) return `${value / 1e3}K`;
  return String(value);
}
