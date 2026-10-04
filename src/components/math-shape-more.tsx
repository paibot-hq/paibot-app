import type { ReactNode } from 'react';
import styles from './math-shape.module.css';
import { W, H, add, arc, cm, d, frame, Label, mid, polar, rad, rightMark, type Pt } from './math-shape-kit';

// More figures of math-shape.tsx: solids, triangles and quadrilaterals, lines, moves on a grid,
// charts and tables. `nums` are the hidden numbers of the problem, in the order the kind lists.

// A triangle from its sides (P0P1 = s1, P1P2 = s2, P2P0 = s3), in model coordinates (y up).
const triangle = (s1: number, s2: number, s3: number): [Pt, Pt, Pt] => {
  const x = (s1 * s1 + s3 * s3 - s2 * s2) / (2 * s1);
  return [[0, 0], [s1, 0], [x, Math.sqrt(Math.max(s3 * s3 - x * x, 0))]];
};
// Points on the far side of the centre from `from`, `gap` away from `p`.
const outward = (p: Pt, centre: Pt, gap: number): Pt => { const u = [p[0] - centre[0], p[1] - centre[1]], n = Math.hypot(u[0], u[1]) || 1; return [p[0] + (u[0] / n) * gap, p[1] + (u[1] / n) * gap]; };
const centroidOf = (pts: Pt[]): Pt => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
// A triangle fitted into a box (x0..x1, y0..y1) of the drawing.
const fitIn = (pts: Pt[], box: [number, number, number, number]): Pt[] => {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const w = Math.max(...xs) - Math.min(...xs) || 1, h = Math.max(...ys) - Math.min(...ys) || 1;
  const s = Math.min((box[2] - box[0]) / w, (box[3] - box[1]) / h);
  const ox = box[0] + (box[2] - box[0] - s * w) / 2, oy = box[1] + (box[3] - box[1] - s * h) / 2;
  return pts.map(p => [ox + s * (p[0] - Math.min(...xs)), oy + s * (Math.max(...ys) - p[1])]);
};
const vertexNames = (pts: Pt[], names: string[]) => pts.map((p, i) => <Label key={names[i]} at={outward(p, centroidOf(pts), 13)}>{names[i]}</Label>);
const tick = (a: Pt, b: Pt, count: number, key: string) => {
  const m = mid(a, b), u = [b[0] - a[0], b[1] - a[1]], n = Math.hypot(u[0], u[1]) || 1, t: Pt = [u[0] / n, u[1] / n], nn: Pt = [-t[1], t[0]];
  return <g key={key}>{Array.from({ length: count }, (_, k) => { const c: Pt = [m[0] + t[0] * (k - (count - 1) / 2) * 5, m[1] + t[1] * (k - (count - 1) / 2) * 5]; return <path key={k} className={styles.mark} d={d([[c[0] - nn[0] * 5, c[1] - nn[1] * 5], [c[0] + nn[0] * 5, c[1] + nn[1] * 5]])} />; })}</g>;
};
// Arcs at a vertex of a screen triangle, `count` of them (marks an equal angle).
const angleMark = (p: Pt, a: Pt, b: Pt, count: number, key: string) => {
  const ang = (q: Pt) => (Math.atan2(-(q[1] - p[1]), q[0] - p[0]) * 180) / Math.PI;
  let from = ang(a), to = ang(b);
  while (to - from > 180) to -= 360;
  while (from - to > 180) to += 360;
  return <g key={key}>{Array.from({ length: count }, (_, k) => <g key={k}>{arc(p, 16 + 5 * k, from, to)}</g>)}</g>;
};

function solid(n: number, pyramid: boolean): ReactNode {
  const R = 62, ry = 0.3, height = 92, cx = W / 2, baseY = 150;
  const ring = Array.from({ length: n }, (_, k): Pt => { const a = rad(-90 + (360 * k) / n); return [cx + R * Math.cos(a), baseY - R * ry * Math.sin(a) * -1]; });
  // Model y is up: a vertex on the near side (sin(angle) < 0) is lower on the screen.
  const near = (k: number) => Math.sin(rad(-90 + (360 * k) / n)) < -0.05 || Math.abs(Math.cos(rad(-90 + (360 * k) / n))) > 0.98;
  const top = ring.map((p): Pt => [p[0], p[1] - height]), apex: Pt = [cx, baseY - height - 6];
  const edges: ReactNode[] = [];
  for (let k = 0; k < n; k++) {
    const next = (k + 1) % n, visible = near(k) && near(next) || (near(k) !== near(next) && false);
    const front = near(k) || near(next);
    edges.push(<path key={`b${k}`} className={front && visible ? styles.line : styles.dashed} d={d([ring[k], ring[next]])} />);
    if (!pyramid) edges.push(<path key={`t${k}`} className={styles.line} d={d([top[k], top[next]])} />);
    edges.push(<path key={`v${k}`} className={near(k) ? styles.line : styles.dashed} d={d([ring[k], pyramid ? apex : top[k]])} />);
  }
  return <>{edges}</>;
}

