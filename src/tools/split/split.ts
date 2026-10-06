// Splitting a bill (割り勘) in whole yen: everyone pays the same, rounded to a unit, and the odd yen go somewhere.

export type Mode = "roundUp" | "organizer";

export type Split = {
  // What each of the others pays, and what the organizer pays (the same, or the rest in "organizer" mode).
  each: number;
  organizer: number;
  // What is collected in all, and how much more (or less) that is than the bill.
  collected: number;
  difference: number;
};

// `unit` is the coin everyone rounds to (1, 10, 100 or 1000 yen). "roundUp": everyone pays the same, rounded up, so a
// little too much is collected. "organizer": the others pay the same rounded down, and the organizer pays what is left.
export function split(total: number, people: number, unit: number, mode: Mode): Split {
  const bill = Math.max(0, Math.round(total));
  const count = Math.max(1, Math.floor(people));
  const step = Math.max(1, Math.round(unit));
  if (mode === "roundUp") {
    const each = Math.ceil(bill / count / step) * step;
    return { each, organizer: each, collected: each * count, difference: each * count - bill };
  }
  const each = Math.floor(bill / count / step) * step;
  const organizer = bill - each * (count - 1);
  return { each, organizer, collected: bill, difference: 0 };
}

// People who pay more or less than a plain share (a senior, a late arrival): `weights` are the shares (1 = a normal
// share), the result is each person's amount, rounded up to `unit`; the difference is what is collected over the bill.
export function weighted(total: number, weights: number[], unit: number): { amounts: number[]; difference: number } {
  const bill = Math.max(0, Math.round(total));
  const step = Math.max(1, Math.round(unit));
  const sum = weights.reduce((a, b) => a + Math.max(0, b), 0);
  if (sum <= 0) return { amounts: weights.map(() => 0), difference: -bill };
  const amounts = weights.map(weight => Math.ceil((bill * Math.max(0, weight)) / sum / step) * step);
  return { amounts, difference: amounts.reduce((a, b) => a + b, 0) - bill };
}
