import type { Figure } from "./matrix";

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

// A panel of the matrix or a choice: the figure's shape, count, size and fill drawn on a 100 x 100 square.
export default function FigurePanel({ figure }: { figure: Figure }) {
  const { at, room } = PLACES[figure.count];
  const r = (room * SIZES[figure.size]) / 2;
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      {at.map(([x, y], i) => shape(figure.shape, x, y, r, FILLS[figure.fill], i))}
    </svg>
  );
}
