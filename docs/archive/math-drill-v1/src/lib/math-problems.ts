export const LEVELS = ["11級", "10級", "9級", "8級", "7級", "6級"] as const;
export type LevelIndex = 0 | 1 | 2 | 3 | 4 | 5;

// Translation keys for the level dropdown, indexed the same way as LevelIndex.
export const LEVEL_KEYS = [
  "mathLevel11", "mathLevel10", "mathLevel9", "mathLevel8", "mathLevel7", "mathLevel6",
] as const;

export type Blank = { value: number; tolerance?: number };
export type InstructionKey = "mathPercentageInstruction" | "mathUnitConversionInstruction";
export type Problem = {
  tex?: string;
  instructionKey?: InstructionKey;
  instructionParams?: Record<string, number | string>;
  explanationTex: string;
  blanks: Blank[];
};
export type UnitId = "integerArithmetic" | "fractionArithmetic" | "decimalArithmetic" | "percentage" | "unitConversion";

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function lcm(a: number, b: number): number {
  return (a * b) / gcd(a, b);
}

function reduceFraction(numerator: number, denominator: number): [number, number] {
  const divisor = gcd(numerator, denominator) || 1;
  return [numerator / divisor, denominator / divisor];
}

// ---- 整数の四則演算 (available at every level, 11級〜6級) ----
const INTEGER_CONFIG: { ops: ("+" | "-" | "×" | "÷")[]; addMax: number; mulMax: number }[] = [
  { ops: ["+", "-"], addMax: 9, mulMax: 0 },
  { ops: ["+", "-"], addMax: 99, mulMax: 0 },
  { ops: ["+", "-", "×"], addMax: 99, mulMax: 9 },
  { ops: ["+", "-", "×", "÷"], addMax: 999, mulMax: 12 },
  { ops: ["×", "÷"], addMax: 999, mulMax: 99 },
  { ops: ["×", "÷"], addMax: 9999, mulMax: 999 },
];

function generateIntegerArithmetic(level: LevelIndex): Problem {
  const config = INTEGER_CONFIG[level];
  const op = config.ops[randomInt(0, config.ops.length - 1)];
  if (op === "+") {
    const a = randomInt(0, config.addMax);
    const b = randomInt(0, config.addMax);
    return { tex: `${a} + ${b}`, explanationTex: `${a} + ${b} = ${a + b}`, blanks: [{ value: a + b }] };
  }
  if (op === "-") {
    const a = randomInt(0, config.addMax);
    const b = randomInt(0, a);
    return { tex: `${a} - ${b}`, explanationTex: `${a} - ${b} = ${a - b}`, blanks: [{ value: a - b }] };
  }
  if (op === "×") {
    const a = randomInt(1, config.mulMax);
    const b = randomInt(1, config.mulMax);
    return { tex: `${a} \\times ${b}`, explanationTex: `${a} \\times ${b} = ${a * b}`, blanks: [{ value: a * b }] };
  }
  const b = randomInt(1, config.mulMax);
  const answer = randomInt(1, config.mulMax);
  const a = b * answer;
  return { tex: `${a} \\div ${b}`, explanationTex: `${a} \\div ${b} = ${answer}`, blanks: [{ value: answer }] };
}

// ---- 分数のたし算・ひき算・かけ算 (9級以上) ----
const FRACTION_CONFIG: Partial<Record<LevelIndex, { maxDenom: number; sameDenominator: boolean; allowMultiply: boolean }>> = {
  2: { maxDenom: 10, sameDenominator: true, allowMultiply: false },
  3: { maxDenom: 6, sameDenominator: false, allowMultiply: false },
  4: { maxDenom: 12, sameDenominator: false, allowMultiply: false },
  5: { maxDenom: 12, sameDenominator: false, allowMultiply: true },
};

