// The typing game's numbers: how a round is scored and ranked. A round is ROUND_S seconds; each word typed in full earns
// its keys, a wrong key costs nothing but is counted as a miss, and the score is the keys typed right a minute (the
// usual "keys a second" scaled up) less a penalty for misses. Pure functions, so they are tested without a browser or a
// database.

export const ROUND_S = 60;
// Fastest plausible: 14 keys a second for the whole minute is 840; past this a result is not kept (a script, or a forged
// request).
export const MAX_SCORE = 1000;
export const BIN = 20;
export const BINS = MAX_SCORE / BIN + 1;

export type Round = { keys: number; misses: number; words: number };

// The accuracy of a round, 0 to 1 (no keys is 0).
export const accuracy = ({ keys, misses }: Round) => (keys + misses ? keys / (keys + misses) : 0);

// The score: keys typed right, each missed key taking back one key's worth (so a sloppy fast round scores under a clean
// slower one), never below 0.
export const score = ({ keys, misses }: Round) => Math.max(0, Math.round(keys - misses));

// A rank letter for a score (a feel for it: 300 keys a minute is five a second, a good typist).
export function rank(points: number): "S" | "A" | "B" | "C" | "D" {
  return points >= 450 ? "S" : points >= 320 ? "A" : points >= 220 ? "B" : points >= 120 ? "C" : "D";
}

// Keys a second, for showing.
export const keysPerSecond = (keys: number, seconds = ROUND_S) => (seconds > 0 ? Math.round((keys / seconds) * 10) / 10 : 0);

export const isKeptResult = (points: unknown, keys: unknown, misses: unknown) =>
  [points, keys, misses].every(v => Number.isInteger(v) && (v as number) >= 0)
  && (points as number) <= MAX_SCORE && (keys as number) <= MAX_SCORE && (points as number) <= (keys as number)
  && (keys as number) > 0;

// Which bin a score falls in: 0 for 0-19, ..., BINS - 1 for MAX_SCORE.
export const binOf = (points: number) => Math.min(BINS - 1, Math.max(0, Math.floor(points / BIN)));

export type Distribution = { counts: number[]; total: number };
export function distributionFrom(rows: readonly { bin: number; count: number }[]): Distribution {
  const counts = Array<number>(BINS).fill(0);
  for (const { bin, count } of rows) counts[Math.min(BINS - 1, Math.max(0, Math.floor(bin)))] += Number(count);
  return { counts, total: counts.reduce((a, b) => a + b, 0) };
}

// "Top X%": the share of results at least as good as this one, this one included: those better, and this one itself,
// and the others level with it (the reaction test's way), never 0% and never over 100%.
export const topPercent = (better: number, same: number, total: number) =>
  Math.min(100, Math.max(1, Math.ceil(((better + Math.min(same, 1)) / Math.max(1, total)) * 100)));

// The stage of the game by how many words have been typed: the words get longer.
export const stageOf = (words: number) => (words < 6 ? 0 : words < 14 ? 1 : 2);