export function buildMore(which: string, nums: number[]): ReactNode {
  switch (which) {
    case 'prism-faces': case 'prism-edges': case 'prism-vertices': return solid(nums[0], false);
    case 'pyramid-faces': case 'pyramid-edges': case 'pyramid-vertices': return solid(nums[0], true);
    case 'solid-name': {
      const [code, a, b, c] = nums;
      if (code === 3) return <><circle className={styles.fill} cx={W / 2} cy={H / 2} r={72} /><path className={styles.dashed} d={`M${W / 2 - 72} ${H / 2}A72 22 0 0 0 ${W / 2 + 72} ${H / 2}`} /></>;
      if (code === 2) return <>
        <path className={styles.fill} d={`M${W / 2 - 56} 62V150A56 18 0 0 0 ${W / 2 + 56} 150V62`} /><path className={styles.dashed} d={`M${W / 2 - 56} 150A56 18 0 0 1 ${W / 2 + 56} 150`} />
        <ellipse className={styles.plain} cx={W / 2} cy={62} rx={56} ry={18} />
      </>;
      const w = code === 0 ? 1 : a, dep = code === 0 ? 1 : b, h = code === 0 ? 1 : c, ox = dep * 0.5, oy = dep * 0.36;
      const { at } = frame([[0, 0], [w + ox, h + oy]]), P = (x: number, y: number) => at([x, y]);
      const [pa, pb, pc, pe] = [P(0, 0), P(w, 0), P(w, h), P(0, h)], [pa2, pb2, pc2, pe2] = [P(ox, oy), P(w + ox, oy), P(w + ox, h + oy), P(ox, h + oy)];
      return <>
        <path className={styles.plain} d={d([pa, pb, pc, pe], true)} /><path className={styles.plain} d={d([pe, pe2, pc2, pc], true)} /><path className={styles.plain} d={d([pb, pb2, pc2, pc], true)} />
        <path className={styles.dashed} d={`${d([pa, pa2])}${d([pa2, pe2])}${d([pa2, pb2])}`} />
      </>;
    }
    case 'euler-faces': case 'euler-vertices': return null;
    case 'triangle-type': {
      const [s1, s2, s3] = nums, tri = triangle(s1, s2, s3), { at } = frame(tri), pts = tri.map(at);
      const centre = centroidOf(pts);
      // A right angle is marked where the two sides with s² + s² = s² meet.
      const right = [[s1, s2, s3, 1], [s2, s3, s1, 2], [s3, s1, s2, 0]].find(([x, y, z]) => x * x + y * y === z * z);
      const corner = right ? pts[right[3]] : null, toward = (from: Pt, to: Pt): Pt => [to[0] - from[0], to[1] - from[1]];
      return <>
        <path className={styles.fill} d={d(pts, true)} />
        {right && corner && rightMark(corner, toward(corner, pts[(right[3] + 1) % 3]), toward(corner, pts[(right[3] + 2) % 3]), 10)}
        <Label at={outward(mid(pts[0], pts[1]), centre, 14)}>{cm(s1)}</Label>
        <Label at={outward(mid(pts[1], pts[2]), centre, 18)}>{cm(s2)}</Label>
        <Label at={outward(mid(pts[2], pts[0]), centre, 18)}>{cm(s3)}</Label>
      </>;
    }
    case 'quad-type': {
      const [a, b, angle] = nums, c = Math.cos(rad(angle)), s = Math.sin(rad(angle));
      const pts: Pt[] = [[0, 0], [a, 0], [a + b * c, b * s], [b * c, b * s]];
      const { at } = frame(pts), p = pts.map(at);
      return <>
        <path className={styles.fill} d={d(p, true)} />
        {angle === 90 ? rightMark(p[0], [1, 0], [0, -1]) : <>{arc(p[0], 22, 0, angle)}<Label at={[p[0][0] + 40, p[0][1] - 10]}>{angle}°</Label></>}
        <Label at={[(p[0][0] + p[1][0]) / 2, p[0][1] + 16]}>{cm(a)}</Label>
        <Label at={outward(mid(p[1], p[2]), centroidOf(p), 20)}>{cm(b)}</Label>
      </>;
    }
    case 'isosceles-base': case 'isosceles-apex': {
      const apexAngle = which === 'isosceles-base' ? nums[0] : 180 - 2 * nums[0];
      const half = rad(apexAngle / 2), pts: Pt[] = [[0, 0], [-Math.sin(half), -Math.cos(half)], [Math.sin(half), -Math.cos(half)]];
      const { at } = frame(pts), p = pts.map(at);
      return <>
        <path className={styles.fill} d={d(p, true)} />
        {tick(p[0], p[1], 1, 'ab')}{tick(p[0], p[2], 1, 'ac')}
        {vertexNames(p, ['A', 'B', 'C'])}
        {which === 'isosceles-base'
          ? <><Label at={[p[0][0], p[0][1] + 30]}>{nums[0]}°</Label><Label at={[p[1][0] + 28, p[1][1] - 9]} unknown>x</Label></>
          : <><Label at={[p[0][0], p[0][1] + 30]} unknown>x</Label><Label at={[p[1][0] + 30, p[1][1] - 9]}>{nums[0]}°</Label></>}
      </>;
    }
    case 'circle-diameter': case 'circle-radius': {
      const o: Pt = [W / 2, H / 2], Rr = 78, diameter = which === 'circle-radius';
      return <>
        <circle className={styles.fill} cx={o[0]} cy={o[1]} r={Rr} />
        <path className={styles.line} d={d(diameter ? [[o[0] - Rr, o[1]], [o[0] + Rr, o[1]]] : [o, [o[0] + Rr, o[1]]])} /><circle className={styles.dot} cx={o[0]} cy={o[1]} r={3} />
        <Label at={[o[0] + (diameter ? 0 : Rr / 2), o[1] - 12]}>{cm(nums[0])}</Label>
      </>;
    }
    case 'protractor': {
      const [start, end] = nums, o: Pt = [W / 2, 190], Rr = 128;
      const at = (deg: number, r: number): Pt => [o[0] - r * Math.cos(rad(deg)), o[1] - r * Math.sin(rad(deg))];
      return <>
        <path className={styles.plain} d={`M${o[0] - Rr} ${o[1]}A${Rr} ${Rr} 0 0 1 ${o[0] + Rr} ${o[1]}Z`} />
        {Array.from({ length: 19 }, (_, k) => <path key={k} className={styles.axis} d={d([at(k * 10, Rr), at(k * 10, Rr - (k % 3 ? 7 : 13))])} />)}
        {[0, 30, 60, 90, 120, 150, 180].map(k => <Label key={k} at={at(k, Rr - 26)}>{k}</Label>)}
        {[start, end].map(k => <path key={k} className={styles.line} d={d([o, at(k, Rr + 8)])} />)}
        <circle className={styles.dot} cx={o[0]} cy={o[1]} r={3} />
      </>;
    }
    case 'parallel-pairs': case 'perpendicular-pairs': {
      const centres: Pt[] = [[85, 72], [235, 72], [85, 160], [235, 160]];
      return <>{nums.map((deg, i) => { const u = polar(44, deg), c = centres[i], a: Pt = [c[0] - u[0], c[1] + u[1]], b: Pt = [c[0] + u[0], c[1] - u[1]]; return <g key={i}><path className={styles.line} d={d([a, b])} /><Label at={outward(b, c, 13)}>{'①②③④'[i]}</Label></g>; })}</>;
    }
    case 'congruent-side': {
      const [a, b, c, k] = nums, tri = triangle(a, b, c);
      const left = fitIn(tri, [20, 40, 150, 180]);
      // The second triangle is the same one turned half a turn (the point (x, y) goes to (W - x, H - y)), named D, E, F.
      const right = left.map((p): Pt => [W - p[0], H + 0 - p[1]]);
      const ci = centroidOf(left), cr = centroidOf(right);
      const sides: [number, number][] = [[0, 1], [1, 2], [2, 0]];
      return <>
        <path className={styles.fill} d={d(left, true)} /><path className={styles.fill} d={d(right, true)} />
        <Label at={outward(mid(left[0], left[1]), ci, 13)}>{a}</Label><Label at={outward(mid(left[1], left[2]), ci, 13)}>{b}</Label><Label at={outward(mid(left[2], left[0]), ci, 13)}>{c}</Label>
        {vertexNames(left, ['A', 'B', 'C'])}{vertexNames(right, ['D', 'E', 'F'])}
        <Label at={outward(mid(right[sides[k][0]], right[sides[k][1]]), cr, 13)} unknown>x</Label>
      </>;
    }
    case 'congruence-condition': {
      const flags = nums, base: Pt[] = [[0, 0], [6, 0], [4, 4]];
      const left = fitIn(base, [26, 40, 136, 180]), right = fitIn(base, [184, 40, 294, 180]);
      const sides: [number, number][] = [[0, 1], [1, 2], [2, 0]];
      const draw = (pts: Pt[], names: string[], key: string) => <g key={key}>
        <path className={styles.fill} d={d(pts, true)} />
        {sides.map(([i, j], k) => flags[k] ? tick(pts[i], pts[j], k + 1, `${key}s${k}`) : null)}
        {[0, 1, 2].map(k => flags[3 + k] ? angleMark(pts[k], pts[(k + 1) % 3], pts[(k + 2) % 3], k + 1, `${key}a${k}`) : null)}
        {vertexNames(pts, names)}
      </g>;
      return <>{draw(left, ['A', 'B', 'C'], 'l')}{draw(right, ['D', 'E', 'F'], 'r')}</>;
    }
    case 'parallelogram-angle': case 'parallelogram-half': case 'parallelogram-perimeter': {
      const angle = which === 'parallelogram-angle' ? nums[0] : 65, wide = which === 'parallelogram-perimeter' ? nums[0] : 6, slant = which === 'parallelogram-perimeter' ? nums[1] : 3.5;
      const c = Math.cos(rad(angle)), s = Math.sin(rad(angle));
      const A: Pt = [0, 0], B: Pt = [wide, 0], D: Pt = [slant * c, slant * s], C: Pt = [wide + slant * c, slant * s];
      const { at } = frame([A, B, C, D]), [pa, pb, pc, pd] = [A, B, C, D].map(at), centre = centroidOf([pa, pb, pc, pd]);
      const o = mid(pa, pc);
      return <>
        <path className={styles.fill} d={d([pa, pb, pc, pd], true)} />
        {which === 'parallelogram-angle' && <><Label at={[pa[0] + 30 * Math.cos(rad(angle / 2)), pa[1] - 30 * Math.sin(rad(angle / 2)) - 2]}>{angle}°</Label><Label at={[pb[0] - 26 * Math.cos(rad(angle / 2)), pb[1] - 18]} unknown>x</Label>{vertexNames([pa, pb, pc, pd], ['A', 'B', 'C', 'D'])}</>}
        {which === 'parallelogram-half' && <>
          <path className={styles.dashed} d={`${d([pa, pc])}${d([pb, pd])}`} />
          {vertexNames([pa, pb, pc, pd], ['A', 'B', 'C', 'D'])}
          <Label at={[o[0] + 8, o[1] + 12]}>O</Label><Label at={[(pa[0] + o[0]) / 2 - 4, (pa[1] + o[1]) / 2 - 12]} unknown>x</Label><Label at={[(o[0] + pc[0]) / 2 + 14, (o[1] + pc[1]) / 2 - 2]}>{cm(nums[0])}</Label>
          <Label at={[pc[0] + 6, pc[1] - 22]} anchor="start">{''}</Label>
        </>}
        {which === 'parallelogram-perimeter' && <><Label at={[(pa[0] + pb[0]) / 2, pa[1] + 16]}>{cm(nums[0])}</Label><Label at={outward(mid(pb, pc), centre, 22)}>{cm(nums[1])}</Label></>}
      </>;
    }
    case 'lines-of-symmetry': {
      const n = nums[0], Rr = 82, centre: Pt = [W / 2, H / 2];
      const pts = Array.from({ length: n }, (_, k): Pt => { const p = polar(Rr, 90 + (360 * k) / n); return [centre[0] + p[0], centre[1] - p[1]]; });
      return <path className={styles.fill} d={d(pts, true)} />;
    }
    case 'scale-actual': {
      const [scale, len] = nums;
      return <>
        <rect className={styles.plain} x={20} y={30} width={280} height={150} rx={6} />
        <path className={styles.dashed} d={d([[70, 140], [250, 70]])} /><circle className={styles.dot} cx={70} cy={140} r={4} /><circle className={styles.dot} cx={250} cy={70} r={4} />
        <Label at={[160, 92]}>{cm(len)}</Label><Label at={[160, 198]}>1 : {scale}</Label>
      </>;
    }
    case 'scale-enlarge': {
      const [k, len] = nums, small = 50, big = Math.min(k, 3.4) * small;
      return <>
        <rect className={styles.fill} x={24} y={130 - 30} width={small} height={30} />
        <rect className={styles.fill} x={110} y={130 - 0.6 * big} width={big} height={0.6 * big} />
        <Label at={[24 + small / 2, 146]}>{cm(len)}</Label><Label at={[110 + big / 2, 146]} unknown>x</Label><Label at={[92, 80]}>×{k}</Label>
      </>;
    }
    case 'move-translate': case 'move-reflect-x': case 'move-reflect-y': case 'move-rotate90': case 'move-rotate180': {
      const [x, y] = nums, range = 9, s = 11, ox = W / 2, oy = H / 2;
      const sx = (u: number) => ox + s * u, sy = (v: number) => oy - s * v;
      const ends: Pt | null = which === 'move-translate' ? [x + nums[2], y + nums[3]] : null;
      return <>
        {Array.from({ length: 2 * range + 1 }, (_, i) => i - range).map(i => <g key={i}><path className={styles.grid} d={d([[sx(i), sy(-range)], [sx(i), sy(range)]])} /><path className={styles.grid} d={d([[sx(-range), sy(i)], [sx(range), sy(i)]])} /></g>)}
        <path className={styles.axis} d={`${d([[sx(-range), sy(0)], [sx(range), sy(0)]])}${d([[sx(0), sy(-range)], [sx(0), sy(range)]])}`} />
        <Label at={[sx(range) + 6, sy(0) + 10]}>x</Label><Label at={[sx(0) + 8, sy(range) - 4]}>y</Label><Label at={[sx(0) - 7, sy(0) + 9]}>O</Label>
        {ends && <path className={styles.dashed} d={d([[sx(x), sy(y)], [sx(ends[0]), sy(ends[1])]])} />}
        {ends && <circle className={styles.mark} cx={sx(ends[0])} cy={sy(ends[1])} r={4} />}
        <circle className={styles.dot} cx={sx(x)} cy={sy(y)} r={4} /><Label at={[sx(x) + (x < 0 ? -8 : 8), sy(y) - 10]} anchor={x < 0 ? 'end' : 'start'}>P({x}, {y})</Label>
      </>;
    }
    default: return buildData(which, nums);
  }
}