function generateFractionArithmetic(level: LevelIndex): Problem | null {
  const config = FRACTION_CONFIG[level];
  if (!config) return null;

  if (config.allowMultiply && Math.random() < 0.5) {
    const d1 = randomInt(2, config.maxDenom);
    const n1 = randomInt(1, d1 - 1);
    const d2 = randomInt(2, config.maxDenom);
    const n2 = randomInt(1, d2 - 1);
    const [rn, rd] = reduceFraction(n1 * n2, d1 * d2);
    return {
      tex: `\\frac{${n1}}{${d1}} \\times \\frac{${n2}}{${d2}}`,
      explanationTex: `\\frac{${n1}}{${d1}} \\times \\frac{${n2}}{${d2}} = \\frac{${n1 * n2}}{${d1 * d2}} = \\frac{${rn}}{${rd}}`,
      blanks: [{ value: rn }, { value: rd }],
    };
  }

  const d1 = randomInt(2, config.maxDenom);
  const d2 = config.sameDenominator ? d1 : randomInt(2, config.maxDenom);
  let n1 = randomInt(1, d1 - 1);
  let n2 = randomInt(1, d2 - 1);
  const isAdd = Math.random() < 0.6;
  const L = lcm(d1, d2);
  const k1 = L / d1;
  const k2 = L / d2;
  // Keep subtraction non-negative by ordering the larger fraction first.
  if (!isAdd && n1 * k1 < n2 * k2) [n1, n2] = [n2, n1];
  const sumNumerator = isAdd ? n1 * k1 + n2 * k2 : n1 * k1 - n2 * k2;
  const [rn, rd] = reduceFraction(sumNumerator, L);
  const op = isAdd ? "+" : "-";
  const simplifyStep = rd === L ? "" : ` = \\frac{${rn}}{${rd}}`;
  return {
    tex: `\\frac{${n1}}{${d1}} ${op} \\frac{${n2}}{${d2}}`,
    explanationTex: `\\frac{${n1}}{${d1}} ${op} \\frac{${n2}}{${d2}} = \\frac{${n1 * k1}}{${L}} ${op} \\frac{${n2 * k2}}{${L}} = \\frac{${sumNumerator}}{${L}}${simplifyStep}`,
    blanks: [{ value: rn }, { value: rd }],
  };
}

// ---- 小数のたし算・ひき算・かけ算 (8級以上) ----
const DECIMAL_CONFIG: Partial<Record<LevelIndex, { places: number; allowMultiply: boolean; max: number }>> = {
  3: { places: 1, allowMultiply: false, max: 20 },
  4: { places: 1, allowMultiply: true, max: 30 },
  5: { places: 2, allowMultiply: true, max: 30 },
};

function generateDecimalArithmetic(level: LevelIndex): Problem | null {
  const config = DECIMAL_CONFIG[level];
  if (!config) return null;
  const scale = 10 ** config.places;
  const tolerance = 0.5 / scale;

  if (config.allowMultiply && Math.random() < 0.4) {
    const aInt = randomInt(1, config.max * scale);
    const a = aInt / scale;
    const b = randomInt(2, 9);
    const answer = Math.round(aInt * b) / scale;
    return {
      tex: `${a} \\times ${b}`,
      explanationTex: `${a} \\times ${b} = ${answer}`,
      blanks: [{ value: answer, tolerance }],
    };
  }

  const aInt = randomInt(1, config.max * scale);
  const bInt = randomInt(1, config.max * scale);
  const isAdd = Math.random() < 0.5;
  const a = aInt / scale;
  const b = bInt / scale;
  if (isAdd) {
    const answer = Math.round(aInt + bInt) / scale;
    return { tex: `${a} + ${b}`, explanationTex: `${a} + ${b} = ${answer}`, blanks: [{ value: answer, tolerance }] };
  }
  const big = Math.max(aInt, bInt) / scale;
  const small = Math.min(aInt, bInt) / scale;
  const answer = Math.round((Math.max(aInt, bInt) - Math.min(aInt, bInt))) / scale;
  return { tex: `${big} - ${small}`, explanationTex: `${big} - ${small} = ${answer}`, blanks: [{ value: answer, tolerance }] };
}

