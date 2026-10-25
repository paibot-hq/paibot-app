// Resignation letter (退職届 / 退職願) data and the pure helpers behind the
// maker: dates in the Japanese era or the Western calendar written in kanji
// numerals, and the lines of the body. The letter is a Japanese document
// whatever the language of the page, so its wording lives here, not in the
// messages. Everything runs in the browser; nothing entered here is sent anywhere.

export const KINDS = ["notice", "request"] as const;
export type Kind = (typeof KINDS)[number];

export const CALENDARS = ["era", "western"] as const;
export type Calendar = (typeof CALENDARS)[number];

export type LetterData = {
  kind: Kind;
  calendar: Calendar;
  // YYYY-MM-DD, as an <input type="date"> gives it; "" until chosen.
  retireDate: string;
  submitDate: string;
  reason: string;
  department: string;
  name: string;
  company: string;
  recipientTitle: string;
  recipientName: string;
};

export const EMPTY_LETTER: LetterData = {
  kind: "notice", calendar: "era", retireDate: "", submitDate: "", reason: "",
  department: "", name: "", company: "", recipientTitle: "", recipientName: "",
};

// Shown (faded) until something is typed, so the layout is visible.
export const SAMPLE: Pick<LetterData, "department" | "name" | "company" | "recipientTitle" | "recipientName"> = {
  department: "営業部", name: "山田 太郎", company: "株式会社サンプル", recipientTitle: "代表取締役", recipientName: "鈴木 一郎",
};

export const DEFAULT_REASON = "一身上の都合";
export const TITLES: Record<Kind, string> = { notice: "退職届", request: "退職願" };

const DIGITS = "〇一二三四五六七八九";

// 1 → 一, 11 → 十一, 30 → 三十 (the way months, days and eras' years are written).
export function kanjiNumber(n: number): string {
  if (n < 10) return DIGITS[n]!;
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return (tens > 1 ? DIGITS[tens]! : "") + "十" + (ones ? DIGITS[ones]! : "");
}

// 2026 → 二〇二六 (the Western year, digit by digit).
export function positionalKanji(n: number): string {
  return String(n).split("").map(digit => DIGITS[Number(digit)]).join("");
}

export type YMD = { year: number; month: number; day: number };

export function parseDate(iso: string): YMD | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const check = new Date(Date.UTC(year, month - 1, day));
  return check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day ? { year, month, day } : null;
}

// The era a date falls in, by the day each began. Dates before Showa are not offered.
const ERAS = [
  { name: "令和", from: [2019, 5, 1] },
  { name: "平成", from: [1989, 1, 8] },
  { name: "昭和", from: [1926, 12, 25] },
] as const;

export function eraYear({ year, month, day }: YMD): { era: string; year: number } | null {
  const key = year * 10000 + month * 100 + day;
  for (const era of ERAS) {
    const [y, m, d] = era.from;
    if (key >= y * 10000 + m * 100 + d) return { era: era.name, year: year - y + 1 };
  }
  return null;
}

// "令和八年十一月三十日"; the first year of an era is 元年. A date not chosen
// yet leaves blanks to be written in by hand.
export function formatDate(iso: string, calendar: Calendar): string {
  const date = parseDate(iso);
  const blank = (year: string) => `${year}年　月　日`;
  if (!date) return blank(calendar === "era" ? "令和　" : "　　");
  const rest = `${kanjiNumber(date.month)}月${kanjiNumber(date.day)}日`;
  if (calendar === "western") return `${positionalKanji(date.year)}年${rest}`;
  const era = eraYear(date);
  if (!era) return `${positionalKanji(date.year)}年${rest}`;
  return `${era.era}${era.year === 1 ? "元" : kanjiNumber(era.year)}年${rest}`;
}

// The body, one string per column. The first line begins at the top and the
// rest are indented one character by the page.
export function bodyLines(data: LetterData): string[] {
  const reason = data.reason.trim() || DEFAULT_REASON;
  const lines = ["私事", `このたび${reason}により、`, `${formatDate(data.retireDate, data.calendar)}をもって`];
  return data.kind === "notice"
    ? [...lines, "退職いたします。"]
    : [...lines, "退職いたしたく、", "ここにお願い申し上げます。"];
}
