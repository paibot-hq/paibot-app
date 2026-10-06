// A roulette wheel: the items are the segments, and a spin ends with the pointer (at the top) on the one chosen.

export const MAX_ITEMS = 50;

// The items typed one to a line: trimmed, blanks dropped, the same name kept only once, at most MAX_ITEMS.
export function parseItems(text: string): string[] {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const item = line.trim();
    if (!item || seen.has(item)) continue;
    seen.add(item);
    items.push(item);
    if (items.length >= MAX_ITEMS) break;
  }
  return items;
}

// A fair pick of one of `count` items from random bytes (the page passes crypto.getRandomValues), without the bias a
// plain `% count` has.
export function pick(count: number, randomWord: () => number): number {
  if (count <= 1) return 0;
  const limit = Math.floor(4294967296 / count) * count;
  for (;;) {
    const word = randomWord() >>> 0;
    if (word < limit) return word % count;
  }
}

// How far (in degrees, clockwise) the wheel has turned in all when it stops with segment `index` under the pointer at
// the top: `turns` whole turns, then the rest, and `offset` (-0.5 to 0.5 of a segment) so it does not always stop dead
// centre. Segment i spans [i, i + 1) / count of a turn, clockwise from the top.
export function stopAngle(index: number, count: number, turns: number, offset: number): number {
  const width = 360 / Math.max(1, count);
  const centre = (index + 0.5) * width;
  return turns * 360 + ((360 - centre - offset * width * 0.8) % 360 + 360) % 360;
}

// The segment under the pointer when the wheel has turned `angle` degrees clockwise.
export function segmentAt(angle: number, count: number): number {
  const at = ((-angle % 360) + 360) % 360;
  return Math.min(count - 1, Math.floor((at / 360) * count));
}

// Colours for the segments: spread round the hue wheel, and alternating in lightness so neighbours differ even for two items.
export function colour(index: number, count: number): string {
  return `hsl(${Math.round((index / Math.max(1, count)) * 330 + 8)} ${index % 2 ? 62 : 74}% ${index % 2 ? 52 : 60}%)`;
}

// The ease of a spin: fast at first, slowing to a stop (t from 0 to 1 gives 0 to 1).
export function ease(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - clamped, 4);
}
