// A signed-in user's results on one set, shown on its learning item's page.
export interface MathSetRecord { last: number; best: number; total: number }

// The most problems a practice set may have: an attempt is saved with one answer per
// problem, so generation, import and saving must all use the same limit.
export const MAX_SET_PROBLEMS = 50;
