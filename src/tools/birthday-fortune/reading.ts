// A reading from a birth date, by three old systems that are worked out, not drawn: the sun sign (the twelve signs by date), the life path number
// of numerology (the digits of the birth date added down to one digit, keeping 11, 22 and 33), and the personal year, month and day (the birth month
// and day added to the year, the month and the day of the one who asks, down to one digit). The same date gives the same answer on the same day.
// The words are in the messages (App.birthdayFortune); this file only decides which ones.

export type YMD = { year: number; month: number; day: number };

export const SIGNS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"] as const;
export type Sign = (typeof SIGNS)[number];
export const ELEMENTS = { aries: "fire", leo: "fire", sagittarius: "fire", taurus: "earth", virgo: "earth", capricorn: "earth", gemini: "air", libra: "air", aquarius: "air", cancer: "water", scorpio: "water", pisces: "water" } as const;
export type Element = (typeof ELEMENTS)[Sign];

// The day each sign starts (month, day), in the order of the year from Capricorn's second half; the sign before the first of these is Capricorn.
const STARTS: [number, number, Sign][] = [[1, 20, "aquarius"], [2, 19, "pisces"], [3, 21, "aries"], [4, 20, "taurus"], [5, 21, "gemini"], [6, 22, "cancer"], [7, 23, "leo"], [8, 23, "virgo"], [9, 23, "libra"], [10, 24, "scorpio"], [11, 23, "sagittarius"], [12, 22, "capricorn"]];
export function signOf(month: number, day: number): Sign {
  let sign: Sign = "capricorn"; // 1 January up to 19 January
  for (const [m, d, id] of STARTS) if (month > m || (month === m && day >= d)) sign = id;
  return sign;
}

export const daysIn = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

// A real calendar day from 1900 up to `today`.
export function validDate({ year, month, day }: YMD, today: YMD): boolean {
  if (![year, month, day].every(Number.isInteger) || year < 1900 || month < 1 || month > 12 || day < 1 || day > daysIn(year, month)) return false;
  return year * 10000 + month * 100 + day <= today.year * 10000 + today.month * 100 + today.day;
}

// Adds the digits of a number until one is left; with `masters`, 11, 22 and 33 are left as they are.
export function reduce(n: number, masters = false): number {
  while (n > 9 && !(masters && (n === 11 || n === 22 || n === 33))) n = String(n).split("").reduce((sum, digit) => sum + Number(digit), 0);
  return n;
}

export const lifePath = ({ year, month, day }: YMD) => reduce(`${year}${month}${day}`.split("").reduce((sum, digit) => sum + Number(digit), 0), true);
export const personalYear = (birth: YMD, year: number) => reduce(birth.month + birth.day + year);
export const personalMonth = (pYear: number, month: number) => reduce(pYear + month);
export const personalDay = (pMonth: number, day: number) => reduce(pMonth + day);

// How the day of each number favours four things, out of five: from what each number stands for (a start, a partner, play, order, change, care, thought,
// results, an ending). A guide, not a measure.
export type Stars = { overall: number; love: number; work: number; money: number };
export const DAY_STARS: Record<number, Stars> = {
  1: { overall: 4, love: 3, work: 5, money: 3 },
  2: { overall: 3, love: 5, work: 3, money: 3 },
  3: { overall: 5, love: 4, work: 3, money: 3 },
  4: { overall: 3, love: 2, work: 5, money: 4 },
  5: { overall: 4, love: 4, work: 3, money: 2 },
  6: { overall: 4, love: 5, work: 3, money: 4 },
  7: { overall: 2, love: 2, work: 4, money: 2 },
  8: { overall: 4, love: 2, work: 5, money: 5 },
  9: { overall: 3, love: 3, work: 2, money: 3 },
};

export type Reading = {
  sign: Sign; element: Element; lifePath: number;
  year: number; month: number; day: number; stars: Stars;
};

export function read(birth: YMD, today: YMD): Reading {
  const pYear = personalYear(birth, today.year);
  const pMonth = personalMonth(pYear, today.month);
  const pDay = personalDay(pMonth, today.day);
  const sign = signOf(birth.month, birth.day);
  return { sign, element: ELEMENTS[sign], lifePath: lifePath(birth), year: pYear, month: pMonth, day: pDay, stars: DAY_STARS[pDay] };
}
