// Unit conversion. Each category has a base unit; a unit is `factor` base units, so a conversion is a multiplication
// and a division. Temperature is the exception: it has an offset, so each unit converts to and from kelvin by a function.

export type Category = "length" | "weight" | "area" | "volume" | "speed" | "temperature" | "data";
export type Unit = { id: string; factor?: number; toBase?: (v: number) => number; fromBase?: (v: number) => number };

export const CATEGORIES: Record<Category, { base: string; units: Unit[] }> = {
  length: { base: "m", units: [
    { id: "mm", factor: 0.001 }, { id: "cm", factor: 0.01 }, { id: "m", factor: 1 }, { id: "km", factor: 1000 },
    { id: "in", factor: 0.0254 }, { id: "ft", factor: 0.3048 }, { id: "yd", factor: 0.9144 }, { id: "mi", factor: 1609.344 },
    { id: "shaku", factor: 10 / 33 }, { id: "ken", factor: 20 / 11 }, { id: "nmi", factor: 1852 },
  ] },
  weight: { base: "g", units: [
    { id: "mg", factor: 0.001 }, { id: "g", factor: 1 }, { id: "kg", factor: 1000 }, { id: "t", factor: 1_000_000 },
    { id: "oz", factor: 28.349523125 }, { id: "lb", factor: 453.59237 }, { id: "momme", factor: 3.75 }, { id: "kan", factor: 3750 },
  ] },
  area: { base: "m2", units: [
    { id: "cm2", factor: 0.0001 }, { id: "m2", factor: 1 }, { id: "a", factor: 100 }, { id: "ha", factor: 10_000 }, { id: "km2", factor: 1_000_000 },
    { id: "ft2", factor: 0.09290304 }, { id: "acre", factor: 4046.8564224 }, { id: "tsubo", factor: 400 / 121 }, { id: "jo", factor: 1.62 },
  ] },
  volume: { base: "L", units: [
    { id: "mL", factor: 0.001 }, { id: "L", factor: 1 }, { id: "m3", factor: 1000 }, { id: "tsp", factor: 0.00492892159375 },
    { id: "tbsp", factor: 0.01478676478125 }, { id: "cup", factor: 0.2365882365 }, { id: "gal", factor: 3.785411784 }, { id: "go", factor: 0.18039 }, { id: "sho", factor: 1.8039 },
  ] },
  speed: { base: "m/s", units: [
    { id: "m/s", factor: 1 }, { id: "km/h", factor: 1 / 3.6 }, { id: "mph", factor: 0.44704 }, { id: "kn", factor: 1852 / 3600 }, { id: "mach", factor: 340.29 },
  ] },
  temperature: { base: "K", units: [
    { id: "C", toBase: v => v + 273.15, fromBase: v => v - 273.15 },
    { id: "F", toBase: v => ((v - 32) * 5) / 9 + 273.15, fromBase: v => ((v - 273.15) * 9) / 5 + 32 },
    { id: "K", toBase: v => v, fromBase: v => v },
  ] },
  // Data sizes: decimal (kB = 1000 B) and binary (KiB = 1024 B).
  data: { base: "B", units: [
    { id: "bit", factor: 1 / 8 }, { id: "B", factor: 1 }, { id: "kB", factor: 1e3 }, { id: "MB", factor: 1e6 }, { id: "GB", factor: 1e9 }, { id: "TB", factor: 1e12 },
    { id: "KiB", factor: 1024 }, { id: "MiB", factor: 1024 ** 2 }, { id: "GiB", factor: 1024 ** 3 }, { id: "TiB", factor: 1024 ** 4 },
  ] },
};

export const CATEGORY_IDS = Object.keys(CATEGORIES) as Category[];

function unitOf(category: Category, id: string): Unit {
  const unit = CATEGORIES[category].units.find(entry => entry.id === id);
  if (!unit) throw new Error(`Unknown unit ${category}/${id}`);
  return unit;
}

export function convert(category: Category, from: string, to: string, value: number): number {
  const source = unitOf(category, from);
  const target = unitOf(category, to);
  const base = source.toBase ? source.toBase(value) : value * (source.factor as number);
  return target.fromBase ? target.fromBase(base) : base / (target.factor as number);
}

// A number as people read it: enough digits to be useful, no trailing zeros, no float noise (0.30000000000000004).
export function format(value: number, locale = "en"): string {
  if (!Number.isFinite(value)) return "";
  if (value === 0) return "0";
  const magnitude = Math.abs(value);
  if (magnitude >= 1e15 || magnitude < 1e-6) return value.toExponential(6).replace(/\.?0+e/, "e");
  const rounded = Number(value.toPrecision(10));
  return rounded.toLocaleString(locale, { maximumFractionDigits: 10 });
}
