// The personality test: the Big Five, measured by the twenty items of the Mini-IPIP (Donnellan, Oswald, Baird & Lucas,
// 2006), which are items of the International Personality Item Pool (ipip.ori.org), in the public domain. Each trait has
// four items, answered from 1 (very inaccurate) to 5 (very accurate); some are keyed the other way. The translations
// are this site's own. Pure functions, so they are tested without a browser.
//
// Neuroticism is shown the other way up, as emotional stability, so that every trait reads "more is more of it".

export type Trait = "extraversion" | "agreeableness" | "conscientiousness" | "stability" | "openness";
export const TRAITS: readonly Trait[] = ["extraversion", "agreeableness", "conscientiousness", "stability", "openness"];

// The items in the Mini-IPIP's order (its messages are App.personality.items.<n>): the trait each measures, and whether
// agreeing means more of it (+1) or less (-1).
export const ITEMS: readonly { trait: Trait; key: 1 | -1 }[] = [
  { trait: "extraversion", key: 1 },        // Am the life of the party.
  { trait: "agreeableness", key: 1 },       // Sympathize with others' feelings.
  { trait: "conscientiousness", key: 1 },   // Get chores done right away.
  { trait: "stability", key: -1 },          // Have frequent mood swings.
  { trait: "openness", key: 1 },            // Have a vivid imagination.
  { trait: "extraversion", key: -1 },       // Don't talk a lot.
  { trait: "agreeableness", key: -1 },      // Am not interested in other people's problems.
  { trait: "conscientiousness", key: -1 },  // Often forget to put things back in their proper place.
  { trait: "stability", key: 1 },           // Am relaxed most of the time.
  { trait: "openness", key: -1 },           // Am not interested in abstract ideas.
  { trait: "extraversion", key: 1 },        // Talk to a lot of different people at parties.
  { trait: "agreeableness", key: 1 },       // Feel others' emotions.
  { trait: "conscientiousness", key: 1 },   // Like order.
  { trait: "stability", key: -1 },          // Get upset easily.
  { trait: "openness", key: -1 },           // Have difficulty understanding abstract ideas.
  { trait: "extraversion", key: -1 },       // Keep in the background.
  { trait: "agreeableness", key: -1 },      // Am not really interested in others.
  { trait: "conscientiousness", key: -1 },  // Make a mess of things.
  { trait: "stability", key: 1 },           // Seldom feel blue.
  { trait: "openness", key: -1 },           // Do not have a good imagination.
];
export const CHOICES = 5;
// A trait's raw score, its four items added up: 4 to 20.
export const MIN_RAW = 4;
export const MAX_RAW = 20;

export type Scores = Record<Trait, number>;

// The raw scores (4-20) of a full set of answers (1-5 each, in the items' order).
export function rawScores(answers: readonly number[]): Scores {
  const scores = Object.fromEntries(TRAITS.map(t => [t, 0])) as Scores;
  ITEMS.forEach(({ trait, key }, i) => { scores[trait] += key === 1 ? answers[i] : CHOICES + 1 - answers[i]; });
  return scores;
}

// A raw score as 0-100.
export const percent = (raw: number) => Math.round(((raw - MIN_RAW) / (MAX_RAW - MIN_RAW)) * 100);

export const isComplete = (answers: readonly unknown[]) => answers.length === ITEMS.length && answers.every(a => Number.isInteger(a) && (a as number) >= 1 && (a as number) <= CHOICES);
export const isKeptResult = (scores: Partial<Record<string, unknown>>) => TRAITS.every(t => Number.isInteger(scores[t]) && (scores[t] as number) >= MIN_RAW && (scores[t] as number) <= MAX_RAW);

// ---- The animal (for fun, not a scientific type) ----

export type Animal = "dolphin" | "owl" | "elephant" | "wolf" | "beaver" | "cat" | "turtle" | "rabbit" | "fox" | "dog" | "penguin";
const ANIMALS: Record<Trait, [high: Animal, low: Animal]> = {
  extraversion: ["dolphin", "owl"],
  agreeableness: ["elephant", "wolf"],
  conscientiousness: ["beaver", "cat"],
  stability: ["turtle", "rabbit"],
  openness: ["fox", "dog"],
};
export const ANIMAL_EMOJI: Record<Animal, string> = {
  dolphin: "🐬", owl: "🦉", elephant: "🐘", wolf: "🐺", beaver: "🦫", cat: "🐈", turtle: "🐢", rabbit: "🐇", fox: "🦊", dog: "🐕", penguin: "🐧",
};
// How far from the middle (50) a trait must be to give the animal; nearer than this on every trait is the balanced penguin.
export const STANDOUT = 20;

// The animal of the trait that stands out most from the middle, high or low (the first in TRAITS on a tie).
export function animalOf(scores: Scores): { animal: Animal; trait: Trait | null } {
  let best: Trait | null = null, far = 0;
  for (const t of TRAITS) { const d = Math.abs(percent(scores[t]) - 50); if (d > far) { far = d; best = t; } }
  if (!best || far < STANDOUT) return { animal: "penguin", trait: null };
  return { animal: ANIMALS[best][percent(scores[best]) >= 50 ? 0 : 1], trait: best };
}

// ---- Among everyone's ----

export type Distributions = { counts: Record<Trait, number[]>; total: number };
export function distributionsFrom(rows: Partial<Record<Trait, { raw: number; count: number }[]>>, total: number): Distributions {
  const counts = Object.fromEntries(TRAITS.map(t => {
    const bins = Array<number>(MAX_RAW - MIN_RAW + 1).fill(0);
    for (const { raw, count } of rows[t] ?? []) if (raw >= MIN_RAW && raw <= MAX_RAW) bins[Math.floor(raw) - MIN_RAW] += Number(count);
    return [t, bins];
  })) as Record<Trait, number[]>;
  return { counts, total };
}

// "Top X%" of a raw score among everyone's on that trait (this one included): the share above it plus half the ties.
export function topPercent(bins: readonly number[], raw: number): number {
  const total = bins.reduce((a, b) => a + b, 0);
  if (!total) return 50;
  const i = raw - MIN_RAW;
  const above = bins.slice(i + 1).reduce((a, b) => a + b, 0);
  return Math.min(99, Math.max(1, Math.round(((above + bins[i] / 2) / total) * 100)));
}