// Bars, lines, pies, tables and box plots.
function axisChart(values: number[], opts: { labels: string[]; max: number; line?: boolean; values?: boolean; bars?: boolean; gap?: number }): ReactNode {
  const left = 38, right = 300, top = 24, bottom = 180, w = right - left, h = bottom - top, n = values.length, step = w / n;
  const y = (v: number) => bottom - (v / opts.max) * h;
  const grid = Array.from({ length: opts.max / 10 + 1 }, (_, i) => i * 10);
  return <>
    {grid.map(g => <g key={g}><path className={styles.grid} d={d([[left, y(g)], [right, y(g)]])} /><Label at={[left - 6, y(g)]} anchor="end">{g}</Label></g>)}
    <path className={styles.axis} d={`${d([[left, top], [left, bottom]])}${d([[left, bottom], [right, bottom]])}`} />
    {opts.line
      ? <><path className={styles.line} d={d(values.map((v, i): Pt => [left + step * (i + 0.5), y(v)]))} />{values.map((v, i) => <circle key={i} className={styles.dot} cx={left + step * (i + 0.5)} cy={y(v)} r={4} />)}</>
      : values.map((v, i) => <rect key={i} className={styles.shaded} x={left + step * i + step * (opts.gap ?? 0.2) / 2} y={y(v)} width={step * (1 - (opts.gap ?? 0.2))} height={bottom - y(v)} />)}
    {values.map((v, i) => opts.values ? <Label key={`v${i}`} at={[left + step * (i + 0.5), y(v) - 10]}>{v}</Label> : null)}
    {opts.labels.map((label, i) => <Label key={`l${i}`} at={[left + step * (i + 0.5), bottom + 14]}>{label}</Label>)}
  </>;
}

