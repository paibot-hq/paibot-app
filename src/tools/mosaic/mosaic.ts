// Hiding parts of a photo: the regions drawn on it, how coarse the mosaic must be so that it cannot be undone, and the editing history. Pure
// functions; the drawing itself is in mosaic-view.tsx. All positions are in the picture's own pixels, so the saved file is made from the full-size
// picture, not from what was on the screen.

export type Effect = "mosaic" | "blur" | "black";
export type Shape = "rect" | "ellipse" | "pen";
export type Point = { x: number; y: number };
export type Region =
  | { shape: "rect" | "ellipse"; effect: Effect; level: number; a: Point; b: Point }
  | { shape: "pen"; effect: Effect; level: number; width: number; points: Point[] };

export const LEVELS = [1, 2, 3, 4, 5] as const;
export const DEFAULT_LEVEL = 3;
// How many cells fit across the shorter side of a region for each level: the more cells, the finer the mosaic (level 1). Few enough that no face or
// text can be read back, and never finer than MIN_CELL.
const CELLS_ACROSS: Record<number, number> = { 1: 8, 2: 6, 3: 5, 4: 4, 5: 3 };

export type Box = { x: number; y: number; width: number; height: number };

const clamp = (n: number, low: number, high: number) => Math.min(high, Math.max(low, n));

export function rectBox(a: Point, b: Point): Box {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) };
}

// The smallest box that holds a region (a pen stroke with its width), cut to the picture.
export function regionBox(region: Region, imageWidth: number, imageHeight: number): Box {
  let box: Box;
  if (region.shape === "pen") {
    const xs = region.points.map(p => p.x), ys = region.points.map(p => p.y);
    const half = region.width / 2;
    box = { x: Math.min(...xs) - half, y: Math.min(...ys) - half, width: Math.max(...xs) - Math.min(...xs) + region.width, height: Math.max(...ys) - Math.min(...ys) + region.width };
  } else box = rectBox(region.a, region.b);
  const x = clamp(Math.floor(box.x), 0, imageWidth), y = clamp(Math.floor(box.y), 0, imageHeight);
  const right = clamp(Math.ceil(box.x + box.width), 0, imageWidth), bottom = clamp(Math.ceil(box.y + box.height), 0, imageHeight);
  return { x, y, width: right - x, height: bottom - y };
}

// The width of the pen in the picture's pixels for a stroke the visitor sees as `screenWidth` wide.
export const penWidth = (screenWidth: number, scale: number) => Math.max(1, screenWidth / scale);

// The size of one cell of the mosaic (in the picture's pixels). It follows the region, not the picture: a small face gets small cells and a large one
// large cells, so each is always a few cells across and cannot be read back; and it is never below a floor of the picture's size.
export function cellSize(region: Region, imageWidth: number, imageHeight: number): number {
  const box = regionBox(region, imageWidth, imageHeight);
  const across = region.shape === "pen" ? Math.max(1, region.width) : Math.max(1, Math.min(box.width, box.height));
  const floor = Math.max(6, Math.round(Math.max(imageWidth, imageHeight) / 160));
  return Math.max(floor, Math.round(across / CELLS_ACROSS[clamp(Math.round(region.level), 1, 5)]));
}

// Whether a region is worth keeping: a click or a tiny drag is not a region.
export function usable(region: Region, imageWidth: number, imageHeight: number): boolean {
  const box = regionBox(region, imageWidth, imageHeight);
  const floor = Math.max(8, Math.round(Math.max(imageWidth, imageHeight) / 200));
  return region.shape === "pen" ? region.points.length >= 2 && box.width >= floor && box.height >= 1 : box.width >= floor && box.height >= floor;
}

// The editing history: what is done, and what was undone and can be done again.
export type History = { done: Region[]; undone: Region[] };
export const empty: History = { done: [], undone: [] };
export const add = (history: History, region: Region): History => ({ done: [...history.done, region], undone: [] });
export const undo = (history: History): History => (history.done.length === 0 ? history : { done: history.done.slice(0, -1), undone: [...history.undone, history.done[history.done.length - 1]] });
export const redo = (history: History): History => (history.undone.length === 0 ? history : { done: [...history.done, history.undone[history.undone.length - 1]], undone: history.undone.slice(0, -1) });
export const clear = (history: History): History => (history.done.length === 0 ? history : { done: [], undone: [...history.undone, ...[...history.done].reverse()] });

// The size the picture is shown at on the screen: as large as the room allows, never larger than it is.
export function fit(imageWidth: number, imageHeight: number, roomWidth: number, roomHeight: number): { width: number; height: number; scale: number } {
  const scale = Math.min(1, roomWidth / imageWidth, roomHeight / imageHeight);
  return { width: Math.max(1, Math.round(imageWidth * scale)), height: Math.max(1, Math.round(imageHeight * scale)), scale };
}

// The name of the saved file: the original's, with "-hidden" and the extension of the format it is saved in.
export function savedName(name: string, extension: string): string {
  return `${name.replace(/\.[^.]*$/, "") || "photo"}-hidden.${extension}`;
}
