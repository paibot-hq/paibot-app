// Column arithmetic (筆算) for a single operation on whole numbers, worked out
// digit by digit so the page can draw the calculation the way it is written on
// paper. Pure: the same numbers always give the same layout.

export interface ColumnAdd {
  kind: 'add';
  width: number;
  top: string[];        // first number, right-aligned to `width` cells ('' = empty)
  bottom: string[];     // second number
  carries: string[];    // a carried 1 above each column
  result: string[];
}
export interface ColumnSubtract {
  kind: 'subtract';
  width: number;
  top: string[];
  bottom: string[];
  // A column that lent or borrowed: the new digit written above it, the old one struck through.
  adjusted: (string | null)[];
  result: string[];
}
export interface ColumnMultiply {
  kind: 'multiply';
  width: number;
  top: string[];
  bottom: string[];
  carries: string[];    // only for a one-digit multiplier
  partials: string[][]; // each partial product, shifted into its place (two or more digit multipliers)
  result: string[];
}
export interface ColumnDivide {
  kind: 'divide';
  divisor: string;
  dividend: string[];
  quotient: (string | null)[]; // one per dividend column ('' before the first digit)
  // Rows under the dividend: cells right-aligned to `end` (column index of the last digit); `rule` draws a line under it.
  rows: { text: string; end: number; rule: boolean }[];
  remainder: number;
}
export type Column = ColumnAdd | ColumnSubtract | ColumnMultiply | ColumnDivide;

const digits = (n: number) => String(n).split('');
const pad = (list: string[], width: number) => [...Array(width - list.length).fill(''), ...list];

// "23 + 45" style; null when the expression is not one operation on two whole numbers.
export function parseOperation(expression: string): { a: number; op: '+' | '-' | '*' | '/'; b: number } | null {
  const match = /^\s*(\d+)\s*([-+*/])\s*(\d+)\s*$/.exec(expression);
  return match ? { a: Number(match[1]), op: match[2] as '+' | '-' | '*' | '/', b: Number(match[3]) } : null;
}

export function columnCalculation(expression: string): Column | null {
  const operation = parseOperation(expression);
  if (!operation) return null;
  const { a, op, b } = operation;
  if (op === '+') return add(a, b);
  if (op === '-') return a >= b ? subtract(a, b) : null;
  if (op === '*') return multiply(a, b);
  return b > 0 ? divide(a, b) : null;
}

// Worth drawing: a sum or difference reaching two digits, a product with a factor of two
// digits or more (single-digit products are the times table), a dividend of two digits or more.
export const worthDrawing = (expression: string): boolean => {
  const operation = parseOperation(expression);
  if (!operation) return false;
  const { a, op, b } = operation;
  if (op === '/') return a >= 10;
  if (op === '*') return Math.max(a, b) >= 10;
  return Math.max(a, b, op === '+' ? a + b : a - b) >= 10;
};

function add(a: number, b: number): ColumnAdd {
  const sum = a + b, width = digits(sum).length;
  const x = pad(digits(a), width), y = pad(digits(b), width);
  const carries: string[] = Array(width).fill('');
  let carry = 0;
  for (let i = width - 1; i >= 0; i--) {
    const total = Number(x[i] || 0) + Number(y[i] || 0) + carry;
    carry = total >= 10 ? 1 : 0;
    if (carry && i > 0) carries[i - 1] = '1';
  }
  return { kind: 'add', width, top: x, bottom: y, carries, result: digits(sum) };
}

function subtract(a: number, b: number): ColumnSubtract {
  const width = digits(a).length;
  const x = pad(digits(a), width), y = pad(digits(b), width);
  const values = x.map(digit => Number(digit || 0));
  const adjusted: (string | null)[] = Array(width).fill(null);
  for (let i = width - 1; i >= 0; i--) {
    if (values[i] >= Number(y[i] || 0)) continue;
    let lender = i - 1;
    while (values[lender] === 0) lender--;
    values[lender] -= 1; adjusted[lender] = String(values[lender]);
    for (let k = lender + 1; k < i; k++) { values[k] = 9; adjusted[k] = '9'; }
    values[i] += 10; adjusted[i] = String(values[i]);
  }
  return { kind: 'subtract', width, top: x, bottom: y, adjusted, result: pad(digits(a - b), width) };
}

function multiply(a: number, b: number): ColumnMultiply {
  const product = a * b, multiplier = digits(b);
  const partials: string[][] = [];
  let width = digits(product).length;
  const carries: string[] = [];
  if (multiplier.length === 1) {
    width = Math.max(width, digits(a).length);
    const cells = Array(width).fill('');
    let carry = 0;
    const ds = digits(a);
    for (let i = ds.length - 1; i >= 0; i--) {
      const total = Number(ds[i]) * b + carry;
      carry = Math.floor(total / 10);
      if (carry && i > 0) cells[width - ds.length + i - 1] = String(carry);
    }
    carries.push(...cells);
  } else {
    multiplier.slice().reverse().forEach((digit, place) => {
      if (digit === '0') return;
      const text = digits(a * Number(digit)).concat(Array(place).fill(''));
      width = Math.max(width, text.length);
      partials.push(text);
    });
  }
  const shape = (list: string[]) => pad(list, width);
  return {
    kind: 'multiply', width, top: shape(digits(a)), bottom: shape(multiplier),
    carries: multiplier.length === 1 ? shape(carries.slice(carries.length - width)) : Array(width).fill(''),
    partials: partials.map(shape), result: shape(digits(product)),
  };
}

function divide(a: number, b: number): ColumnDivide {
  const dividend = digits(a);
  const quotient: (string | null)[] = dividend.map(() => '');
  const rows: ColumnDivide['rows'] = [];
  let remainder = 0, started = false;
  dividend.forEach((digit, i) => {
    remainder = remainder * 10 + Number(digit);
    const q = Math.floor(remainder / b);
    if (q > 0) started = true;
    if (started) quotient[i] = String(q);
    if (q > 0) {
      rows.push({ text: String(q * b), end: i, rule: true });
      remainder -= q * b;
      // What is left, with the digits brought down until the next quotient digit is above zero.
      let end = i, text = String(remainder);
      let carry = remainder;
      for (let j = i + 1; j < dividend.length; j++) {
        carry = carry * 10 + Number(dividend[j]);
        text = remainder === 0 && text === '0' ? dividend[j] : text + dividend[j];
        end = j;
        if (Math.floor(carry / b) > 0) break;
      }
      rows.push({ text: end > i && Math.floor(carry / b) === 0 ? String(remainder) : text, end: end > i && Math.floor(carry / b) === 0 ? i : end, rule: false });
    } else if (started) {
      // A zero in the quotient: nothing to subtract.
    }
  });
  // The last remainder row is the final remainder; drop bring-down text that was never used.
  return { kind: 'divide', divisor: String(b), dividend, quotient, rows: tidy(rows, dividend.length), remainder };
}

// The remainder row after the last step shows only the remainder itself.
function tidy(rows: ColumnDivide['rows'], columns: number): ColumnDivide['rows'] {
  const out = rows.slice();
  const last = out[out.length - 1];
  if (last && !last.rule) { out[out.length - 1] = { text: String(Number(last.text)), end: columns - 1, rule: false }; }
  return out;
}