function table(rows: (string | number)[][], opts: { cell?: [number, number]; head?: boolean; mark?: [number, number] } = {}): ReactNode {
  const [cw, ch] = opts.cell ?? [58, 34], cols = Math.max(...rows.map(r => r.length)), x0 = (W - cw * cols) / 2, y0 = (H - ch * rows.length) / 2;
  return <>{rows.map((row, r) => row.map((cell, c) => <g key={`${r}-${c}`}>
    <rect className={opts.mark && opts.mark[0] === r && opts.mark[1] === c ? styles.shaded : opts.head && (r === 0 || c === 0) ? styles.fill : styles.plain} x={x0 + c * cw} y={y0 + r * ch} width={cw} height={ch} />
    {cell === '□' ? <Label at={[x0 + c * cw + cw / 2, y0 + r * ch + ch / 2]} unknown>□</Label> : <Label at={[x0 + c * cw + cw / 2, y0 + r * ch + ch / 2]}>{cell}</Label>}
  </g>))}</>;
}

function buildData(which: string, nums: number[]): ReactNode {
  switch (which) {
    case 'bar-diff': {
      const values = nums.slice(0, 4), [i, j] = [nums[4], nums[5]];
      const names = ['C', 'D', 'C', 'D'].map((n, k) => k === i - 1 ? 'A' : k === j - 1 ? 'B' : n);
      // Two bars are A and B; the others are C and D, in order.
      const others = ['C', 'D']; let next = 0;
      const labels = values.map((_, k) => k === i - 1 ? 'A' : k === j - 1 ? 'B' : others[next++]);
      void names;
      return axisChart(values, { labels, max: Math.ceil(Math.max(...values) / 10) * 10 });
    }
    case 'bar-total': return axisChart(nums, { labels: ['', '', '', '', ''].map((_, k) => 'ABCDE'[k]), max: Math.ceil(Math.max(...nums) / 10) * 10 });
    case 'line-change': return axisChart(nums, { labels: nums.map((_, k) => String(k + 1)), max: Math.ceil(Math.max(...nums) / 10) * 10, line: true });
    case 'hist-above': {
      const f = nums.slice(0, 5), k = nums[5];
      return axisChart(f, { labels: f.map((_, i) => i === k - 1 ? 'A' : ''), max: Math.ceil(Math.max(...f) / 2) * 2 + (Math.ceil(Math.max(...f) / 2) * 2 % 10 ? 10 - (Math.ceil(Math.max(...f) / 2) * 2) % 10 : 0), values: true, gap: 0 });
    }
    case 'pie-count': {
      const [total, ...rest] = nums, shares = rest.slice(0, 4), o: Pt = [W / 2, 100], Rr = 80;
      let acc = 0;
      const slices = shares.map((p, k) => {
        const a0 = (acc / 100) * 2 * Math.PI - Math.PI / 2; acc += p; const a1 = (acc / 100) * 2 * Math.PI - Math.PI / 2, am = (a0 + a1) / 2;
        const p0: Pt = [o[0] + Rr * Math.cos(a0), o[1] + Rr * Math.sin(a0)], p1: Pt = [o[0] + Rr * Math.cos(a1), o[1] + Rr * Math.sin(a1)];
        return <g key={k}>
          <path className={k % 2 ? styles.plain : styles.fill} d={`M${o[0]} ${o[1]}L${p0[0].toFixed(1)} ${p0[1].toFixed(1)}A${Rr} ${Rr} 0 ${p > 50 ? 1 : 0} 1 ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}Z`} />
          <Label at={[o[0] + 0.6 * Rr * Math.cos(am), o[1] + 0.6 * Rr * Math.sin(am) - 7]}>{'ABCD'[k]}</Label><Label at={[o[0] + 0.6 * Rr * Math.cos(am), o[1] + 0.6 * Rr * Math.sin(am) + 8]}>{p}%</Label>
        </g>;
      });
      return <>{slices}<Label at={[W / 2, 203]}>100% = {total}</Label></>;
    }
    case 'table-total': return table([[nums[0], nums[1], nums[2]], [nums[3], nums[4], nums[5]]], { cell: [70, 40] });
    case 'twoway-missing': return table([[nums[0], nums[1], nums[0] + nums[1]], [nums[2], '□', nums[3]]], { cell: [72, 42] });
    case 'relative-frequency': {
      const f = nums.slice(0, 5), k = nums[5];
      return table([f.map((_, i) => i === k - 1 ? 'A' : String(i + 1)), f], { cell: [50, 40], head: false, mark: [0, k - 1] });
    }
    case 'proportion-table': {
      const [k, ...xs] = nums;
      return table([['x', ...xs], ['y', ...xs.slice(0, 3).map(x => k * x), '□']], { cell: [50, 42], head: true });
    }
    case 'box-iqr': case 'box-range': {
      const [low, q1, med, q3, high] = nums, left = 26, right = 294, sx = (v: number) => left + ((v - low) / (high - low)) * (right - left), y = 96;
      return <>
        <path className={styles.axis} d={d([[left - 10, y + 50], [right + 10, y + 50]])} />
        <path className={styles.line} d={`${d([[sx(low), y], [sx(q1), y]])}${d([[sx(q3), y], [sx(high), y]])}${d([[sx(low), y - 14], [sx(low), y + 14]])}${d([[sx(high), y - 14], [sx(high), y + 14]])}`} />
        <rect className={styles.fill} x={sx(q1)} y={y - 26} width={sx(q3) - sx(q1)} height={52} />
        <path className={styles.line} d={d([[sx(med), y - 26], [sx(med), y + 26]])} />
        {[low, q1, med, q3, high].map(v => <g key={v}><path className={styles.axis} d={d([[sx(v), y + 50], [sx(v), y + 57]])} /><Label at={[sx(v), y + 70]}>{v}</Label></g>)}
      </>;
    }
    case 'quartile-q1': case 'quartile-q3': {
      const sorted = [...nums].sort((a, b) => a - b), perRow = 5, rows: number[][] = [];
      for (let i = 0; i < sorted.length; i += perRow) rows.push(sorted.slice(i, i + perRow));
      return table(rows, { cell: [50, 40] });
    }
    case 'net-cylinder': {
      const [r, h] = nums, cx = W / 2, rr = 26, bodyW = 170, bodyH = 50 + Math.min(h, 10) * 4;
      const x0 = cx - bodyW / 2, y0 = 28 + rr * 2;
      return <>
        <circle className={styles.fill} cx={cx} cy={y0 - rr} r={rr} /><circle className={styles.fill} cx={cx} cy={y0 + bodyH + rr} r={rr} />
        <rect className={styles.fill} x={x0} y={y0} width={bodyW} height={bodyH} />
        <path className={styles.line} d={d([[cx, y0 - rr], [cx + rr, y0 - rr]])} /><Label at={[cx + rr / 2, y0 - rr + 11]}>{cm(r)}</Label>
        <Label at={[x0 + bodyW + 8, y0 + bodyH / 2]} anchor="start">{cm(h)}</Label><Label at={[cx, y0 + bodyH / 2]} unknown>?</Label>
      </>;
    }
    case 'net-cuboid': {
      const [w, dep, h] = nums, total = 2 * w + 2 * dep, totalH = 2 * dep + h;
      const { at } = frame([[0, 0], [total, totalH]]);
      const rect = (x: number, y: number, rw: number, rh: number, key: string) => { const a = at([x, y]), b = at([x + rw, y + rh]); return <rect key={key} className={styles.fill} x={a[0]} y={b[1]} width={b[0] - a[0]} height={a[1] - b[1]} />; };
      const p = (x: number, y: number) => at([x, y]);
      return <>
        {rect(0, dep, dep, h, 'l')}{rect(dep, dep, w, h, 'f')}{rect(dep + w, dep, dep, h, 'r')}{rect(2 * dep + w, dep, w, h, 'b')}
        {rect(dep, 0, w, dep, 'bot')}{rect(dep, dep + h, w, dep, 'top')}
        <Label at={[p(dep + w / 2, dep + h)[0], p(dep + w / 2, dep + h)[1] + 13]}>{cm(w)}</Label>
        <Label at={[p(dep / 2, dep + h / 2)[0], p(dep / 2, dep + h / 2)[1]]}>{cm(h)}</Label>
        <Label at={[p(dep + w, dep / 2)[0] + 13, p(dep + w, dep / 2)[1]]}>{cm(dep)}</Label>
      </>;
    }
    case 'space-diagonal': {
      const [w, dep, h] = nums, ox = dep * 0.5, oy = dep * 0.36;
      const { at } = frame([[0, 0], [w + ox, h + oy]]);
      const P = (x: number, y: number) => at([x, y]);
      const [a, b, c, e] = [P(0, 0), P(w, 0), P(w, h), P(0, h)], [a2, b2, c2, e2] = [P(ox, oy), P(w + ox, oy), P(w + ox, h + oy), P(ox, h + oy)];
      return <>
        <path className={styles.plain} d={d([a, b, c, e], true)} /><path className={styles.plain} d={d([e, e2, c2, c], true)} /><path className={styles.plain} d={d([b, b2, c2, c], true)} />
        <path className={styles.dashed} d={`${d([a, a2])}${d([a2, e2])}${d([a2, b2])}`} />
        <path className={styles.line} d={d([a, c2])} />
        <Label at={[a[0] - 10, a[1] + 10]}>A</Label><Label at={[c2[0] + 10, c2[1] - 8]}>G</Label>
        <Label at={[(a[0] + b[0]) / 2, a[1] + 16]}>{cm(w)}</Label><Label at={[e[0] - 8, (a[1] + e[1]) / 2]} anchor="end">{cm(h)}</Label><Label at={[mid(b, b2)[0] + 8, mid(b, b2)[1] + 6]} anchor="start">{cm(dep)}</Label>
      </>;
    }
    case 'ceva-ratio': case 'menelaus-ratio': {
      const [p, q, r, s] = nums;
      const A: Pt = [1.4, 4.6], B: Pt = [0, 0], C: Pt = [6, 0];
      const lerp = (u: Pt, v: Pt, t: number): Pt => [u[0] + (v[0] - u[0]) * t, u[1] + (v[1] - u[1]) * t];
      const F = lerp(A, B, p / (p + q));   // AF : FB = p : q
      let D: Pt, E: Pt, pts: Pt[];
      if (which === 'ceva-ratio') {
        D = lerp(B, C, r / (r + s));       // BD : DC = r : s
        // E on CA so that AD, BE, CF are concurrent: CE/EA = (FB/AF)(DC/BD) = q s / (p r).
        E = lerp(C, A, (q * s) / (q * s + p * r));
        pts = [A, B, C, D, E, F];
      } else {
        D = [(s * B[0] - r * C[0]) / (s - r), 0];   // BD : DC = r : s, outside the segment
        // The line through F and D meets CA at E.
        const dx = D[0] - F[0], dy = D[1] - F[1], ex = A[0] - C[0], ey = A[1] - C[1], den = dx * ey - dy * ex, t = ((C[0] - F[0]) * ey - (C[1] - F[1]) * ex) / den;
        E = [F[0] + dx * t, F[1] + dy * t];
        pts = [A, B, C, D, E, F];
      }
      const { at } = frame(pts, { l: 36, r: 36, t: 30, b: 30 }), [pa, pb, pc, pd, pe, pf] = pts.map(at);
      return <>
        <path className={styles.fill} d={d([pa, pb, pc], true)} />
        {which === 'ceva-ratio'
          ? <path className={styles.line} d={`${d([pa, pd])}${d([pb, pe])}${d([pc, pf])}`} />
          : <><path className={styles.dashed} d={d([pc, pd])} /><path className={styles.line} d={d([pf, pd])} /></>}
        <Label at={[pa[0], pa[1] - 13]}>A</Label><Label at={[pb[0] - 11, pb[1] + 9]}>B</Label><Label at={[pc[0] + 11, pc[1] + 9]}>C</Label>
        <Label at={[pd[0], pd[1] + 14]}>D</Label><Label at={[pe[0] + 12, pe[1] - 6]}>E</Label><Label at={[pf[0] - 12, pf[1] - 4]}>F</Label>
        <Label at={outward(mid(pa, pf), centroidOf([pa, pb, pc]), 13)}>{p}</Label><Label at={outward(mid(pf, pb), centroidOf([pa, pb, pc]), 13)}>{q}</Label>
        <Label at={[(pb[0] + pd[0]) / 2, pb[1] + 15]}>{r}</Label><Label at={[(pd[0] + pc[0]) / 2, pd[1] + 15]}>{s}</Label>
      </>;
    }
    default: return null;
  }
}
