import type { Family, Panel } from "./matrix";

// Where the figures of a panel stand (0-based count: one to four of them) and how much room each has, on a 100 x 100
// panel.
// Big enough to tell a pentagon from a hexagon on a phone's small choice buttons: the figures fill most of their room.
const PLACES: { at: [number, number][]; room: number }[] = [
  { at: [[50, 50]], room: 70 },
  { at: [[27, 50], [73, 50]], room: 44 },
  { at: [[27, 28], [73, 28], [50, 73]], room: 42 },
  { at: [[27, 27], [73, 27], [27, 73], [73, 73]], room: 42 },
];
const SIZES = [0.6, 0.8, 1];
// White to black in five clear steps; the panels are white in both themes, so these do not change with the theme.
export const FILLS = ["#ffffff", "#d4d4d4", "#a3a3a3", "#666666", "#222222"];
const INK = "#222222";

// One figure: a triangle, square, pentagon or hexagon (a flat side at the bottom), or a circle.
function shape(kind: number, cx: number, cy: number, r: number, fill: string, key: number) {
  if (kind === 4) return <circle key={key} cx={cx} cy={cy} r={r} fill={fill} stroke={INK} strokeWidth={2.4} />;
  const sides = kind + 3;
  const points = Array.from({ length: sides }, (_, i) => {
    const angle = Math.PI / 2 + Math.PI / sides + (2 * Math.PI * i) / sides;
    return `${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`;
  });
  return <polygon key={key} points={points.join(" ")} fill={fill} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />;
}

// The eight lines a "lines" panel draws from: the sides of a square, its diagonals and its middle lines (bit order).
const LO = 16, HI = 84, MID = 50;
const LINES: [number, number, number, number][] = [
  [LO, LO, HI, LO], [HI, LO, HI, HI], [LO, HI, HI, HI], [LO, LO, LO, HI],
  [LO, LO, HI, HI], [HI, LO, LO, HI], [LO, MID, HI, MID], [MID, LO, MID, HI],
];
const GUIDE = "#ececec";

// A panel of the matrix or a choice, drawn on a 100 x 100 square: figures (shape, count, size, fill), a figure inside
// another, lines (with the unused places faintly), or dots on a 3 x 3 grid (the empty places faintly).
export default function FigurePanel({ family, panel }: { family: Family; panel: Panel }) {
  if (family === "lines") {
    return (
      <svg viewBox="0 0 100 100" aria-hidden="true">
        {LINES.map(([x1, y1, x2, y2], i) => <line key={`g${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={GUIDE} strokeWidth={2} />)}
        {LINES.map(([x1, y1, x2, y2], i) => (panel.mask >> i) & 1 ? <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth={5} strokeLinecap="round" /> : null)}
      </svg>
    );
  }
  if (family === "dots") {
    return (
      <svg viewBox="0 0 100 100" aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => {
          const cx = 22 + (i % 3) * 28, cy = 22 + Math.floor(i / 3) * 28;
          return (panel.mask >> i) & 1
            ? <circle key={i} cx={cx} cy={cy} r={10} fill={INK} />
            : <circle key={i} cx={cx} cy={cy} r={10} fill="none" stroke={GUIDE} strokeWidth={2} />;
        })}
      </svg>
    );
  }
  if (family === "nested") {
    return (
      <svg viewBox="0 0 100 100" aria-hidden="true">
        {shape(panel.outer, 50, 52, 38, FILLS[panel.outerFill], 0)}
        {shape(panel.inner, 50, 52, 14, FILLS[panel.innerFill], 1)}
      </svg>
    );
  }
  const { at, room } = PLACES[panel.count];
  const r = (room * SIZES[panel.size]) / 2;
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      {at.map(([x, y], i) => shape(panel.shape, x, y, r, FILLS[panel.fill], i))}
    </svg>
  );
}
