import type { ReactNode } from 'react';
import { useTranslations } from 'use-intl';
import { evalExpression, splitTop } from '../lib/math-formula';
import styles from './math-shape.module.css';
import { W, H, add, arc, cm, d, frame, Label, mid, polar, rad, rightMark, type Pt } from './math-shape-kit';
import { buildMore } from './math-shape-more';

// A figure drawn from a "figure" problem's hidden numbers (src/lib/math-formula.ts):
// the question is a list of numbers, `which` says what they are. Lengths are in cm
// and angles in degrees. The description names nothing the problem asks for.
function build(which: string, nums: number[]): ReactNode {
  switch (which) {
    case 'rect-area': {
      const [w, h] = nums;
      const { at } = frame([[0, 0], [w, h]]);
      const [a, b] = [at([0, 0]), at([w, h])];
      return <>
        <rect className={styles.fill} x={a[0]} y={b[1]} width={b[0] - a[0]} height={a[1] - b[1]} />
        <Label at={[(a[0] + b[0]) / 2, b[1] - 14]}>{cm(w)}</Label>
        <Label at={[b[0] + 8, (a[1] + b[1]) / 2]} anchor="start">{cm(h)}</Label>
      </>;
    }
    case 'tri-area': {
      const [b, h] = nums, o = Math.round(b * 0.35 * 10) / 10;
      const { at } = frame([[0, 0], [b, 0], [o, h]]);
      const [p, q, r, foot] = [at([0, 0]), at([b, 0]), at([o, h]), at([o, 0])];
      return <>
        <path className={styles.fill} d={d([p, q, r], true)} />
        <path className={styles.dashed} d={d([r, foot])} />{rightMark(foot, [-1, 0], [0, -1])}
        <Label at={[(p[0] + q[0]) / 2, p[1] + 16]}>{cm(b)}</Label>
        <Label at={[foot[0] + 6, (r[1] + foot[1]) / 2]} anchor="start">{cm(h)}</Label>
      </>;
    }
    case 'para-area': {
      const [b, h] = nums, o = Math.round(b * 0.3 * 10) / 10;
      const { at } = frame([[0, 0], [b + o, h]]);
      const [p, q, r, s, foot] = [at([0, 0]), at([b, 0]), at([b + o, h]), at([o, h]), at([o, 0])];
      return <>
        <path className={styles.fill} d={d([p, q, r, s], true)} />
        <path className={styles.dashed} d={d([s, foot])} />{rightMark(foot, [1, 0], [0, -1])}
        <Label at={[(p[0] + q[0]) / 2, p[1] + 16]}>{cm(b)}</Label>
        <Label at={[foot[0] + 6, (s[1] + foot[1]) / 2]} anchor="start">{cm(h)}</Label>
      </>;
    }
    case 'trap-area': {
      const [a, b, h] = nums, o = Math.round(((b - a) / 3) * 10) / 10;
      const { at } = frame([[0, 0], [b, h]]);
      const [p, q, r, s, foot] = [at([0, 0]), at([b, 0]), at([o + a, h]), at([o, h]), at([o, 0])];
      return <>
        <path className={styles.fill} d={d([p, q, r, s], true)} />
        <path className={styles.dashed} d={d([s, foot])} />{rightMark(foot, [1, 0], [0, -1])}
        <Label at={[(s[0] + r[0]) / 2, s[1] - 14]}>{cm(a)}</Label>
        <Label at={[(p[0] + q[0]) / 2, p[1] + 16]}>{cm(b)}</Label>
        <Label at={[foot[0] + 6, (s[1] + foot[1]) / 2]} anchor="start">{cm(h)}</Label>
      </>;
    }
    case 'cuboid-volume': case 'box-faces': case 'box-edges': case 'box-vertices': case 'box-edge-total': case 'cube-edge-total': {
      const [w, dep, h] = which === 'cube-edge-total' ? [nums[0], nums[0], nums[0]] : nums, ox = dep * 0.5, oy = dep * 0.36;
      const { at } = frame([[0, 0], [w + ox, h + oy]]);
      const P = (x: number, y: number) => at([x, y]);
      const [a, b, c, e] = [P(0, 0), P(w, 0), P(w, h), P(0, h)];
      const [a2, b2, c2, e2] = [P(ox, oy), P(w + ox, oy), P(w + ox, h + oy), P(ox, h + oy)];
      return <>
        <path className={styles.plain} d={d([a, b, c, e], true)} />
        <path className={styles.plain} d={d([e, e2, c2, c], true)} />
        <path className={styles.plain} d={d([b, b2, c2, c], true)} />
        <path className={styles.dashed} d={`${d([a, a2])}${d([a2, e2])}${d([a2, b2])}`} />
        <Label at={[(a[0] + b[0]) / 2, a[1] + 16]}>{cm(w)}</Label>
        <Label at={[a[0] - 8, (a[1] + e[1]) / 2]} anchor="end">{cm(h)}</Label>
        <Label at={[mid(b, b2)[0] + 8, mid(b, b2)[1] + 6]} anchor="start">{cm(dep)}</Label>
      </>;
    }
    case 'circle-circumference': case 'circle-area': {
      const [r] = nums, o: Pt = [W / 2, H / 2], R = 80;
      return <>
        <circle className={styles.fill} cx={o[0]} cy={o[1]} r={R} />
        <path className={styles.line} d={d([o, [o[0] + R, o[1]]])} /><circle className={styles.dot} cx={o[0]} cy={o[1]} r={3} />
        <Label at={[o[0] + R / 2, o[1] - 12]}>{cm(r)}</Label>
      </>;
    }
    case 'cylinder-volume': {
      const [r, h] = nums;
      const rx = 62, ry = 20, height = Math.min(120, Math.max(60, (h / r) * rx)), cx = W / 2, top = 40 + ry, bottom = top + height;
      return <>
        <path className={styles.fill} d={`M${cx - rx} ${top}V${bottom}A${rx} ${ry} 0 0 0 ${cx + rx} ${bottom}V${top}`} />
        <path className={styles.dashed} d={`M${cx - rx} ${bottom}A${rx} ${ry} 0 0 1 ${cx + rx} ${bottom}`} />
        <ellipse className={styles.plain} cx={cx} cy={top} rx={rx} ry={ry} />
        <path className={styles.line} d={d([[cx, top], [cx + rx, top]])} /><circle className={styles.dot} cx={cx} cy={top} r={3} />
        <Label at={[cx + rx / 2, top + 12]}>{cm(r)}</Label>
        <Label at={[cx + rx + 10, (top + bottom) / 2]} anchor="start">{cm(h)}</Label>
      </>;
    }
    case 'prism-volume': {
      const [b, h, len] = nums, ox = len * 0.55, oy = len * 0.4, tx = Math.round(b * 0.4 * 10) / 10;
      const { at } = frame([[0, 0], [b + ox, h + oy]]);
      const [p, q, r] = [at([0, 0]), at([b, 0]), at([tx, h])];
      const [p2, q2, r2] = [at([ox, oy]), at([b + ox, oy]), at([tx + ox, h + oy])];
      const foot = at([tx, 0]);
      return <>
        <path className={styles.plain} d={d([q, q2, r2, r], true)} />
        <path className={styles.plain} d={d([r, r2, p2], false)} />
        <path className={styles.dashed} d={`${d([p, p2])}${d([p2, q2])}`} />
        <path className={styles.fill} d={d([p, q, r], true)} />
        <path className={styles.dashed} d={d([r, foot])} />{rightMark(foot, [-1, 0], [0, -1], 8)}
        <Label at={[(p[0] + q[0]) / 2, p[1] + 16]}>{cm(b)}</Label>
        <Label at={[foot[0] + 6, (r[1] + foot[1]) / 2 + 8]} anchor="start">{cm(h)}</Label>
        <Label at={[mid(q, q2)[0] + 8, mid(q, q2)[1] + 8]} anchor="start">{cm(len)}</Label>
      </>;
    }
    case 'cone-volume': {
      const [r, h] = nums;
      const rx = 64, ry = 20, height = Math.min(120, Math.max(70, (h / r) * rx)), cx = W / 2, bottom = 190 - ry, apex = bottom - height;
      return <>
        <path className={styles.fill} d={`M${cx - rx} ${bottom}L${cx} ${apex}L${cx + rx} ${bottom}A${rx} ${ry} 0 0 1 ${cx - rx} ${bottom}`} />
        <path className={styles.dashed} d={`M${cx - rx} ${bottom}A${rx} ${ry} 0 0 0 ${cx + rx} ${bottom}`} />
        <path className={styles.dashed} d={d([[cx, apex], [cx, bottom]])} />
        <path className={styles.dashed} d={d([[cx, bottom], [cx + rx, bottom]])} /><circle className={styles.dot} cx={cx} cy={bottom} r={3} />
        <Label at={[cx + rx / 2, bottom + ry + 12]}>{cm(r)}</Label>
        <Label at={[cx + 8, (apex + bottom) / 2]} anchor="start">{cm(h)}</Label>
      </>;
    }
    case 'sphere-volume': case 'sphere-surface': {
      const [r] = nums, cx = W / 2, cy = H / 2, R = 78;
      return <>
        <circle className={styles.fill} cx={cx} cy={cy} r={R} />
        <path className={styles.dashed} d={`M${cx - R} ${cy}A${R} ${R * 0.3} 0 0 0 ${cx + R} ${cy}`} />
        <path className={styles.line} d={`M${cx - R} ${cy}A${R} ${R * 0.3} 0 0 1 ${cx + R} ${cy}`} />
        <path className={styles.line} d={d([[cx, cy], [cx + R, cy]])} /><circle className={styles.dot} cx={cx} cy={cy} r={3} />
        <Label at={[cx + R / 2, cy + 12]}>{cm(r)}</Label>
      </>;
    }
    case 'angle-triangle': {
      const [a, b] = nums, len = 10;
      // The apex where the rays from A (at angle a) and from B (at 180 - b) meet.
      const t = (len * Math.sin(rad(b))) / Math.sin(rad(a + b));
      const c = polar(t, a);
      const { at } = frame([[0, 0], [len, 0], c]);
      const [P, Q, R] = [at([0, 0]), at([len, 0]), at(c)];
      const inward = (from: Pt, to1: Pt, to2: Pt): Pt => { const u = [to1[0] - from[0], to1[1] - from[1]], v = [to2[0] - from[0], to2[1] - from[1]], nu = Math.hypot(u[0], u[1]), nv = Math.hypot(v[0], v[1]); const m: Pt = [u[0] / nu + v[0] / nv, u[1] / nu + v[1] / nv], nm = Math.hypot(m[0], m[1]) || 1; return [from[0] + (m[0] / nm) * 30, from[1] + (m[1] / nm) * 30]; };
      return <>
        <path className={styles.fill} d={d([P, Q, R], true)} />
        <Label at={inward(P, Q, R)}>{a}°</Label><Label at={inward(Q, P, R)}>{b}°</Label><Label at={inward(R, P, Q)} unknown>x</Label>
      </>;
    }
    case 'angle-quad': {
      const [a, b, c] = nums;
      const pts: Pt[] = [[40, 180], [260, 190], [230, 50], [80, 40]];
      const centre: Pt = [pts.reduce((s, p) => s + p[0], 0) / 4, pts.reduce((s, p) => s + p[1], 0) / 4];
      const inside = (p: Pt): Pt => { const u = [centre[0] - p[0], centre[1] - p[1]], n = Math.hypot(u[0], u[1]); return [p[0] + (u[0] / n) * 34, p[1] + (u[1] / n) * 34]; };
      return <>
        <path className={styles.fill} d={d(pts, true)} />
        <Label at={inside(pts[0])}>{a}°</Label><Label at={inside(pts[1])}>{b}°</Label><Label at={inside(pts[2])}>{c}°</Label><Label at={inside(pts[3])} unknown>x</Label>
      </>;
    }
    case 'parallel-vertical': case 'parallel-corresponding': case 'parallel-alternate': case 'parallel-cointerior': {
      const [a] = nums;
      // Regions around a crossing: UR and LL are the transversal's angle θ, UL and LR are 180 - θ.
      const given = { 'parallel-vertical': 'UR', 'parallel-corresponding': 'UR', 'parallel-alternate': 'LR', 'parallel-cointerior': 'LR' }[which]!;
      const target = { 'parallel-vertical': 'LL', 'parallel-corresponding': 'UR', 'parallel-alternate': 'UL', 'parallel-cointerior': 'UR' }[which]!;
      const theta = given === 'UR' || given === 'LL' ? a : 180 - a;
      const y1 = 75, y2 = 145, cx1 = 160 + (Math.tan(rad(90 - theta)) * (y2 - y1)) / 2, cx2 = 160 - (Math.tan(rad(90 - theta)) * (y2 - y1)) / 2;
      // The transversal rises to the right at angle theta: at the upper line x is to the right of the lower line's.
      const P: Pt = [cx1, y1], Q: Pt = [cx2, y2];
      const dir = (region: string) => ({ UR: theta / 2, UL: 180 - (180 - theta) / 2, LL: 180 + theta / 2, LR: 360 - (180 - theta) / 2 })[region]!;
      const place = (centre: Pt, region: string): Pt => { const an = rad(dir(region)); return [centre[0] + 34 * Math.cos(an), centre[1] - 34 * Math.sin(an)]; };
      const far = 62, tv: Pt = [Math.cos(rad(theta)), -Math.sin(rad(theta))];
      return <>
        <path className={styles.line} d={d([[20, y1], [300, y1]])} /><path className={styles.line} d={d([[20, y2], [300, y2]])} />
        <path className={styles.line} d={d([[cx2 - tv[0] * far, y2 - tv[1] * far], [cx1 + tv[0] * far, y1 + tv[1] * far]])} />
        <Label at={[300, y1 - 12]} anchor="end">ℓ</Label><Label at={[300, y2 + 12]} anchor="end">m</Label>
        <Label at={place(P, given)}>{a}°</Label>
        <Label at={place(which === 'parallel-vertical' ? P : Q, target)} unknown>x</Label>
      </>;
    }
    case 'polygon-interior-sum': case 'polygon-exterior': case 'polygon-each-interior': {
      const [n] = nums, R = 82, centre: Pt = [W / 2, H / 2 + 4];
      const vertex = (k: number): Pt => { const p = polar(R, 90 + (360 * k) / n); return [centre[0] + p[0], centre[1] - p[1]]; };
      const pts = Array.from({ length: n }, (_, k) => vertex(k));
      const extension = which === 'polygon-exterior' ? (() => { const a = pts[0], b = pts[n - 1], u: Pt = [a[0] - b[0], a[1] - b[1]], m = Math.hypot(u[0], u[1]); return { from: a, to: [a[0] + (u[0] / m) * 44, a[1] + (u[1] / m) * 44] as Pt }; })() : undefined;
      return <>
        <path className={styles.fill} d={d(pts, true)} />
        {extension && <><path className={styles.line} d={d([extension.from, extension.to])} /><Label at={[extension.from[0] + 24, extension.from[1] - 16]} unknown>x</Label></>}
        {which === 'polygon-each-interior' && <Label at={[pts[0][0] + (centre[0] - pts[0][0]) * 0.3, pts[0][1] + (centre[1] - pts[0][1]) * 0.3]} unknown>x</Label>}
        {which === 'polygon-interior-sum' && <Label at={centre} unknown>S</Label>}
      </>;
    }
    case 'sector-arc': case 'sector-area': {
      const [r, theta] = nums;
      const rim: Pt[] = [[0, 0]];
      for (let deg = 0; deg <= theta; deg += 5) rim.push(polar(1, deg));
      rim.push(polar(1, theta));
      const { at, s } = frame(rim, { l: 30, r: 30, t: 24, b: 40 });
      const o = at([0, 0]), a = at([1, 0]), e = at(polar(1, theta)), R = s;
      return <>
        <path className={styles.fill} d={`M${o[0]} ${o[1]}L${a[0]} ${a[1]}A${R} ${R} 0 ${theta > 180 ? 1 : 0} 0 ${e[0].toFixed(1)} ${e[1].toFixed(1)}Z`} />
        {arc(o, 22, 0, theta)}
        <Label at={[o[0] + 40 * Math.cos(rad(theta / 2)), o[1] - 40 * Math.sin(rad(theta / 2))]}>{theta}°</Label>
        <Label at={[o[0] + R / 2, o[1] + 14]}>{cm(r)}</Label>
        <circle className={styles.dot} cx={o[0]} cy={o[1]} r={3} />
      </>;
    }
    case 'inscribed-angle': {
      const [central] = nums, o: Pt = [W / 2, H / 2], R = 82;
      const pt = (deg: number): Pt => [o[0] + R * Math.cos(rad(deg)), o[1] - R * Math.sin(rad(deg))];
      const A = pt(270 - central / 2), B = pt(270 + central / 2), C = pt(90);
      return <>
        <circle className={styles.plain} cx={o[0]} cy={o[1]} r={R} />
        <path className={styles.line} d={`${d([o, A])}${d([o, B])}${d([C, A])}${d([C, B])}`} /><circle className={styles.dot} cx={o[0]} cy={o[1]} r={3} />
        <Label at={[o[0], o[1] + 26]}>{central}°</Label><Label at={[C[0], C[1] + 22]} unknown>x</Label>
        <Label at={[A[0] - 12, A[1] + 10]}>A</Label><Label at={[B[0] + 12, B[1] + 10]}>B</Label><Label at={[C[0], C[1] - 12]}>C</Label><Label at={[o[0] + 10, o[1] - 10]}>O</Label>
      </>;
    }
    case 'inscribed-same-arc': {
      const [a] = nums, o: Pt = [W / 2, H / 2], R = 82;
      const pt = (deg: number): Pt => [o[0] + R * Math.cos(rad(deg)), o[1] - R * Math.sin(rad(deg))];
      const A = pt(200), B = pt(340), C = pt(70), D = pt(120);
      return <>
        <circle className={styles.plain} cx={o[0]} cy={o[1]} r={R} />
        <path className={styles.line} d={`${d([C, A])}${d([C, B])}${d([D, A])}${d([D, B])}`} />
        <Label at={[C[0], C[1] + 26]}>{a}°</Label><Label at={[D[0], D[1] + 26]} unknown>x</Label>
        <Label at={[A[0] - 10, A[1] + 10]}>A</Label><Label at={[B[0] + 10, B[1] + 10]}>B</Label><Label at={[C[0] + 10, C[1] - 10]}>C</Label><Label at={[D[0] - 10, D[1] - 10]}>D</Label>
      </>;
    }
    case 'inscribed-diameter': {
      const [a] = nums, o: Pt = [W / 2, H / 2 + 16], R = 86;
      const A: Pt = [o[0] - R, o[1]], B: Pt = [o[0] + R, o[1]], C: Pt = [o[0] + R * Math.cos(rad(2 * a)), o[1] - R * Math.sin(rad(2 * a))];
      return <>
        <circle className={styles.plain} cx={o[0]} cy={o[1]} r={R} />
        <path className={styles.line} d={`${d([A, B])}${d([A, C])}${d([B, C])}`} /><circle className={styles.dot} cx={o[0]} cy={o[1]} r={3} />
        <Label at={[A[0] + 34, A[1] - 8]}>{a}°</Label><Label at={[B[0] - 30, B[1] - 8]} unknown>x</Label>
        <Label at={[A[0] - 10, A[1] + 12]}>A</Label><Label at={[B[0] + 10, B[1] + 12]}>B</Label><Label at={[C[0], C[1] - 12]}>C</Label>
      </>;
    }
    case 'similar-side': {
      const [a, b, c] = nums, shape = (scale: number, x: number, base: number): Pt[] => [[x, 190], [x + base * scale, 190], [x + base * scale * 0.7, 190 - 90 * scale]];
      const ratio = b / a, small = shape(1, 30, 80), big = shape(Math.min(ratio, 1.9), 150, 80);
      return <>
        <path className={styles.fill} d={d(small, true)} /><path className={styles.fill} d={d(big, true)} />
        <Label at={[(small[0][0] + small[1][0]) / 2, 206]}>{a}</Label>
        <Label at={[(small[1][0] + small[2][0]) / 2 + 12, (small[1][1] + small[2][1]) / 2]} anchor="start">{c}</Label>
        <Label at={[(big[0][0] + big[1][0]) / 2, 206]}>{b}</Label>
        <Label at={[(big[1][0] + big[2][0]) / 2 + 12, (big[1][1] + big[2][1]) / 2]} anchor="start" unknown>x</Label>
        <Label at={[small[0][0] - 12, small[0][1] + 12]}>A</Label><Label at={[small[1][0] + 8, small[1][1] + 12]}>B</Label><Label at={[small[2][0], small[2][1] - 12]}>C</Label>
        <Label at={[big[0][0] - 12, big[0][1] + 12]}>D</Label><Label at={[big[1][0] + 8, big[1][1] + 12]}>E</Label><Label at={[big[2][0], big[2][1] - 12]}>F</Label>
      </>;
    }
    case 'similar-area': {
      const [m, n, s] = nums, base = 70;
      const scale = Math.min(n / m, 2.2), small: Pt[] = [[30, 190], [30 + base, 190], [30 + base * 0.6, 190 - 80]], big: Pt[] = [[150, 190], [150 + base * scale, 190], [150 + base * scale * 0.6, 190 - 80 * scale]];
      return <>
        <path className={styles.fill} d={d(small, true)} /><path className={styles.fill} d={d(big, true)} />
        <Label at={[(small[0][0] + small[1][0]) / 2, 206]}>{m}</Label><Label at={[(big[0][0] + big[1][0]) / 2, 206]}>{n}</Label>
        <Label at={[(small[0][0] + small[1][0]) / 2 - 4, 160]}>{s}</Label>
        <Label at={[(big[0][0] + big[1][0]) / 2 - 4, 190 - 28 * scale]} unknown>?</Label>
      </>;
    }
    case 'power-chord': {
      const [a, b, c] = nums, x = (a * b) / c, phi = 65;
      const dirv = polar(1, phi);
      const A: Pt = [-a, 0], B: Pt = [b, 0], C: Pt = [c * dirv[0], c * dirv[1]], D: Pt = [-x * dirv[0], -x * dirv[1]];
      // The circle through A, B, C (D lies on it since PA·PB = PC·PD).
      const centre: Pt = [(b - a) / 2, (C[0] ** 2 + C[1] ** 2 - (b - a) * C[0] - a * b) / (2 * C[1])], R = Math.hypot(A[0] - centre[0], A[1] - centre[1]);
      const { at, s } = frame([[centre[0] - R, centre[1] - R], [centre[0] + R, centre[1] + R]], { l: 50, r: 50, t: 24, b: 24 });
      const [pA, pB, pC, pD, pP, pO] = [at(A), at(B), at(C), at(D), at([0, 0]), at(centre)];
      return <>
        <circle className={styles.plain} cx={pO[0]} cy={pO[1]} r={R * s} />
        <path className={styles.line} d={`${d([pA, pB])}${d([pC, pD])}`} />
        <Label at={[pA[0] - 10, pA[1] + 2]}>A</Label><Label at={[pB[0] + 10, pB[1] + 2]}>B</Label><Label at={[pC[0] + 8, pC[1] - 10]}>C</Label><Label at={[pD[0] - 8, pD[1] + 10]}>D</Label><Label at={[pP[0] + 10, pP[1] + 12]}>P</Label>
        <Label at={add(mid(pA, pP), [0, 11])}>{a}</Label><Label at={add(mid(pP, pB), [0, 11])}>{b}</Label>
        <Label at={add(mid(pP, pC), [12, 0])}>{c}</Label><Label at={add(mid(pP, pD), [-12, 0])} unknown>x</Label>
      </>;
    }
    case 'distance': case 'centroid': {
      const points: Pt[] = which === 'distance' ? [[nums[0], nums[1]], [nums[2], nums[3]]] : [[nums[0], nums[1]], [nums[2], nums[3]], [nums[4], nums[5]]];
      const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
      const x0 = Math.min(0, ...xs) - 1, x1 = Math.max(0, ...xs) + 1, y0 = Math.min(0, ...ys) - 1, y1 = Math.max(0, ...ys) + 1;
      const s = Math.min(280 / (x1 - x0), 190 / (y1 - y0)), ox = (W - s * (x1 - x0)) / 2, oy = (H - s * (y1 - y0)) / 2;
      const at = ([x, y]: Pt): Pt => [ox + s * (x - x0), oy + s * (y1 - y)];
      const names = ['A', 'B', 'C'];
      return <>
        {Array.from({ length: x1 - x0 + 1 }, (_, i) => x0 + i).map(x => <path key={`x${x}`} className={styles.grid} d={d([at([x, y0]), at([x, y1])])} />)}
        {Array.from({ length: y1 - y0 + 1 }, (_, i) => y0 + i).map(y => <path key={`y${y}`} className={styles.grid} d={d([at([x0, y]), at([x1, y])])} />)}
        <path className={styles.axis} d={`${d([at([x0, 0]), at([x1, 0])])}${d([at([0, y0]), at([0, y1])])}`} />
        {which === 'distance'
          ? <><path className={styles.dashed} d={d([at(points[0]), at([points[1][0], points[0][1]]), at(points[1])])} /><path className={styles.line} d={d([at(points[0]), at(points[1])])} /></>
          : <path className={styles.fill} d={d(points.map(at), true)} />}
        {points.map((p, i) => <g key={i}><circle className={styles.dot} cx={at(p)[0]} cy={at(p)[1]} r={4} /><Label at={add(at(p), [0, p[1] >= (ys[0] + ys[ys.length - 1]) / 2 ? -14 : 14])}>{names[i]}({p[0]}, {p[1]})</Label></g>)}
      </>;
    }
    case 'clock-read': {
      const [h, m] = nums, o: Pt = [W / 2, H / 2], R = 88;
      const hand = (deg: number, len: number, width: number) => { const p = polar(len, 90 - deg); return <path className={styles.hand} strokeWidth={width} d={d([o, [o[0] + p[0], o[1] - p[1]]])} />; };
      return <>
        <circle className={styles.plain} cx={o[0]} cy={o[1]} r={R} />
        {Array.from({ length: 60 }, (_, k) => { const p = polar(R - (k % 5 ? 5 : 10), 90 - k * 6), q = polar(R, 90 - k * 6); return <path key={k} className={styles.axis} d={d([[o[0] + p[0], o[1] - p[1]], [o[0] + q[0], o[1] - q[1]]])} />; })}
        {Array.from({ length: 12 }, (_, k) => { const p = polar(R - 24, 90 - (k + 1) * 30); return <Label key={k} at={[o[0] + p[0], o[1] - p[1]]}>{k + 1}</Label>; })}
        {hand(((h % 12) + m / 60) * 30, 46, 4)}{hand(m * 6, 68, 2.4)}<circle className={styles.dot} cx={o[0]} cy={o[1]} r={4} />
      </>;
    }
    case 'fraction-shaded': {
      const [parts, shaded] = nums, width = 280, cell = width / parts;
      return <>
        {Array.from({ length: parts }, (_, k) => <rect key={k} className={k < shaded ? styles.shaded : styles.plain} x={20 + k * cell} y={80} width={cell} height={60} />)}
      </>;
    }
    default:
      return buildMore(which, nums);
  }
}

export default function MathShape({ which, question }: { which: string; question: string }) {
  const t = useTranslations('App.math.formulaQuiz');
  const nums = splitTop(question, ',').map(part => evalExpression(part));
  const content = build(which, nums);
  return content === null ? null : <svg className={styles.shape} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('shapeDescription')}>{content}</svg>;
}
