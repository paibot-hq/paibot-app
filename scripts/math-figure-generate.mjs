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
  if (v.dec) return String(+(v.n / v.d).toFixed(2));
  const base = v.d === 1 ? `${v.n}` : `${v.n}/${v.d}`; return v.pi ? (v.d === 1 && v.n === 1 ? 'pi' : `${base}*pi`) : base; };
const D = h => ({ n: h, d: 100, pi: false, dec: true });   // a decimal in hundredths (2 * 5 * 3.14 = 31.4)
const num = v => (v.n / v.d) * (v.pi ? Math.PI : 1);
const same = (a, b) => Math.abs(num(a) - num(b)) < 1e-9;

function random(seed) {
  let s = [...seed].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = (rng, list) => list[Math.floor(rng() * list.length)];
const int = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

// Each generator returns { which, question, answer, wrong: [plausible mistakes], steps } for problem number i.
const scalar = (which, question, answer, wrong, steps) => ({ which, question, answer, wrong, steps });
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
    const key = `${spec.which}|${spec.question}`;
    if (taken.has(key)) continue;
    let choices, answerIndex;
    const asText = spec.point ? v => v.join(', ') : show;
    const correct = spec.point ?? spec.answer;
    const seen = [spec.point ? correct.join(',') : num(correct)];
    const distractors = [];
    for (const w of spec.wrong) { const k = spec.point ? w.join(',') : num(w); if (w && !seen.some(s => (spec.point ? s === k : Math.abs(s - k) < 1e-9)) && (spec.point || num(w) > 0)) { seen.push(k); distractors.push(w); } }
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
