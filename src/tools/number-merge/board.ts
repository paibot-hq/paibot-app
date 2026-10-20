// The rules of the number-merging puzzle: a 4 x 4 board of tiles, each a power of two. A move slides every tile as far as
// it will go that way; two tiles of the same number that meet become one of double the number (once per move: a tile made
// by a merge does not merge again in the same move), and the score goes up by the new number. After a move that changed
// something, a new tile (a 2, or now and then a 4) appears in an empty place. The game ends when no move changes the
// board. Pure functions, so they are tested without a browser.

export const SIZE = 4;
export const GOAL = 2048;
export type Direction = "left" | "right" | "up" | "down";
export const DIRECTIONS: readonly Direction[] = ["left", "right", "up", "down"];

// A tile on the board. `id` follows a tile as it slides, so the page can move it smoothly. A tile that merged into another
// is kept for one move with `gone` set, at the place it merged to, so it can be shown sliding in before it disappears.
export type Tile = { id: number; value: number; row: number; col: number; merged?: boolean; fresh?: boolean; gone?: boolean };

export type State = { tiles: Tile[]; score: number; nextId: number };

// A small, fast pseudo-random generator (mulberry32): the same seed gives the same game, which the tests rely on.
export function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const live = (tiles: readonly Tile[]) => tiles.filter(tile => !tile.gone);

export function emptyCells(tiles: readonly Tile[]): [number, number][] {
  const taken = new Set(live(tiles).map(t => t.row * SIZE + t.col));
  const out: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!taken.has(r * SIZE + c)) out.push([r, c]);
  return out;
}

// A new tile in a random empty place: a 2 nine times in ten, otherwise a 4. Nothing when the board is full.
export function spawn(state: State, next: () => number): State {
  const empty = emptyCells(state.tiles);
  if (!empty.length) return state;
  const [row, col] = empty[Math.floor(next() * empty.length)];
  const value = next() < 0.9 ? 2 : 4;
  // The tiles that merged away stay (marked gone) so the page can show them sliding in; the next move drops them.
  const kept = state.tiles.map(tile => (tile.gone ? tile : (({ fresh, ...t }) => t)(tile)));
  return { ...state, tiles: [...kept, { id: state.nextId, value, row, col, fresh: true }], nextId: state.nextId + 1 };
}

export function start(next: () => number): State {
  return spawn(spawn({ tiles: [], score: 0, nextId: 1 }, next), next);
}

// Slides and merges the tiles one way. `moved` says whether anything changed (a move that changes nothing is not a move,
// and spawns nothing). The tiles that merged away are kept with `gone` until the next move.
export function slide(state: State, direction: Direction): { state: State; moved: boolean } {
  const tiles = live(state.tiles).map(({ merged, fresh, ...t }) => ({ ...t }));
  // Lines of positions from the side the tiles move towards: for "left", each row from column 0 to 3.
  const lines: [number, number][][] = [];
  for (let i = 0; i < SIZE; i++) {
    const line: [number, number][] = [];
    for (let j = 0; j < SIZE; j++) {
      line.push(direction === "left" ? [i, j] : direction === "right" ? [i, SIZE - 1 - j] : direction === "up" ? [j, i] : [SIZE - 1 - j, i]);
    }
    lines.push(line);
  }
  const at = new Map(tiles.map(t => [t.row * SIZE + t.col, t]));
  const result: Tile[] = [];
  let gained = 0, moved = false;
  for (const line of lines) {
    const ordered = line.map(([r, c]) => at.get(r * SIZE + c)).filter((t): t is Tile => !!t);
    let place = 0;
    for (let k = 0; k < ordered.length; k++) {
      const tile = ordered[k];
      const [row, col] = line[place];
      const partner = ordered[k + 1];
      if (partner && partner.value === tile.value) {
        // The two meet at this place: the first stays (doubled), the second slides in and is gone.
        const value = tile.value * 2;
        gained += value;
        if (tile.row !== row || tile.col !== col || partner.row !== row || partner.col !== col) moved = true;
        result.push({ ...tile, row, col, value, merged: true });
        result.push({ ...partner, row, col, gone: true });
        k++;
      } else {
        if (tile.row !== row || tile.col !== col) moved = true;
        result.push({ ...tile, row, col });
      }
      place++;
    }
  }
  if (!moved) return { state, moved: false };
  return { state: { tiles: result, score: state.score + gained, nextId: state.nextId }, moved: true };
}

// A full move: slide, then (if anything changed) a new tile.
export function move(state: State, direction: Direction, next: () => number): { state: State; moved: boolean } {
  const slid = slide(state, direction);
  return slid.moved ? { state: spawn(slid.state, next), moved: true } : slid;
}

// Whether any move changes the board.
export const canMove = (state: State) => DIRECTIONS.some(direction => slide(state, direction).moved);
export const biggest = (state: State) => Math.max(0, ...live(state.tiles).map(t => t.value));
export const total = (state: State) => live(state.tiles).reduce((sum, t) => sum + t.value, 0);

// A board from rows of numbers (0 for empty), for tests and for showing a position.
export function fromRows(rows: readonly (readonly number[])[], score = 0): State {
  const tiles: Tile[] = [];
  let id = 1;
  rows.forEach((row, r) => row.forEach((value, c) => { if (value) tiles.push({ id: id++, value, row: r, col: c }); }));
  return { tiles, score, nextId: id };
}

export function toRows(state: State): number[][] {
  const rows = Array.from({ length: SIZE }, () => Array<number>(SIZE).fill(0));
  for (const t of live(state.tiles)) rows[t.row][t.col] = t.value;
  return rows;
}
