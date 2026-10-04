// Consumption tax and discounts, in whole yen. Everything is integer arithmetic, so there is no floating-point error
// (0.1 + 0.2 style): a rate is a whole number of percent and a discount is a whole number of percent or yen.

export type Rounding = "floor" | "round" | "ceil";
export type Direction = "toIncluded" | "toExcluded";

// amount * numerator / denominator, rounded to a whole yen the way a shop does (the three ways the law allows).
function scaled(amount: number, numerator: number, denominator: number, rounding: Rounding): number {
  const product = amount * numerator;
  const whole = Math.floor(product / denominator);
  const rest = product - whole * denominator;
  if (rest === 0) return whole;
  if (rounding === "floor") return whole;
  if (rounding === "ceil") return whole + 1;
  return rest * 2 >= denominator ? whole + 1 : whole;
}

export type TaxResult = {
  // The price before the discount, the discount, the price after it (the base the tax is figured on or taken out of).
  subtotal: number;
  discount: number;
  net: number;
  // The tax, and the price without and with it.
  tax: number;
  excluded: number;
  included: number;
};

// `discountPercent` is taken off first (0 to 100); `discountYen` is taken off after that. `direction` says whether the
// amount entered is without tax (the tax is added) or with it (the tax is taken out).
export function calculate(amount: number, ratePercent: number, rounding: Rounding, direction: Direction, discountPercent = 0, discountYen = 0): TaxResult {
  // Whole yen only: an amount with a fraction (a float that has drifted) is rounded first.
  amount = Math.max(0, Math.round(amount));
  const percent = Math.min(100, Math.max(0, discountPercent));
  const afterPercent = amount - scaled(amount, percent, 100, rounding === "floor" ? "ceil" : rounding === "ceil" ? "floor" : "round");
  const net = Math.max(0, afterPercent - Math.max(0, Math.round(discountYen)));
  const discount = amount - net;
  if (direction === "toIncluded") {
    const tax = scaled(net, ratePercent, 100, rounding);
    return { subtotal: amount, discount, net, tax, excluded: net, included: net + tax };
  }
  // With tax: the price without it is net * 100 / (100 + rate).
  const excluded = scaled(net, 100, 100 + ratePercent, rounding);
  return { subtotal: amount, discount, net, tax: net - excluded, excluded, included: net };
}
