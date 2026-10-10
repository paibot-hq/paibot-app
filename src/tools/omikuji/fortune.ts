// What an omikuji draw gives: the stick's number, the luck, a line for each of four things, a lucky colour and a lucky number. The words are in the
// messages (App.omikuji); this file only decides which ones, so that it can be tested.

export type Rng = () => number;
export type Tone = "good" | "mid" | "bad";
export const CATEGORIES = ["wish", "love", "work", "money"] as const;
export type Category = (typeof CATEGORIES)[number];
export const COLORS = ["red", "orange", "yellow", "green", "blue", "purple", "white", "pink"] as const;
export type Color = (typeof COLORS)[number];
export const VARIANTS = ["a", "b"] as const;
export type Variant = (typeof VARIANTS)[number];

// From the best luck to the worst, and how often each comes (out of 100): a shrine's box has few of the best and the worst.
export const LUCKS = [
  { id: "daikichi", weight: 15, tone: "good" },
  { id: "kichi", weight: 25, tone: "good" },
  { id: "chukichi", weight: 20, tone: "good" },
  { id: "shokichi", weight: 20, tone: "mid" },
  { id: "suekichi", weight: 14, tone: "mid" },
  { id: "kyo", weight: 6, tone: "bad" },
] as const satisfies readonly { id: string; weight: number; tone: Tone }[];
export type LuckId = (typeof LUCKS)[number]["id"];

export type Fortune = {
  stick: number; // 1 to 100
  luck: LuckId;
  tone: Tone;
  lines: Record<Category, Variant>;
  color: Color;
  number: number; // 1 to 99
};

export function pickLuck(roll: number): (typeof LUCKS)[number] {
  let edge = 0;
  for (const luck of LUCKS) { edge += luck.weight; if (roll * 100 < edge) return luck; }
  return LUCKS[LUCKS.length - 1];
}

const below = (rng: Rng, n: number) => Math.min(n - 1, Math.floor(rng() * n));

export function draw(rng: Rng): Fortune {
  const luck = pickLuck(rng());
  return {
    stick: below(rng, 100) + 1,
    luck: luck.id,
    tone: luck.tone,
    lines: Object.fromEntries(CATEGORIES.map(category => [category, VARIANTS[below(rng, VARIANTS.length)]])) as Record<Category, Variant>,
    color: COLORS[below(rng, COLORS.length)],
    number: below(rng, 99) + 1,
  };
}

// The message key of a line: lines.<category>.<tone>.<variant>.
export const lineKey = (category: Category, tone: Tone, variant: Variant) => `lines.${category}.${tone}.${variant}`;
