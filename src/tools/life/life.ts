// Conway's Game of Life on a torus (the edges wrap round). A cell is 0 when dead, otherwise its age in generations (1..255), so the
// picture can colour old cells differently. Pure functions, tested without a browser.

export type Life = { width: number; height: number; cells: Uint8Array };

export function create(width: number, height: number): Life {
  return { width, height, cells: new Uint8Array(width * height) };
}

export const index = (life: Life, x: number, y: number) => ((y + life.height) % life.height) * life.width + ((x + life.width) % life.width);

export function count(life: Life): number {
  let alive = 0;
  for (const cell of life.cells) if (cell > 0) alive++;
  return alive;
}

// The next generation: a live cell with 2 or 3 live neighbours stays (and gets older), a dead cell with exactly 3 is born.
export function step(life: Life): Life {
  const { width, height, cells } = life;
  const next = new Uint8Array(cells.length);
  for (let y = 0; y < height; y++) {
    const up = ((y + height - 1) % height) * width, here = y * width, down = ((y + 1) % height) * width;
    for (let x = 0; x < width; x++) {
      const left = (x + width - 1) % width, right = (x + 1) % width;
      const neighbours = (cells[up + left] > 0 ? 1 : 0) + (cells[up + x] > 0 ? 1 : 0) + (cells[up + right] > 0 ? 1 : 0)
        + (cells[here + left] > 0 ? 1 : 0) + (cells[here + right] > 0 ? 1 : 0)
        + (cells[down + left] > 0 ? 1 : 0) + (cells[down + x] > 0 ? 1 : 0) + (cells[down + right] > 0 ? 1 : 0);
      const age = cells[here + x];
      next[here + x] = age > 0 ? (neighbours === 2 || neighbours === 3 ? Math.min(255, age + 1) : 0) : (neighbours === 3 ? 1 : 0);
    }
  }
  return { width, height, cells: next };
}

export function fill(life: Life, density: number, rng: () => number): Life {
  const next = create(life.width, life.height);
  for (let i = 0; i < next.cells.length; i++) next.cells[i] = rng() < density ? 1 : 0;
  return next;
}

// Patterns as text: "O" is a live cell, "." a dead one.
export const PATTERNS = {
  glider: [".O.", "..O", "OOO"],
  blinker: ["OOO"],
  toad: [".OOO", "OOO."],
  beacon: ["OO..", "OO..", "..OO", "..OO"],
  pulsar: [
    "..OOO...OOO..", ".............", "O....O.O....O", "O....O.O....O", "O....O.O....O",
    "..OOO...OOO..", ".............", "..OOO...OOO..", "O....O.O....O", "O....O.O....O", "O....O.O....O",
    ".............", "..OOO...OOO..",
  ],
  lwss: [".O..O", "O....", "O...O", "OOOO."],
  rpentomino: [".OO", "OO.", ".O."],
  acorn: [".O.....", "...O...", "OO..OOO"],
  gun: [
    "........................O...........",
    "......................O.O...........",
    "............OO......OO............OO",
    "...........O...O....OO............OO",
    "OO........O.....O...OO..............",
    "OO........O...O.OO....O.O...........",
    "..........O.....O.......O...........",
    "...........O...O....................",
    "............OO......................",
  ],
} as const;
export type PatternName = keyof typeof PATTERNS;
export const PATTERN_NAMES = Object.keys(PATTERNS) as PatternName[];

// Puts a pattern with its top-left corner at (x, y), wrapping round the edges.
export function place(life: Life, rows: readonly string[], x: number, y: number): Life {
  const cells = life.cells.slice();
  rows.forEach((row, dy) => [...row].forEach((c, dx) => { if (c === "O") cells[index(life, x + dx, y + dy)] = 1; }));
  return { ...life, cells };
}

export const patternSize = (rows: readonly string[]) => ({ width: Math.max(...rows.map(r => r.length)), height: rows.length });

export function toggle(life: Life, x: number, y: number, alive: boolean): Life {
  const cells = life.cells.slice();
  cells[index(life, x, y)] = alive ? 1 : 0;
  return { ...life, cells };
}
