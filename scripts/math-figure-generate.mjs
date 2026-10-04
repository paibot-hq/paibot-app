import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { context, root, additions, formatBank, run } from './math-pipeline.mjs';

// Problems about drawn figures (kind "figure", src/lib/math-formula.ts) are made here, not by an LLM:
// the numbers behind a figure, the answer, the usual mistakes as wrong choices and the worked lines
// all follow from a formula, and SymPy (verify_math.py) re-derives each answer afterwards.

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
// A value: n/d, times pi when pi is set.
const q = (n, d = 1, pi = false) => { const g = gcd(n, d) || 1; return { n: (d < 0 ? -n : n) / g, d: Math.abs(d) / g, pi }; };
const show = v => {
  if (v.raw) return v.raw;
  if (v.dec) return String(+(v.n / v.d).toFixed(2));
  const base = v.d === 1 ? `${v.n}` : `${v.n}/${v.d}`; return v.pi ? (v.d === 1 && v.n === 1 ? 'pi' : `${base}*pi`) : base; };
const D = h => ({ n: h, d: 100, pi: false, dec: true });   // a decimal in hundredths (2 * 5 * 3.14 = 31.4)
const R = (text, value) => ({ raw: text, value });   // an answer written as given: sqrt(13)
const num = v => (v.raw ? v.value : (v.n / v.d) * (v.pi ? Math.PI : 1));
const same = (a, b) => Math.abs(num(a) - num(b)) < 1e-9;

