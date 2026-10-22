export const COLORS = ['pink', 'blue', 'green', 'orange'] as const;
export type Color = typeof COLORS[number];
export function draw(previous?: Color, random = Math.random) {
  const available = COLORS.filter(color => color !== previous);
  const ink = available[Math.floor(random() * available.length)];
  const words = COLORS.filter(color => color !== ink);
  return { ink, word: words[Math.floor(random() * words.length)] };
}
export function points(streak: number) { return 10 * Math.min(4, 1 + Math.floor(streak / 5)); }
