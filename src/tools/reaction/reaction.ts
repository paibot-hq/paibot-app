// The reaction test's numbers: a round is three reactions and its result their average; results are placed among
// everyone's on a histogram of 10 ms bins from 100 ms to 600 ms and more. Pure functions, so they are tested without a
// browser or a database.

export const ROUND = 3;
export const MIN_DELAY_MS = 1000;
export const MAX_DELAY_MS = 4000;
// A round's average outside this range is not kept: under 100 ms is faster than anyone reacts (a guess, or a forged
// request), over 1000 ms is someone who looked away.
export const MIN_MS = 100;
export const MAX_MS = 1000;
export const BIN_MS = 10;
// The last bin holds everything from here up.
export const TOP_MS = 600;
export const BINS = (TOP_MS - MIN_MS) / BIN_MS + 1;

export type Distribution = { counts: number[]; total: number };

export const average = (times: readonly number[]) => Math.round(times.reduce((sum, ms) => sum + ms, 0) / times.length);

export const isKeptResult = (ms: unknown): ms is number => typeof ms === "number" && Number.isInteger(ms) && ms >= MIN_MS && ms <= MAX_MS;

// The bin a result falls in: 0 for 100-109 ms, ... BINS - 1 for 600 ms and over.
export const binOf = (ms: number) => Math.min(BINS - 1, Math.max(0, Math.floor((ms - MIN_MS) / BIN_MS)));

// The histogram from the database's counts per bin (as `binOf` numbers them), every bin present.
export function distributionFrom(rows: readonly { bin: number; count: number }[]): Distribution {
  const counts = Array<number>(BINS).fill(0);
  for (const { bin, count } of rows) counts[Math.min(BINS - 1, Math.max(0, Math.floor(bin)))] += Number(count);
  return { counts, total: counts.reduce((a, b) => a + b, 0) };
}

// "Top X%": the share of results at least as fast as this one, `faster` of them strictly faster out of `total`
// (this one included), never shown as 0%.
export const topPercent = (faster: number, total: number) => Math.min(100, Math.max(1, Math.ceil(((faster + 1) / Math.max(1, total)) * 100)));