function random(seed) {
  let s = [...seed].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = (rng, list) => list[Math.floor(rng() * list.length)];
const int = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

// Each generator returns { which, question, answer, wrong: [plausible mistakes], steps } for problem number i.
const near = c => [c + 1, c - 1, c + 2, c - 2, c * 2, c + 3].filter(x => x > 0).map(x => q(x));
const scalar = (which, question, answer, wrong, steps) => ({ which, question, answer, wrong, steps });

const counting = (which, n) => {
  const [solid, what] = which.split('-'), answer = solid === 'prism' ? { faces: n + 2, edges: 3 * n, vertices: 2 * n }[what] : { faces: n + 1, edges: 2 * n, vertices: n + 1 }[what];
  const steps = { 'prism-faces': `${n} + 2 = ${answer}`, 'prism-edges': `3*${n} = ${answer}`, 'prism-vertices': `2*${n} = ${answer}`, 'pyramid-faces': `${n} + 1 = ${answer}`, 'pyramid-edges': `2*${n} = ${answer}`, 'pyramid-vertices': `${n} + 1 = ${answer}` }[which];
  return { which, question: `${n}`, answer: q(answer), wrong: [...near(answer), q(n), q(2 * n), q(3 * n)], steps: [steps] };
};
// Sides that make a triangle of the given kind.
const kindSides = (kind, rng) => {
  if (kind === 'equilateral') { const a = int(rng, 3, 9); return `${a}, ${a}, ${a}`; }
  if (kind === 'isosceles') { const a = int(rng, 4, 9), b = pick(rng, [a - 2, a - 1, a + 1, a + 2, 3]); return `${a}, ${a}, ${b}`; }
  if (kind === 'right') return pick(rng, ['3, 4, 5', '5, 12, 13', '6, 8, 10', '8, 15, 17', '4, 3, 5']);
  return pick(rng, ['4, 5, 6', '5, 6, 7', '6, 7, 9', '4, 6, 7', '7, 8, 10']);
};
// A problem answered by a word: the choices are all the labels.
const labelled = (question, which, labels, label) => ({ which, question, label, labels, steps: [] });
const point = (which, question, answer, wrong) => ({ which, question, point: answer, wrong, steps: [] });
const GENERATORS = {
  'fig-rect-area': (i, rng) => { const w = int(rng, 4, 12), h = int(rng, 2, 9); return scalar('rect-area', `${w}, ${h}`, q(w * h), [q(2 * (w + h)), q(w + h), q(w * h + w), q(w * h - h)], [`${w}*${h} = ${w * h}`]); },
  'fig-area': (i, rng) => {
    const kind = ['tri-area', 'para-area', 'trap-area', 'tri-area', 'trap-area'][i % 5];
    if (kind === 'para-area') { const b = int(rng, 4, 12), h = int(rng, 3, 9); return scalar(kind, `${b}, ${h}`, q(b * h), [q((b * h) / 2 | 0 || 1), q(b * h + b), q(b + h), q(2 * (b + h))], [`${b}*${h} = ${b * h}`]); }
    if (kind === 'tri-area') { let b, h; do { b = int(rng, 4, 14); h = int(rng, 3, 10); } while ((b * h) % 2); return scalar(kind, `${b}, ${h}`, q((b * h) / 2), [q(b * h), q(b + h), q((b * h) / 2 + b), q(((b + h) * 2))], [`${b}*${h}/2 = ${(b * h) / 2}`]); }
    let a, b, h; do { a = int(rng, 2, 8); b = int(rng, a + 1, 12); h = int(rng, 2, 8); } while (((a + b) * h) % 2);
    return scalar(kind, `${a}, ${b}, ${h}`, q(((a + b) * h) / 2), [q((a + b) * h), q((b * h) / 2 | 0 || 1), q(a * b), q(((b - a) * h) / 2)], [`(${a} + ${b})*${h}/2 = ${((a + b) * h) / 2}`]);
  },
  'fig-volume': (i, rng) => { const w = int(rng, 2, 9), d = int(rng, 2, 9), h = int(rng, 2, 9); return scalar('cuboid-volume', `${w}, ${d}, ${h}`, q(w * d * h), [q(2 * (w * d + d * h + h * w)), q(w + d + h), q(w * d), q(w * d * h + w * d)], [`${w}*${d}*${h} = ${w * d * h}`]); },
  'fig-circumference': (i, rng) => { const r = int(rng, 2, 12); return scalar('circle-circumference', `${r}, 3.14`, D(628 * r), [D(314 * r * r), D(314 * r), D(1256 * r), D(628 * r * r)], [`2*${r}*3.14 = ${show(D(628 * r))}`]); },
  'fig-circle-area': (i, rng) => { const r = int(rng, 2, 12); return scalar('circle-area', `${r}, 3.14`, D(314 * r * r), [D(628 * r), D(314 * r), D(628 * r * r), D(1256 * r * r)], [`${r}*${r}*3.14 = ${show(D(314 * r * r))}`]); },
  'fig-prism-volume': (i, rng) => {
    if (i % 5 < 3) { let b, h, l; do { b = int(rng, 3, 10); h = int(rng, 3, 8); l = int(rng, 3, 10); } while ((b * h) % 2); return scalar('prism-volume', `${b}, ${h}, ${l}`, q((b * h * l) / 2), [q(b * h * l), q(((b + h) * l) / 2 | 0 || 1), q((b * h) / 2), q(b * h * l / 2 + b * h)], [`${b}*${h}/2*${l} = ${(b * h * l) / 2}`]); }
    const r = int(rng, 2, 8), h = int(rng, 3, 12); return scalar('cylinder-volume', `${r}, ${h}, 3.14`, D(314 * r * r * h), [D(628 * r * h), D(314 * r * h), D(314 * r * r * h / 3 | 0), D(628 * r * r * h)], [`${r}*${r}*${h}*3.14 = ${show(D(314 * r * r * h))}`]);
  },
  'fig-angle-sum': (i, rng) => {
    if (i % 5 < 3) { const a = int(rng, 6, 12) * 5, b = int(rng, 6, 12) * 5, x = 180 - a - b; return scalar('angle-triangle', `${a}, ${b}`, q(x), [q(180 - a), q(a + b), q(x + 10), q(x - 10), q(360 - a - b)], [`180 - ${a} - ${b} = ${x}`]); }
    let a, b, c, x; do { a = int(rng, 10, 20) * 5; b = int(rng, 10, 20) * 5; c = int(rng, 6, 16) * 5; x = 360 - a - b - c; } while (x < 30 || x >= 180); return scalar('angle-quad', `${a}, ${b}, ${c}`, q(x), [q(180 - a - b - c > 0 ? 180 - a - b - c : x + 20), q(a + b + c), q(x + 10), q(x - 10), q(x + 20)], [`360 - ${a} - ${b} - ${c} = ${x}`]);
  },
  'fig-parallel': (i, rng) => {
    const which = ['parallel-vertical', 'parallel-corresponding', 'parallel-alternate', 'parallel-cointerior', 'parallel-alternate'][i % 5], a = pick(rng, [35, 40, 50, 55, 65, 70, 110, 115, 125, 130, 140]);
    const x = which === 'parallel-cointerior' ? 180 - a : a;
    return scalar(which, `${a}`, q(x), [q(180 - a), q(90 - a > 0 ? 90 - a : a + 10), q(360 - a > 0 ? a + 10 : a), q(a + 20), q(180 - a + 10)], [which === 'parallel-cointerior' ? `180 - ${a} = ${x}` : `${a} = ${x}`]);
  },
  'fig-polygon': (i, rng) => {
    const kind = ['polygon-interior-sum', 'polygon-exterior', 'polygon-each-interior', 'polygon-interior-sum', 'polygon-exterior'][i % 5];
    if (kind === 'polygon-interior-sum') { const n = int(rng, 5, 12); return scalar(kind, `${n}`, q(180 * (n - 2)), [q(180 * n), q(180 * (n - 1)), q(180 * (n - 3)), q(360 * (n - 2)), q(180 * (n - 2) + 180)], [`180*(${n} - 2) = ${180 * (n - 2)}`]); }
    const n = pick(rng, [5, 6, 8, 9, 10, 12, 15, 18]);
    if (kind === 'polygon-exterior') return scalar(kind, `${n}`, q(360, n), [q(180 * (n - 2), n), q(180, n), q(360 * 2, n), q(360 - 360 / n | 0 || 1)], [`360/${n} = ${360 / n}`]);
    return scalar(kind, `${n}`, q(180 * (n - 2), n), [q(360, n), q(180 * n, n), q(180 * (n - 1), n), q(180 * (n - 2), n - 1), q(180 * (n - 2) - 360 / n | 0 || 1)], [`180*(${n} - 2)/${n} = ${(180 * (n - 2)) / n}`]);
  },
  'fig-sector': (i, rng) => {
    const r = int(rng, 3, 12), theta = pick(rng, [30, 45, 60, 90, 120, 135, 150, 180, 240, 270]);
    if (i % 2 === 0) return scalar('sector-arc', `${r}, ${theta}`, q(r * theta, 180, true), [q(2 * r, 1, true), q(r * theta, 360, true), q(r * r * theta, 360, true), q(r * theta, 90, true), q(r * r * theta, 720, true)], [`2*${r}*pi*${theta}/360 = ${show(q(r * theta, 180, true))}`]);
    return scalar('sector-area', `${r}, ${theta}`, q(r * r * theta, 360, true), [q(r * r, 1, true), q(r * theta, 180, true), q(r * r * theta, 180, true), q(r * r * theta, 720, true), q(2 * r * theta, 360, true)], [`${r}^2*pi*${theta}/360 = ${show(q(r * r * theta, 360, true))}`]);
  },
  'fig-solid': (i, rng) => {
    const kind = ['cone-volume', 'sphere-volume', 'sphere-surface', 'cone-volume', 'sphere-volume'][i % 5];
    if (kind === 'cone-volume') { const r = int(rng, 2, 9), h = int(rng, 2, 4) * 3; return scalar(kind, `${r}, ${h}`, q(r * r * h, 3, true), [q(r * r * h, 1, true), q(r * h, 3, true), q(2 * r * h, 3, true), q(r * r * h, 2, true)], [`${r}^2*${h}*pi/3 = ${show(q(r * r * h, 3, true))}`]); }
    const r = int(rng, 2, 9);
    if (kind === 'sphere-volume') return scalar(kind, `${r}`, q(4 * r ** 3, 3, true), [q(4 * r * r, 1, true), q(r ** 3, 3, true), q(4 * r ** 3, 1, true), q(2 * r ** 3, 3, true)], [`4/3*pi*${r}^3 = ${show(q(4 * r ** 3, 3, true))}`]);
    return scalar(kind, `${r}`, q(4 * r * r, 1, true), [q(4 * r ** 3, 3, true), q(2 * r * r, 1, true), q(r * r, 1, true), q(3 * r * r, 1, true)], [`4*pi*${r}^2 = ${4 * r * r}*pi`]);
  },
  'fig-similar': (i, rng) => {
    if (i % 5 < 3) { let a, b, c; do { a = int(rng, 2, 6); b = int(rng, 3, 15); c = int(rng, 2, 12); } while (b === a || (b * c) % a || (b * c) / a === c); return scalar('similar-side', `${a}, ${b}, ${c}`, q((b * c) / a), [q(c + b - a > 0 ? c + b - a : c + 2), q(a * c / b | 0 || 1), q(b * a), q(b + c), q(((b * c) / a) + 1)], [`${b}*${c}/${a} = ${(b * c) / a}`]); }
    let m, n, s; do { m = int(rng, 1, 4); n = int(rng, m + 1, 6); s = int(rng, 2, 14); } while ((s * n * n) % (m * m) || gcd(m, n) !== 1);
    return scalar('similar-area', `${m}, ${n}, ${s}`, q((s * n * n) / (m * m)), [q((s * n) / m | 0 || 1), q(s * n), q(s * (n - m)), q(s * n * n), q(s + n * n)], [`${s}*(${n}/${m})^2 = ${(s * n * n) / (m * m)}`]);
  },
  'fig-inscribed': (i, rng) => {
    const kind = ['inscribed-angle', 'inscribed-same-arc', 'inscribed-diameter', 'inscribed-angle', 'inscribed-diameter'][i % 5];
    if (kind === 'inscribed-angle') { const c = pick(rng, [60, 80, 100, 110, 120, 130, 140, 150]); return scalar(kind, `${c}`, q(c / 2), [q(c), q(c * 2), q(180 - c / 2), q(c / 2 + 10), q(90 - c / 2 > 0 ? 90 - c / 2 : c / 2 + 20)], [`${c}/2 = ${c / 2}`]); }
    if (kind === 'inscribed-same-arc') { const a = pick(rng, [25, 30, 35, 40, 45, 50, 55]); return scalar(kind, `${a}`, q(a), [q(2 * a), q(a / 2 | 0 || 1), q(180 - a), q(90 - a), q(a + 10)], [`${a} = ${a}`]); }
    const a = pick(rng, [20, 25, 30, 35, 40, 50, 55, 60]); return scalar(kind, `${a}`, q(90 - a), [q(180 - a), q(a), q(180 - 2 * a), q(90 + a), q(2 * a)], [`90 - ${a} = ${90 - a}`]);
  },
  'fig-power': (i, rng) => { let a, b, c; do { a = int(rng, 2, 8); b = int(rng, 2, 9); c = int(rng, 2, 9); } while ((a * b) % c || a * b / c === a || a * b / c === b || c === a || c === b); const x = (a * b) / c; return scalar('power-chord', `${a}, ${b}, ${c}`, q(x), [q(a + b - c > 0 ? a + b - c : x + 2), q(a * b * c), q((a * c) / b | 0 || 1), q(x + 1), q(a + b + c)], [`${a}*${b}/${c} = ${x}`]); },
  'fig-centroid': (i, rng) => { let p; do { p = Array.from({ length: 6 }, () => int(rng, -4, 8)); } while ((p[0] + p[2] + p[4]) % 3 || (p[1] + p[3] + p[5]) % 3 || new Set([`${p[0]},${p[1]}`, `${p[2]},${p[3]}`, `${p[4]},${p[5]}`]).size < 3 || (p[2] - p[0]) * (p[5] - p[1]) === (p[4] - p[0]) * (p[3] - p[1])); const x = (p[0] + p[2] + p[4]) / 3, y = (p[1] + p[3] + p[5]) / 3; return { which: 'centroid', question: p.join(', '), point: [x, y], wrong: [[(p[0] + p[2]) / 2, (p[1] + p[3]) / 2], [y, x], [x + 1, y], [x, y - 1], [p[0] + p[2] + p[4], p[1] + p[3] + p[5]], [(p[2] + p[4]) / 2, (p[3] + p[5]) / 2]].filter(([a, b]) => Number.isInteger(a) && Number.isInteger(b)), steps: [] }; },

  // --- solids, shapes, symmetry, moves, data ---
  'fig-solid-name': (i, rng) => {
    const kind = ['cube', 'cuboid', 'cylinder', 'sphere', 'cuboid'][i % 5], code = ['cube', 'cuboid', 'cylinder', 'sphere'].indexOf(kind);
    const a = int(rng, 2, 6), b = a + int(rng, 1, 3), c = a + int(rng, 2, 4);
    return labelled(kind === 'cube' ? `0, ${a}, ${a}, ${a}` : kind === 'cuboid' ? `1, ${a}, ${b}, ${c}` : `${code}, ${a}, ${b}, ${c}`, 'solid-name', ['cube', 'cuboid', 'cylinder', 'sphere'], kind);
  },
  'fig-box-shape': (i, rng) => {
    const which = ['box-faces', 'box-edges', 'box-vertices', 'box-faces', 'box-edges'][i % 5], w = int(rng, 2, 8), d = int(rng, 2, 8), h = int(rng, 2, 8);
    if (which === 'box-faces') return scalar(which, `${w}, ${d}, ${h}`, q(6), [q(4), q(8), q(12), q(5)], []);
    if (which === 'box-edges') return scalar(which, `${w}, ${d}, ${h}`, q(12), [q(6), q(8), q(10), q(14)], []);
    if (which === 'box-vertices') return scalar(which, `${w}, ${d}, ${h}`, q(8), [q(6), q(12), q(10), q(4)], []);
    return scalar(which, `${w}, ${d}, ${h}`, q(12), [q(6), q(8), q(10), q(14)], []);
  },
  'fig-box-edge': (i, rng) => { const w = int(rng, 2, 9), d = int(rng, 2, 9), h = int(rng, 2, 9); return scalar('box-edge-total', `${w}, ${d}, ${h}`, q(4 * (w + d + h)), [q(w + d + h), q(2 * (w + d + h)), q(12 * w), q(w * d * h), q(4 * (w + d + h) - 4)], [`4*(${w} + ${d} + ${h}) = ${4 * (w + d + h)}`]); },
  'fig-prism-count': (i, rng) => counting(['prism-faces', 'prism-vertices', 'prism-edges', 'prism-faces', 'prism-vertices'][i % 5], int(rng, 3, 8)),
  'fig-euler': (i, rng) => { const v = int(rng, 4, 12), f = int(rng, 4, 10), e = v + f - 2; return i % 2 ? scalar('euler-vertices', `${e}, ${f}`, q(v), [q(e - f), q(e + f), q(v + 1), q(v - 1), q(e - f + 1)], [`${e} - ${f} + 2 = ${v}`]) : scalar('euler-faces', `${v}, ${e}`, q(f), [q(e - v), q(e + v), q(f + 1), q(f - 1), q(e - v + 1)], [`${e} - ${v} + 2 = ${f}`]); },
  'fig-triangle-type': (i, rng) => { const kind = ['equilateral', 'isosceles', 'scalene', 'isosceles', 'equilateral'][i % 5]; return labelled(kindSides(kind, rng), 'triangle-type', ['equilateral', 'isosceles', 'scalene', 'right'], kind); },
  'fig-shape-basic': (i, rng) => {
    const kind = ['square', 'rectangle', 'right', 'rectangle', 'square'][i % 5];
    if (kind === 'right') return labelled(kindSides('right', rng), 'triangle-type', ['right', 'scalene', 'isosceles', 'equilateral'], kind);
    const a = int(rng, 3, 9), b = kind === 'square' ? a : pick(rng, [a + 1, a + 2, a + 3, a + 5]);
    return labelled(`${a}, ${b}, 90`, 'quad-type', ['square', 'rectangle', 'right', 'equilateral'], kind);
  },
  'fig-quad-type': (i, rng) => {
    const kind = ['rhombus', 'parallelogram', 'square', 'rectangle', 'rhombus'][i % 5], a = int(rng, 3, 9);
    const angle = pick(rng, [50, 60, 70, 110, 120, 130]), b = pick(rng, [a + 1, a + 2, a + 3, a + 4]);
    const question = { rhombus: `${a}, ${a}, ${angle}`, parallelogram: `${a}, ${b}, ${angle}`, square: `${a}, ${a}, 90`, rectangle: `${a}, ${b}, 90` }[kind];
    return labelled(question, 'quad-type', ['square', 'rectangle', 'rhombus', 'parallelogram'], kind);
  },
  'fig-circle-parts': (i, rng) => { const r = int(rng, 2, 12); return i % 2 ? scalar('circle-radius', `${2 * r}`, q(r), [q(2 * r), q(4 * r), q(r + 2), q(r - 1 || r + 3), q(r * r)], [`${2 * r}/2 = ${r}`]) : scalar('circle-diameter', `${r}`, q(2 * r), [q(r), q(4 * r), q(r * r), q(r + 2), q(3 * r)], [`2*${r} = ${2 * r}`]); },
  'fig-protractor': (i, rng) => { const start = pick(rng, [0, 10, 20, 30, 40]), size = int(rng, 3, 12) * 10, end = Math.min(180, start + size), ans = end - start; return scalar('protractor', `${start}, ${end}`, q(ans), [q(end), q(180 - ans), q(start + end > 180 ? ans + 10 : start + end), q(ans + 10), q(ans - 10 > 0 ? ans - 10 : ans + 20), q(180 - end)], [`${end} - ${start} = ${ans}`]); },
  'fig-line-pairs': (i, rng) => {
    const which = i % 2 ? 'perpendicular-pairs' : 'parallel-pairs';
    for (;;) {
      const dirs = Array.from({ length: 4 }, () => pick(rng, [0, 30, 45, 60, 90, 120, 135, 150]));
      let c = 0;
      for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) if (which === 'parallel-pairs' ? (dirs[a] - dirs[b]) % 180 === 0 : Math.abs(dirs[a] - dirs[b]) % 180 === 90) c++;
      if (c >= 1 && c <= 3) return scalar(which, dirs.join(', '), q(c), [q(0), q(1), q(2), q(3), q(4), q(6)], []);
    }
  },
  'fig-congruent': (i, rng) => { const [a, b, c] = pick(rng, [[3, 4, 5], [4, 5, 6], [5, 7, 9], [6, 8, 10], [5, 6, 7], [7, 8, 9], [4, 6, 8], [5, 12, 13]]), k = i % 3, sides = [a, b, c], x = sides[k]; if (new Set(sides).size < 3) throw new Error('distinct sides'); return scalar('congruent-side', `${a}, ${b}, ${c}, ${k}`, q(x), [...sides.filter(v => v !== x).map(v => q(v)), q(a + b + c), q(x + 1)], []); },
  'fig-congruence-condition': (i, rng) => {
    const variants = { sss: [[1, 1, 1, 0, 0, 0]], sas: [[1, 1, 0, 0, 1, 0], [1, 0, 1, 1, 0, 0], [0, 1, 1, 0, 0, 1]], asa: [[1, 0, 0, 1, 1, 0], [0, 1, 0, 0, 1, 1], [0, 0, 1, 1, 0, 1]], insufficient: [[0, 0, 0, 1, 1, 1], [1, 1, 0, 1, 0, 0], [1, 1, 0, 0, 0, 1], [1, 0, 1, 0, 1, 0]] };
    const kind = ['sss', 'sas', 'asa', 'insufficient', 'sas'][i % 5];
    return labelled(pick(rng, variants[kind]).join(', '), 'congruence-condition', ['sss', 'sas', 'asa', 'insufficient'], kind);
  },
  'fig-isosceles': (i, rng) => { if (i % 2) { const base = pick(rng, [35, 40, 50, 55, 65, 70, 75]); return scalar('isosceles-apex', `${base}`, q(180 - 2 * base), [q(180 - base), q(base), q(90 - base > 0 ? 90 - base : base + 10), q(2 * base), q(180 - base / 2 | 0)], [`180 - 2*${base} = ${180 - 2 * base}`]); } const apex = pick(rng, [20, 30, 40, 50, 80, 100, 120, 140]); return scalar('isosceles-base', `${apex}`, q((180 - apex) / 2), [q(apex), q(180 - apex), q((180 - apex) / 2 + 10), q(90 - apex > 0 ? 90 - apex : apex / 2)], [`(180 - ${apex})/2 = ${(180 - apex) / 2}`]); },
  'fig-parallelogram': (i, rng) => {
    const which = ['parallelogram-angle', 'parallelogram-half', 'parallelogram-perimeter', 'parallelogram-angle', 'parallelogram-half'][i % 5];
    if (which === 'parallelogram-angle') { const a = pick(rng, [50, 55, 60, 65, 70, 75, 110, 120]); return scalar(which, `${a}`, q(180 - a), [q(a), q(360 - a > 180 ? 90 : 360 - 2 * a), q(90 - a > 0 ? 90 - a : a - 90), q(a + 10), q(180 - a + 10)].filter(v => v.n > 0), [`180 - ${a} = ${180 - a}`]); }
    if (which === 'parallelogram-half') { const d = int(rng, 3, 10) * 2; return scalar(which, `${d}`, q(d / 2), [q(d), q(d / 2 + 2), q(d * 2), q(d - 2)], [`${d}/2 = ${d / 2}`]); }
    const a = int(rng, 3, 10), b = int(rng, a + 1, 13); return scalar(which, `${a}, ${b}`, q(2 * (a + b)), [q(a + b), q(a * b), q(a + 2 * b), q(2 * a + b)], [`2*(${a} + ${b}) = ${2 * (a + b)}`]);
  },
  'fig-symmetry': (i, rng) => { const n = [3, 4, 5, 6, 8][i % 5]; return scalar('lines-of-symmetry', `${n}`, q(n), [q(n + 1), q(n - 1), q(n * 2), q(n + 2)], []); },
  'fig-scale': (i, rng) => { if (i % 2) { const k = pick(rng, [2, 3, 4]), L = int(rng, 2, 9); return scalar('scale-enlarge', `${k}, ${L}`, q(k * L), [q(L + k), q(L), q(k * L + k), q(L * k * k)], [`${k}*${L} = ${k * L}`]); } const n = pick(rng, [1000, 2000, 2500, 5000, 10000]), d = int(rng, 2, 9), real = (n * d) / 100; return scalar('scale-actual', `${n}, ${d}`, q(real), [q(n * d), q(real * 10), q(real / 10 | 0 || 1), q(real + n / 100)], [`${d}*${n}/100 = ${real}`]); },
  'fig-moves': (i, rng) => {
    const which = ['move-translate', 'move-reflect-x', 'move-rotate90', 'move-reflect-y', 'move-rotate180'][i % 5], x = int(rng, 1, 5) * (rng() < 0.5 ? -1 : 1), y = int(rng, 1, 5) * (rng() < 0.5 ? -1 : 1);
    if (which === 'move-translate') { const dx = int(rng, 1, 4) * (rng() < 0.5 ? -1 : 1), dy = int(rng, 1, 4) * (rng() < 0.5 ? -1 : 1); return point(which, `${x}, ${y}, ${dx}, ${dy}`, [x + dx, y + dy], [[x - dx, y - dy], [x + dy, y + dx], [x + dx, y - dy], [x - dx, y + dy]]); }
    if (which === 'move-reflect-x') return point(which, `${x}, ${y}`, [x, -y], [[-x, y], [-x, -y], [y, x], [x, y]]);
    if (which === 'move-reflect-y') return point(which, `${x}, ${y}`, [-x, y], [[x, -y], [-x, -y], [y, x], [x, y]]);
    if (which === 'move-rotate90') return point(which, `${x}, ${y}`, [-y, x], [[y, -x], [-x, -y], [-y, -x], [x, -y]]);
    return point(which, `${x}, ${y}`, [-x, -y], [[x, -y], [-x, y], [y, x], [-y, x]]);
  },
  'fig-bar': (i, rng) => {
    if (i % 2) { const v = Array.from({ length: 5 }, () => int(rng, 1, 9) * 10), t = v.reduce((a, b) => a + b, 0); return scalar('bar-total', v.join(', '), q(t), [q(t + 10), q(t - 10), q(t + 20), q(Math.max(...v)), q(t - 20)], [`${v.join(' + ')} = ${t}`]); }
    const v = Array.from({ length: 4 }, () => int(rng, 1, 9) * 10); let a = int(rng, 1, 4), b = int(rng, 1, 4); while (a === b || v[a - 1] === v[b - 1]) { a = int(rng, 1, 4); b = int(rng, 1, 4); if (new Set(v).size === 1) v[0] += 10; }
    const d = Math.abs(v[a - 1] - v[b - 1]); return scalar('bar-diff', `${v.join(', ')}, ${a}, ${b}`, q(d), [q(v[a - 1] + v[b - 1]), q(d + 10), q(d + 20), q(Math.max(v[a - 1], v[b - 1])), q(d + 20)], [`${Math.max(v[a - 1], v[b - 1])} - ${Math.min(v[a - 1], v[b - 1])} = ${d}`]);
  },
  'fig-line-graph': (i, rng) => { for (;;) { const v = Array.from({ length: 5 }, () => int(rng, 1, 9) * 10), ch = v.slice(1).map((x, k) => Math.abs(x - v[k])), m = Math.max(...ch); if (ch.filter(x => x === m).length === 1 && m > 0) return scalar('line-change', v.join(', '), q(m), [q(Math.max(...v) - Math.min(...v)), q(m + 10), q(m > 10 ? m - 10 : m + 20), q(Math.max(...v)), q(m + 20)], []); } },
  'fig-pie': (i, rng) => { const total = pick(rng, [200, 300, 400, 500, 600, 800]), shares = pick(rng, [[40, 30, 20, 10], [50, 25, 15, 10], [35, 30, 20, 15], [45, 25, 20, 10], [40, 25, 20, 15]]), k = int(rng, 1, 4), ans = (total * shares[k - 1]) / 100; return scalar('pie-count', `${total}, ${shares.join(', ')}, ${k}`, q(ans), [q(shares[k - 1]), q(total - ans), q(ans + 20), q((total * shares[k % 4]) / 100), q(ans / 2 | 0 || 10)], [`${total}*${shares[k - 1]}/100 = ${ans}`]); },
  'fig-histogram': (i, rng) => { const f = Array.from({ length: 5 }, () => int(rng, 2, 12)), k = int(rng, 2, 4), ans = f.slice(k - 1).reduce((a, b) => a + b, 0); return scalar('hist-above', `${f.join(', ')}, ${k}`, q(ans), [q(f.reduce((a, b) => a + b, 0)), q(f.slice(k).reduce((a, b) => a + b, 0) || ans + 2), q(f.slice(0, k).reduce((a, b) => a + b, 0)), q(ans + 1)], [`${f.slice(k - 1).join(' + ')} = ${ans}`]); },
  'fig-table': (i, rng) => { const v = Array.from({ length: 6 }, () => int(rng, 2, 25)), t = v.reduce((a, b) => a + b, 0); return scalar('table-total', v.join(', '), q(t), [q(t + 10), q(t - 10), q(v[0] + v[1] + v[2]), q(t + 1), q(t - 1)], [`${v.join(' + ')} = ${t}`]); },
  'fig-two-way': (i, rng) => { const a = int(rng, 5, 25), b = int(rng, 5, 25), c = int(rng, 5, 25), x = int(rng, 4, 20), t2 = c + x; return scalar('twoway-missing', `${a}, ${b}, ${c}, ${t2}`, q(x), [q(t2 + c), q(a + b - c > 0 ? a + b - c : x + 3), q(t2), q(x + 2), q(b)].filter(v => v.n > 0), [`${t2} - ${c} = ${x}`]); },
  'fig-frequency': (i, rng) => { for (;;) { const total = pick(rng, [20, 25, 50]), f = [0, 0, 0, 0, 0]; let left = total; for (let k = 0; k < 4; k++) { f[k] = int(rng, 1, Math.max(1, Math.min(left - (4 - k), total / 2))); left -= f[k]; } f[4] = left; if (f[4] < 1) continue; const k = int(rng, 1, 5), hundredths = (f[k - 1] * 100) / total; return scalar('relative-frequency', `${f.join(', ')}, ${k}`, D(hundredths), [D(f[k - 1]), D(Math.round((f[k - 1] * 100) / 10) * 1), D((f[k - 1] * 100) / total + 5), D(Math.round(100 - hundredths) || 50)], []); } },
  'fig-box': (i, rng) => { const low = int(rng, 0, 20), q1 = low + int(rng, 5, 15), med = q1 + int(rng, 4, 12), q3 = med + int(rng, 4, 12), high = q3 + int(rng, 5, 20), which = i % 2 ? 'box-range' : 'box-iqr', ans = which === 'box-range' ? high - low : q3 - q1; return scalar(which, `${low}, ${q1}, ${med}, ${q3}, ${high}`, q(ans), which === 'box-range' ? [q(q3 - q1), q(high - q1), q(q3 - low), q(high), q(med)] : [q(high - low), q(q3 - med), q(med - q1), q(q3), q(q3 + q1)], [which === 'box-range' ? `${high} - ${low} = ${ans}` : `${q3} - ${q1} = ${ans}`]); },
  'fig-quartile': (i, rng) => { const n = pick(rng, [7, 8, 9, 10, 11]), data = new Set(); while (data.size < n) data.add(int(rng, 2, 40)); const sorted = [...data].sort((a, b) => a - b), half = Math.floor(n / 2), lower = sorted.slice(0, half), upper = sorted.slice(n - half), med = xs => { const m = Math.floor(xs.length / 2); return xs.length % 2 ? xs[m] : (xs[m - 1] + xs[m]) / 2; }, which = i % 2 ? 'quartile-q3' : 'quartile-q1', ans = which === 'quartile-q1' ? med(lower) : med(upper), median = med(sorted); return scalar(which, sorted.join(', '), D(Math.round(ans * 100)), [D(Math.round(median * 100)), D(Math.round((which === 'quartile-q1' ? med(upper) : med(lower)) * 100)), D(Math.round(((sorted[0] + sorted[n - 1]) / 2) * 100)), D(Math.round((which === 'quartile-q1' ? sorted[half - 1] : sorted[n - half]) * 100)), D(Math.round((sorted[n - 1] - sorted[0]) * 100))], []); },
  'fig-proportion-table': (i, rng) => { const k = int(rng, 2, 9), xs = [1, 2, 3, int(rng, 4, 9)]; if (i % 2) xs.splice(0, 4, int(rng, 1, 3), int(rng, 4, 5), int(rng, 6, 7), int(rng, 8, 10)); return scalar('proportion-table', `${k}, ${xs.join(', ')}`, q(k * xs[3]), [q(k + xs[3]), q(xs[3]), q(k * xs[2]), q(k * xs[3] + k), q(k * xs[3] - k)], [`${k}*${xs[3]} = ${k * xs[3]}`]); },
  'fig-net': (i, rng) => { if (i % 2) { const r = int(rng, 2, 9), h = int(rng, 3, 10); return scalar('net-cylinder', `${r}, ${h}`, q(2 * r, 1, true), [q(r, 1, true), q(4 * r, 1, true), q(r * r, 1, true), q(2 * r * h, 1, true)], [`2*${r}*pi = ${2 * r}*pi`]); } const w = int(rng, 2, 7), d = int(rng, 2, 7), h = int(rng, 2, 7), s = 2 * (w * d + d * h + h * w); return scalar('net-cuboid', `${w}, ${d}, ${h}`, q(s), [q(w * d * h), q(w * d + d * h + h * w), q(2 * (w + d + h)), q(s + 2 * w), q(s - 2 * h)], [`2*(${w}*${d} + ${d}*${h} + ${h}*${w}) = ${s}`]); },
  'fig-space': (i, rng) => {
    if (i % 5 < 2) { const [a, b, c] = pick(rng, [[1, 2, 2], [2, 3, 6], [2, 4, 4], [1, 4, 8], [4, 4, 7], [2, 6, 9], [6, 6, 7]]), r = Math.sqrt(a * a + b * b + c * c); return scalar('space-diagonal', `${a}, ${b}, ${c}`, q(r), [q(a + b + c), q(r + 1), q(r - 1), R(`sqrt(${a * a + b * b})`, Math.sqrt(a * a + b * b)), q(a * a + b * b + c * c)], [`sqrt(${a}^2 + ${b}^2 + ${c}^2) = ${r}`]); }
    for (;;) { const p = Array.from({ length: 4 }, () => int(rng, -4, 6)), dx = p[2] - p[0], dy = p[3] - p[1], s = dx * dx + dy * dy; if (!s || !dx || !dy) continue; const r = Math.sqrt(s), ans = Number.isInteger(r) ? q(r) : R(`sqrt(${s})`, r); return scalar('distance', p.join(', '), ans, [R(`sqrt(${Math.abs(dx) + Math.abs(dy)})`, Math.sqrt(Math.abs(dx) + Math.abs(dy))), q(Math.abs(dx) + Math.abs(dy)), R(`sqrt(${s + 2})`, Math.sqrt(s + 2)), R(`sqrt(${Math.abs(dx * dx - dy * dy) || s + 4})`, Math.sqrt(Math.abs(dx * dx - dy * dy) || s + 4)), q(s)], []); }
  },
  'fig-ceva': (i, rng) => { for (;;) { const [p, qq, r, s] = Array.from({ length: 4 }, () => int(rng, 1, 4)); if (i % 2 && Math.max(r, s) < 2 * Math.min(r, s)) continue; if (p === qq && r === s) continue; const ans = q(qq * s, p * r); if (ans.d === 1) continue; return scalar(i % 2 ? 'menelaus-ratio' : 'ceva-ratio', `${p}, ${qq}, ${r}, ${s}`, ans, [q(p * r, qq * s), q(p * s, qq * r), q(qq * r, p * s), q(qq + s, p + r)], [`${qq}*${s}/(${p}*${r}) = ${show(ans)}`]); } },
  // A parabola y = a x^2 drawn as a graph (kind "graph"): choose its equation.
  'graph-square-a': (i, rng) => {
    const coefficients = [[1, 1], [2, 1], [-1, 1], [1, 2], [-2, 1], [3, 1], [-1, 2], [1, 3], [-3, 1], [2, 3]];
    const [n, d] = coefficients[i % coefficients.length];
    const text = (a, b) => { const sign = a < 0 ? '-' : '', m = Math.abs(a); return b === 1 ? (m === 1 ? `${sign}x^2` : `${sign}${m}*x^2`) : `${sign}${m}/${b}*x^2`; };
    const eq = (a, b) => `y = ${text(a, b)}`;
    const reduce = ([a, b]) => { const g = gcd(a, b) || 1; return [a / g, b / g]; };
    // The usual mistakes: the sign, twice or half the coefficient, its reciprocal.
    const wrong = [[-n, d], [2 * n, d], [n, 2 * d], [d * Math.sign(n), Math.abs(n)], [-d * Math.sign(n), Math.abs(n)]].map(reduce);
    return { problem: { kind: 'graph', which: 'parabola', question: text(n, d), steps: [eq(n, d)], answer: eq(n, d), wrong: wrong.map(([a, b]) => eq(a, b)) } };
  },
  'fig-clock': (i, rng) => { const h = int(rng, 1, 12), m = int(rng, 0, 11) * 5; return { which: 'clock-read', question: `${h}, ${m}`, point: [h, m], wrong: [[m / 5 || 12, h * 5 % 60], [h, (m + 5) % 60], [h, (m + 55) % 60], [(h % 12) + 1, m], [h === 1 ? 12 : h - 1, m], [m === 0 ? 12 : m / 5, h === 12 ? 0 : h * 5]].filter(([a, b]) => a >= 1 && a <= 12 && b >= 0 && b < 60), steps: [] }; },
  'fig-fraction-unit': (i, rng) => { const parts = int(rng, 2, 9); return scalar('fraction-shaded', `${parts}, 1`, q(1, parts), [q(1, parts - 1 || 2), q(1, parts + 1), q(parts - 1, parts), q(parts, parts + 1)], [`1/${parts} = 1/${parts}`]); },
  'fig-fraction': (i, rng) => { let parts, shaded; do { parts = int(rng, 3, 10); shaded = int(rng, 2, parts - 1); } while (gcd(parts, shaded) !== 1); return scalar('fraction-shaded', `${parts}, ${shaded}`, q(shaded, parts), [q(parts, shaded), q(parts - shaded, parts), q(shaded, parts - shaded), q(shaded, parts + 1), q(1, shaded)], [`${shaded}/${parts} = ${shaded}/${parts}`]); },
};
export const figureRules = Object.keys(GENERATORS);