// ---- 割合(百分率) (6級のみ) ----
const PERCENTAGE_OPTIONS = [
  { percent: 10, multiple: 10 },
  { percent: 20, multiple: 5 },
  { percent: 25, multiple: 4 },
  { percent: 50, multiple: 2 },
  { percent: 75, multiple: 4 },
];

function generatePercentage(level: LevelIndex): Problem | null {
  if (level !== 5) return null;
  const option = PERCENTAGE_OPTIONS[randomInt(0, PERCENTAGE_OPTIONS.length - 1)];
  const base = option.multiple * randomInt(1, 10);
  const answer = (base * option.percent) / 100;
  return {
    instructionKey: "mathPercentageInstruction",
    instructionParams: { a: base, b: option.percent },
    explanationTex: `${base} \\times \\frac{${option.percent}}{100} = ${answer}`,
    blanks: [{ value: answer }],
  };
}

// ---- 単位変換 (10級以上) ----
type UnitPair = { small: string; big: string; factor: number };
const UNIT_CONFIG: Partial<Record<LevelIndex, UnitPair[]>> = {
  1: [{ small: "cm", big: "m", factor: 100 }],
  2: [{ small: "cm", big: "m", factor: 100 }, { small: "g", big: "kg", factor: 1000 }],
  3: [{ small: "g", big: "kg", factor: 1000 }, { small: "分", big: "時間", factor: 60 }],
  4: [{ small: "mL", big: "L", factor: 1000 }, { small: "分", big: "時間", factor: 60 }],
  5: [{ small: "mm", big: "m", factor: 1000 }, { small: "g", big: "t", factor: 1000000 }],
};

function generateUnitConversion(level: LevelIndex): Problem | null {
  const pairs = UNIT_CONFIG[level];
  if (!pairs) return null;
  const pair = pairs[randomInt(0, pairs.length - 1)];
  const bigValue = randomInt(1, 20);
  const smallValue = bigValue * pair.factor;
  if (Math.random() < 0.5) {
    return {
      instructionKey: "mathUnitConversionInstruction",
      instructionParams: { value: bigValue, fromUnit: pair.big, toUnit: pair.small },
      explanationTex: `${bigValue}\\text{${pair.big}} = ${bigValue} \\times ${pair.factor} = ${smallValue}\\text{${pair.small}}`,
      blanks: [{ value: smallValue }],
    };
  }
  return {
    instructionKey: "mathUnitConversionInstruction",
    instructionParams: { value: smallValue, fromUnit: pair.small, toUnit: pair.big },
    explanationTex: `${smallValue}\\text{${pair.small}} = ${smallValue} \\div ${pair.factor} = ${bigValue}\\text{${pair.big}}`,
    blanks: [{ value: bigValue }],
  };
}

const GENERATORS: Record<UnitId, (level: LevelIndex) => Problem | null> = {
  integerArithmetic: generateIntegerArithmetic,
  fractionArithmetic: generateFractionArithmetic,
  decimalArithmetic: generateDecimalArithmetic,
  percentage: generatePercentage,
  unitConversion: generateUnitConversion,
};

// Whether a unit has any content at all for a given level — checked against the same config
// tables the generators themselves read, so a level with no matching config is never picked.
const IS_AVAILABLE: Record<UnitId, (level: LevelIndex) => boolean> = {
  integerArithmetic: () => true,
  fractionArithmetic: level => FRACTION_CONFIG[level] !== undefined,
  decimalArithmetic: level => DECIMAL_CONFIG[level] !== undefined,
  percentage: level => level === 5,
  unitConversion: level => UNIT_CONFIG[level] !== undefined,
};

export function generateProblem(level: LevelIndex): Problem {
  const candidates = (Object.keys(GENERATORS) as UnitId[]).filter(id => IS_AVAILABLE[id](level));
  const id = candidates[randomInt(0, candidates.length - 1)];
  return GENERATORS[id](level) ?? generateIntegerArithmetic(level);
}
