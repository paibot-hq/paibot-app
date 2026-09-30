import type { ReactNode } from 'react';
import styles from './math-shape.module.css';

// Helpers shared by the figure drawings (math-shape.tsx, math-shape-more.tsx).
export const W = 320, H = 220;
export type Pt = [number, number];
export const rad = (deg: number) => (deg * Math.PI) / 180;
export const polar = (r: number, deg: number): Pt => [r * Math.cos(rad(deg)), r * Math.sin(rad(deg))];
export const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
export const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

// Maps model coordinates (y up) into the drawing, centred, keeping the proportions.
export function frame(points: Pt[], pad = { l: 44, r: 44, t: 30, b: 36 }) {
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const s = Math.min((W - pad.l - pad.r) / (maxX - minX || 1), (H - pad.t - pad.b) / (maxY - minY || 1));
  const ox = pad.l + (W - pad.l - pad.r - s * (maxX - minX)) / 2, oy = pad.t + (H - pad.t - pad.b - s * (maxY - minY)) / 2;
  const at = ([x, y]: Pt): Pt => [ox + s * (x - minX), oy + s * (maxY - y)];
  return { at, s };
}
export const d = (points: Pt[], close = false) => `${points.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('')}${close ? 'Z' : ''}`;
export const Label = ({ at, children, anchor = 'middle', unknown }: { at: Pt; children: ReactNode; anchor?: 'start' | 'middle' | 'end'; unknown?: boolean }) =>
  <text className={unknown ? styles.unknown : styles.text} x={at[0]} y={at[1]} textAnchor={anchor} dominantBaseline="central">{children}</text>;
// A small square at a right angle whose corner is `corner`, between the directions u and v.
export const rightMark = (corner: Pt, u: Pt, v: Pt, size = 9) => {
  const unit = (p: Pt): Pt => { const n = Math.hypot(p[0], p[1]) || 1; return [(p[0] / n) * size, (p[1] / n) * size]; };
  const a = unit(u), b = unit(v);
  return <path className={styles.mark} d={d([add(corner, a), add(add(corner, a), b), add(corner, b)])} />;
};
// An arc of radius r around `center` from angle a to b (degrees, screen angles measured like the model: y up).
export const arc = (center: Pt, r: number, from: number, to: number) => {
  const p = (deg: number): Pt => [center[0] + r * Math.cos(rad(deg)), center[1] - r * Math.sin(rad(deg))];
  const [a, b] = [p(from), p(to)];
  return <path className={styles.mark} d={`M${a[0].toFixed(1)} ${a[1].toFixed(1)}A${r} ${r} 0 ${Math.abs(to - from) > 180 ? 1 : 0} ${to > from ? 0 : 1} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`} />;
};
export const cm = (v: number) => `${v} cm`;