export function generate(rule, count, taken = new Set(), seed = rule) {
  const make = GENERATORS[rule];
  assert.ok(make, `No figure generator for ${rule}`);
  const rng = random(`${seed}:${taken.size}`);
  const problems = [];
  for (let i = 0, tries = 0; problems.length < count; i++) {
    assert.ok(++tries < 2000, `Could not make ${count} distinct problems for ${rule}`);
    const spec = make(problems.length, rng);
    if (spec.problem) {
      const { answer, wrong, ...rest } = spec.problem, norm = t => t.replaceAll(' ', '');
      const options = [answer, ...wrong.filter((w, k) => norm(w) !== norm(answer) && wrong.findIndex(x => norm(x) === norm(w)) === k)].slice(0, 4);
      if (options.length < 4 || taken.has(`${rest.which}|${rest.question}`)) continue;
      for (let j = options.length - 1; j > 0; j--) { const k = Math.floor(rng() * (j + 1)); [options[j], options[k]] = [options[k], options[j]]; }
      taken.add(`${rest.which}|${rest.question}`);
      problems.push({ ...rest, given: null, choices: options, answerIndex: options.indexOf(answer) });
      continue;
    }
    const key = `${spec.which}|${spec.question}`;
    if (taken.has(key)) continue;
    if (spec.labels) {
      const all = [...spec.labels];
      for (let j = all.length - 1; j > 0; j--) { const k = Math.floor(rng() * (j + 1)); [all[j], all[k]] = [all[k], all[j]]; }
      taken.add(key);
      problems.push({ kind: 'figure', which: spec.which, question: spec.question, given: null, steps: spec.steps, choices: all, answerIndex: all.indexOf(spec.label) });
      continue;
    }
    let choices, answerIndex;
    const asText = spec.point ? v => v.join(', ') : show;
    const correct = spec.point ?? spec.answer;
    const seen = [spec.point ? correct.join(',') : num(correct)];
    const distractors = [];
    for (const w of spec.wrong.filter(w => spec.which !== 'relative-frequency' || num(w) < 1)) { const k = spec.point ? w.join(',') : num(w); if (w && !seen.some(s => (spec.point ? s === k : Math.abs(s - k) < 1e-9)) && (spec.point || num(w) > 0)) { seen.push(k); distractors.push(w); } }
    if (distractors.length < 3) continue;
    const chosen = distractors.slice(0, 3), all = [correct, ...chosen];
    // A fixed shuffle from the same generator.
    for (let j = all.length - 1; j > 0; j--) { const k = Math.floor(rng() * (j + 1)); [all[j], all[k]] = [all[k], all[j]]; }
    answerIndex = all.indexOf(correct);
    choices = all.map(asText);
    taken.add(key);
    problems.push({ kind: 'figure', which: spec.which, question: spec.question, given: null, steps: spec.steps, choices, answerIndex });
  }
  return { problems };
}

