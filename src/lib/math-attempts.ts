export type MathUnit = 'arith' | 'signed' | 'factorization';

// A signed-in user's results on one set, shown on its set-picker card.
export interface MathSetRecord { last: number; best: number; total: number }