if (process.argv[1]?.endsWith('math-figure-generate.mjs')) {
  let temp;
  try {
    const [unit, item, setId, ...options] = process.argv.slice(2);
    assert.ok(unit && item && setId, 'Usage: node scripts/math-figure-generate.mjs <unit> <item> <set> [--tier 1|2|3] [--count N]');
    let count = 5, tier = 2;
    for (let i = 0; i < options.length; i++) {
      if (options[i] === '--tier') tier = Number(options[++i]);
      else if (options[i] === '--count') count = Number(options[++i]);
      else throw new Error(`Unknown option: ${options[i]}`);
    }
    const { set, bank, path, original } = context(unit, item, setId);
    assert.ok(set.rule && GENERATORS[set.rule], `Set ${item} ${setId} has no figure rule`);
    const taken = new Set(bank.problems.filter(p => p.kind === 'figure').map(p => `${p.which}|${p.question}`));
    const generated = generate(set.rule, count, taken, `${unit}/${item}/${setId}`);
    const newProblems = additions(unit, item, setId, bank, generated, count, undefined, tier);
    const combined = formatBank({ ...bank, problems: [...bank.problems, ...newProblems] });
    writeFileSync(path, combined);
    try {
      console.log(run(process.execPath, [`${root}scripts/validate-math-formula.mjs`], root).trim());
      console.log(run('uv', ['run', '--locked', 'python', `${root}scripts/verify_math.py`, unit], root).trim());
    } catch (error) { writeFileSync(path, original); throw error; }
    console.log(`Added ${count} unpublished problems to ${path}`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { if (temp) rmSync(temp, { recursive: true, force: true }); }
}
