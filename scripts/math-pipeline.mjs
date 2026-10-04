import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { findUnit, unitSets } from '../src/lib/math-catalog.ts';
import { MAX_SET_PROBLEMS } from '../src/lib/math-attempts.ts';
import { evalExpression, formulaChoiceLabel, formulaChoiceTex, formulaInstruction, formulaQuestionTex, solutionTex, splitTop } from '../src/lib/math-formula.ts';

// What a learner can read off a drawn graph (kind "graph"): the reviewer gets this
// instead of the formula, so it checks the answer from the picture alone.
export function graphReading(p) {
  const round = v => Math.round(v * 100) / 100;
  const inWindow = (x, y) => Number.isFinite(y) && Math.abs(y) <= 6.5;
  if (p.which === 'region') {
    const [lhs, rhs, op] = splitTop(p.question, ';').map(part => part.trim());
    const test = { '<': v => v < 0, '>': v => v > 0, '<=': v => v <= 0, '>=': v => v >= 0 }[op];
    const rows = [];
    for (let j = 12; j >= -12; j--) rows.push(`${String(j / 2).padStart(4)} ${Array.from({ length: 25 }, (_, i) => test(evalExpression(lhs, { x: (i - 12) / 2, y: j / 2 }) - evalExpression(rhs, { x: (i - 12) / 2, y: j / 2 })) ? '#' : '.').join('')}`);
    return `x=-6..6（0.5刻み）、y=6..-6（0.5刻み）の各点が色つきの領域内なら # 。境界は${op.includes('=') ? '実線（領域に含む）' : '破線（領域に含まない）'}。\n${rows.join('\n')}`;
  }
  if (p.which === 'circle') {
    const [center, radius] = splitTop(p.question, ';');
    const [cx, cy] = splitTop(center, ',').map(part => evalExpression(part)), r = evalExpression(radius);
    const points = [];
    for (let i = -12; i <= 12; i++) { const x = i / 2, d = r * r - (x - cx) ** 2; if (d >= 0) points.push(`(${x}, ${round(cy + Math.sqrt(d))})${d > 0 ? `(${x}, ${round(cy - Math.sqrt(d))})` : ''}`); }
    return `円周上の点（x を0.5刻み、y は小数第2位までの近似値）: ${points.join(' ')}`;
  }
  const xs = p.which === 'trig' ? Array.from({ length: 17 }, (_, i) => ((i - 8) * Math.PI) / 4) : Array.from({ length: 25 }, (_, i) => (i - 12) / 2);
  const points = xs.map(x => [x, evalExpression(p.question, { x })]).filter(([x, y]) => inWindow(x, y));
  return `曲線上の点（${p.which === 'trig' ? 'x = kπ/4' : 'x を0.5刻み'}、y は小数第2位までの近似値）: ${points.map(([x, y]) => `(${p.which === 'trig' ? `${round(x / Math.PI)}π` : x}, ${round(y)})`).join(' ')}`;
}

// What a figure problem's drawing shows, in words, for the blind review (single-quoted parts are the marked values).
export function figureReading(p) {
  const v = p.question.split(',').map(part => evalExpression(part));
  switch (p.which) {
    case 'rect-area': return `長方形。横 ${v[0]} cm、縦 ${v[1]} cm。`;
    case 'tri-area': return `三角形。底辺 ${v[0]} cm、底辺に対する高さ ${v[1]} cm。`;
    case 'para-area': return `平行四辺形。底辺 ${v[0]} cm、高さ ${v[1]} cm。`;
    case 'trap-area': return `台形。上底 ${v[0]} cm、下底 ${v[1]} cm、高さ ${v[2]} cm。`;
    case 'cuboid-volume': return `直方体。横 ${v[0]} cm、奥行き ${v[1]} cm、高さ ${v[2]} cm。`;
    case 'circle-circumference': case 'circle-area': return `円。半径 ${v[0]} cm。${v[1] ? `円周率は ${v[1]}。` : ''}`;
    case 'prism-volume': return `三角柱。底面は底辺 ${v[0]} cm、高さ ${v[1]} cm の三角形で、柱の高さ（長さ）は ${v[2]} cm。`;
    case 'cylinder-volume': return `円柱。底面の半径 ${v[0]} cm、高さ ${v[1]} cm。${v[2] ? `円周率は ${v[2]}。` : ''}`;
    case 'cone-volume': return `円錐。底面の半径 ${v[0]} cm、高さ ${v[1]} cm。`;
    case 'sphere-volume': case 'sphere-surface': return `球。半径 ${v[0]} cm。`;
    case 'angle-triangle': return `三角形。2つの角が ${v[0]}°、${v[1]}°。残りの角が x。`;
    case 'angle-quad': return `四角形。3つの角が ${v[0]}°、${v[1]}°、${v[2]}°。残りの角が x。`;
    case 'parallel-vertical': return `平行な2直線 ℓ、m に1本の直線が交わっている。上の交点で、右上の角が ${v[0]}°。同じ交点の対頂角（左下の角）が x。`;
    case 'parallel-corresponding': return `平行な2直線 ℓ、m に1本の直線が交わっている。上の交点の右上の角が ${v[0]}°。下の交点の右上の角（同位角）が x。`;
    case 'parallel-alternate': return `平行な2直線 ℓ、m に1本の直線が交わっている。上の交点の、直線 ℓ の下側で交わる直線の右側の角が ${v[0]}°。下の交点の、直線 m の上側で交わる直線の左側の角（錯角）が x。`;
    case 'parallel-cointerior': return `平行な2直線 ℓ、m に1本の直線が交わっている。上の交点の、ℓ の下側で交わる直線の右側の角が ${v[0]}°。下の交点の、m の上側で交わる直線の右側の角（同側内角）が x。`;
    case 'polygon-interior-sum': return `${v[0]} 角形。内角の和を S とする。`;
    case 'polygon-exterior': return `正 ${v[0]} 角形。1つの頂点での外角が x。`;
    case 'polygon-each-interior': return `正 ${v[0]} 角形。1つの内角が x。`;
    case 'sector-arc': case 'sector-area': return `おうぎ形。半径 ${v[0]} cm、中心角 ${v[1]}°。`;
    case 'inscribed-angle': return `円 O の円周上に点 A、B、C。弧 AB（C を含まない側）に対する中心角 ∠AOB が ${v[0]}°。円周角 ∠ACB が x。`;
    case 'inscribed-same-arc': return `円周上の4点 A、B、C、D。C、D は弧 AB に対して同じ側にある。∠ACB = ${v[0]}°、∠ADB = x。`;
    case 'inscribed-diameter': return `AB は円の直径、C は円周上の点。∠CAB = ${v[0]}°、∠ABC = x。`;
    case 'similar-side': return `相似な△ABC と△DEF。AB = ${v[0]}、DE = ${v[1]}（対応する辺）、BC = ${v[2]}、EF = x（対応する辺）。`;
    case 'similar-area': return `相似な2つの三角形。対応する辺が ${v[0]} と ${v[1]}、小さいほうの面積 ${v[2]}。大きいほうの面積を求める。`;
    case 'power-chord': return `円の2つの弦 AB、CD が内部の点 P で交わる。PA = ${v[0]}、PB = ${v[1]}、PC = ${v[2]}、PD = x。`;
    case 'distance': return `座標平面上の2点 A(${v[0]}, ${v[1]})、B(${v[2]}, ${v[3]})。`;
    case 'centroid': return `座標平面上の三角形 ABC。A(${v[0]}, ${v[1]})、B(${v[2]}, ${v[3]})、C(${v[4]}, ${v[5]})。`;
    case 'clock-read': return `アナログ時計。短針は ${v[0]} と ${v[0] % 12 + 1} の間（${v[0]}時${v[1]}分の位置）、長針は ${v[1] / 5} を指している（${v[1]}分）。`;
    case 'prism-faces': case 'prism-edges': case 'prism-vertices': return `${v[0]} 角柱（底面が ${v[0]} 角形の角柱）。`;
    case 'pyramid-faces': case 'pyramid-edges': case 'pyramid-vertices': return `${v[0]} 角錐（底面が ${v[0]} 角形の角錐）。`;
    case 'euler-faces': return `凸多面体。頂点の数 v = ${v[0]}、辺の数 e = ${v[1]}。面の数 f を求める（オイラーの多面体定理 v − e + f = 2）。`;
    case 'euler-vertices': return `凸多面体。辺の数 e = ${v[0]}、面の数 f = ${v[1]}。頂点の数 v を求める（v − e + f = 2）。`;
    case 'triangle-type': { const [x, y, z] = [...v].sort((a, b) => a - b); return `三角形。3辺の長さは ${v[0]} cm、${v[1]} cm、${v[2]} cm。${x * x + y * y === z * z ? '直角の印（□）がついている。' : ''}`; }
    case 'quad-type': return `四角形。隣り合う2辺の長さが ${v[0]} cm と ${v[1]} cm で、その間の角が ${v[2]}°。向かい合う辺は平行で、向かい合う辺の長さは等しい。`;
    case 'isosceles-base': return `AB = AC の二等辺三角形。頂角 A が ${v[0]}°。底角 x を求める。`;
    case 'isosceles-apex': return `AB = AC の二等辺三角形。底角が ${v[0]}°。頂角 x を求める。`;
    case 'circle-diameter': return `円。半径 ${v[0]} cm。直径を求める。`;
    case 'circle-radius': return `円。直径 ${v[0]} cm。半径を求める。`;
    case 'protractor': return `分度器。左の 0° の目盛りから数えて、1本目の直線が ${v[0]}°、2本目の直線が ${v[1]}° を指している。2本の直線がつくる角を求める。`;
    case 'parallel-pairs': return `平面上の4本の直線①〜④。水平から測った向きが ${v.map((d, i) => `${'①②③④'[i]}=${d}°`).join('、')}。平行な組（向きが等しい組）の数を求める。`;
    case 'perpendicular-pairs': return `平面上の4本の直線①〜④。水平から測った向きが ${v.map((d, i) => `${'①②③④'[i]}=${d}°`).join('、')}。垂直な組（向きが90°ちがう組）の数を求める。`;
    case 'congruent-side': return `三角形 ABC と三角形 DEF は合同で、A と D、B と E、C と F が対応する。△ABC は AB = ${v[0]}、BC = ${v[1]}、CA = ${v[2]}。△DEF の辺 ${['DE', 'EF', 'FD'][v[3]]} の長さ x を求める。`;
    case 'solid-name': return `立体（${['立方体（6つの面がすべて同じ大きさの正方形）', '直方体（向かい合う面が同じ大きさの長方形）', '円柱', '球'][v[0]]}）の見取図。`;
    case 'box-faces': case 'box-edges': case 'box-vertices': return `直方体（縦・横・高さ ${v[0]}、${v[1]}、${v[2]} cm）。`;
    case 'cube-edge-total': return `立方体。1つの辺の長さ ${v[0]} cm。`;
    case 'box-edge-total': return `直方体。縦 ${v[0]} cm、横 ${v[1]} cm、高さ ${v[2]} cm。`;
    case 'congruence-condition': { const parts = ['辺AB', '辺BC', '辺CA', '角A', '角B', '角C']; return `2つの三角形 ABC と DEF。等しいと印がついている部分: ${v.map((f, i) => f ? parts[i] : null).filter(Boolean).join('、')}（対応する部分）。`; }
    case 'parallelogram-angle': return `平行四辺形 ABCD。∠A = ${v[0]}°。∠B = x を求める。`;
    case 'parallelogram-half': return `平行四辺形 ABCD。対角線 AC = ${v[0]} cm で、対角線 AC と BD は点 O で交わる。AO = x を求める。`;
    case 'parallelogram-perimeter': return `平行四辺形。となり合う2辺が ${v[0]} cm と ${v[1]} cm。`;
    case 'lines-of-symmetry': return `正 ${v[0]} 角形。`;
    case 'scale-actual': return `縮尺 1 : ${v[0]} の地図。地図上の長さは ${v[1]} cm。`;
    case 'scale-enlarge': return `${v[0]} 倍に拡大する。もとの図形の辺の長さは ${v[1]} cm。`;
    case 'move-translate': return `座標平面上の点 P(${v[0]}, ${v[1]})。右へ ${v[2]}、上へ ${v[3]} だけ平行移動する（負の値は逆向き）。`;
    case 'move-reflect-x': case 'move-reflect-y': case 'move-rotate90': case 'move-rotate180': return `座標平面上の点 P(${v[0]}, ${v[1]})。`;
    case 'bar-diff': return `棒グラフ。4本の棒の値は左から ${v.slice(0, 4).join('、')}。棒A は左から ${v[4]} 番目、棒B は左から ${v[5]} 番目。`;
    case 'bar-total': return `棒グラフ。5本の棒の値は左から ${v.join('、')}。`;
    case 'line-change': return `折れ線グラフ。左から順に、点の値は ${v.join('、')}。`;
    case 'pie-count': return `円グラフ。全体（100%）は ${v[0]}。項目の割合は ${v.slice(1, 5).map((x, i) => `${'ABCD'[i]}=${x}%`).join('、')}。`;
    case 'hist-above': return `ヒストグラム。5つの階級の度数は左から ${v.slice(0, 5).join('、')}。階級A は左から ${v[5]} 番目。`;
    case 'table-total': return `2行3列の表。1行目は ${v.slice(0, 3).join('、')}、2行目は ${v.slice(3).join('、')}。`;
    case 'twoway-missing': return `2×2の表。1行目は ${v[0]} と ${v[1]}（合計 ${v[0] + v[1]}）、2行目は ${v[2]} と □（合計 ${v[3]}）。`;
    case 'relative-frequency': return `度数分布表。5つの階級の度数は ${v.slice(0, 5).join('、')}。階級A は ${v[5]} 番目の階級。`;
    case 'box-iqr': case 'box-range': return `箱ひげ図。最小値 ${v[0]}、第1四分位数 ${v[1]}、中央値 ${v[2]}、第3四分位数 ${v[3]}、最大値 ${v[4]}。`;
    case 'quartile-q1': case 'quartile-q3': return `データ（${v.length}個）: ${v.join('、')}。`;
    case 'proportion-table': return `y は x に比例。表: x = ${v.slice(1).join('、')} のとき、y は ${v.slice(1, 4).map(x => v[0] * x).join('、')}、□。`;
    case 'net-cylinder': return `円柱の展開図。底面の半径 ${v[0]} cm、高さ ${v[1]} cm。`;
    case 'net-cuboid': return `直方体の展開図。直方体の縦 ${v[0]} cm、横 ${v[1]} cm、高さ ${v[2]} cm。`;
    case 'space-diagonal': return `直方体。縦 ${v[0]} cm、横 ${v[1]} cm、高さ ${v[2]} cm。頂点 A から最も遠い頂点 G までの対角線。`;
    case 'ceva-ratio': return `△ABC の辺 AB、BC、CA 上の点 F、D、E。AD、BE、CF は1点で交わる。AF : FB = ${v[0]} : ${v[1]}、BD : DC = ${v[2]} : ${v[3]}。`;
    case 'menelaus-ratio': return `△ABC。直線が辺 AB 上の点 F、辺 CA 上の点 E、辺 BC の延長上の点 D を通る。AF : FB = ${v[0]} : ${v[1]}、BD : DC = ${v[2]} : ${v[3]}。`;
    case 'fraction-shaded': return `長方形を横に ${v[0]} 等分し、そのうち ${v[1]} こを色でぬっている。`;
    default: throw new Error(`No reading for figure ${p.which}`);
  }
}

const FORMULA_JA = JSON.parse(readFileSync(new URL('../messages/ja.json', import.meta.url), 'utf8')).App.math.formulaQuiz;
// The Japanese instruction line as learners read it, with its formulas as TeX.
const instructionJa = p => { const { key, tex } = formulaInstruction(p); return FORMULA_JA[key].replace(/<(\w+)><\/\1>/g, (_, tag) => `$${tex[tag]}$`); };

export const root = fileURLToPath(new URL('../', import.meta.url));
// A unit that can hold problems, and optionally one of its sets (item + set number).
export function context(unit, item, setId) {
  const entry = findUnit(unit);
  assert.ok(entry?.kind, `Unknown unit, or one that cannot hold problems: ${unit}`);
  const catalog = unitSets(unit);
  const set = catalog.find(set => set.item === item && set.id === setId);
  if (item !== undefined) assert.ok(set, `Unknown set: ${item} ${setId}`);
  const path = `${root}src/data/math-${unit}.json`;
  const original = readFileSync(path, 'utf8');
  return { kind: entry.kind, catalog, set, path, original, bank: JSON.parse(original) };
}
export const isFormulaUnit = unit => findUnit(unit)?.kind === 'formula';
export const promptFile = name => readFileSync(new URL(`./math-prompts/${name}.md`, import.meta.url), 'utf8');

// Scan complete objects, respecting braces inside JSON strings and fenced output.
// The JSON object holding `key` (an array) in a model's reply. The model sometimes leaves a stray word
// where a closing brace should be ("...\"缸}}]}"), so the reply is tried as it is, then with that run of
// characters dropped, then replaced by a brace.
export function extractJSON(raw, key) {
  const junk = /(["\}])[\u3000-\u9fff\uff00-\uffef]+(?=\s*[\]\}])/g;
  for (const text of [raw, raw.replace(junk, '$1'), raw.replace(junk, '$1}')]) {
    const found = extractFrom(text, key);
    if (found) return found;
  }
  throw new Error(`No JSON object containing ${key} found`);
}
function extractFrom(raw, key) {
  for (let start = 0; start < raw.length; start++) {
    if (raw[start] !== '{') continue;
    let depth = 0, quoted = false, escaped = false;
    for (let end = start; end < raw.length; end++) {
      const c = raw[end];
      if (quoted) {
        if (escaped) escaped = false;
        else if (c === '\\') escaped = true;
        else if (c === '"') quoted = false;
      } else if (c === '"') quoted = true;
      else if (c === '{') depth++;
      else if (c === '}' && --depth === 0) {
        try {
          const result = JSON.parse(raw.slice(start, end + 1));
          if (Array.isArray(result[key])) return result;
        } catch { /* Continue past non-JSON preamble. */ }
        break;
      }
    }
  }
  return null;
}
export function additions(unit, item, setId, bank, generated, count, date = new Date().toISOString().slice(0, 10), tier = 2) {
  assert.equal(generated.problems.length, count, `Expected ${count} problems`);
  const inSet = bank.problems.filter(p => p.item === item && p.setId === setId).length;
  assert.ok(inSet + count <= MAX_SET_PROBLEMS, `${item} set ${setId} would have ${inSet + count} problems; a set holds at most ${MAX_SET_PROBLEMS} (attempts are saved per problem)`);
  const maxId = Math.max(0, ...bank.problems.map(p => {
    const match = p.id.match(new RegExp(`^${unit}-(\\d+)$`));
    assert.ok(match, `Unexpected existing ID: ${p.id}`);
    return Number(match[1]);
  }));
  const maxPosition = Math.max(0, ...bank.problems.filter(p => p.item === item && p.setId === setId).map(p => p.position));
  return generated.problems.map((p, index) => ({
    id: `${unit}-${String(maxId + index + 1).padStart(3, '0')}`, item, setId,
    position: maxPosition + index + 1, tier, published: false, reviewedAt: date,
    ...(unit === 'pythagoras' ? { figure: p.figure } : unit === 'factorization' ? { p: p.p, q: p.q }
      : isFormulaUnit(unit) ? { kind: p.kind, question: p.question, given: p.given ?? null, ...(p.divisor && { divisor: p.divisor }), ...(p.bounds && { bounds: p.bounds }), ...(p.which && { which: p.which }), ...(p.progression && { progression: p.progression }), ...(p.style && { style: p.style }), ...(p.word && { word: p.word }), ...(p.statement && { statement: p.statement }), steps: p.steps }
      : { expression: p.expression, word: p.word }),
    choices: p.choices, answerIndex: p.answerIndex,
  }));
}
export function formatBank(bank) {
  return JSON.stringify(bank, null, 2).replace(/"choices": \[[\s\S]*?\n      \]/g,
    text => `"choices": ${JSON.stringify(JSON.parse(text.slice(text.indexOf('[')))).replaceAll(',', ', ')}`) + '\n';
}
export function saveWork(prefix, content, extension = 'json') {
  const dir = `${root}.math-work`;
  mkdirSync(dir, { recursive: true });
  const path = `${dir}/${prefix}-${new Date().toISOString().replaceAll(':', '-')}-${process.pid}.${extension}`;
  writeFileSync(path, content);
  return path;
}
export function run(command, args, cwd, env = process.env) {
  const result = spawnSync(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', timeout: 660_000, maxBuffer: 16 * 1024 * 1024 });
  if (result.error || result.status !== 0) {
    throw new Error(`${command} failed (${result.status ?? result.signal}): ${result.error?.message ?? ''}\n${result.stderr ?? ''}\n${result.stdout ?? ''}`);
  }
  return result.stdout;
}
const signedTerm = n => `${n < 0 ? '-' : '+'} ${Math.abs(n)}`;
export const factorChoice = ([p, q]) => `(x ${signedTerm(p)})(x ${signedTerm(q)})`;
export const radicalChoice = ([a, b]) => b === 1 ? String(a) : `${a === 1 ? '' : a}√${b}`;
export function blindProblem(unit, p) {
  if (unit === 'pythagoras') return {
    id: p.id, type: 'pythagoras',
    figure: { rightAngle: p.figure.rightAngle, given: p.figure.given.map(side => {
      const [a, b] = [...side].map(v => p.figure.points[v]);
      return { side, length: Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) };
    }), unknown: p.figure.unknown }, choices: p.choices.map(radicalChoice),
  };
  if (unit === 'factorization') {
    const a = p.p + p.q, b = p.p * p.q;
    return { id: p.id, type: 'factorization', trinomial: `x^2${a ? ` ${signedTerm(a).replace(/ 1$/, ' ')}x` : ''}${b ? ` ${signedTerm(b)}` : ''}`, choices: p.choices.map(factorChoice) };
  }
  // The reviewer sees the formulas as learners do, rendered (÷ and fraction bars, not ':' and '/').
  // A formula word problem: the reviewer reads the prose (not the hidden expression) and picks the answer.
  if (isFormulaUnit(unit) && p.word) return {
    id: p.id, type: 'formula', kind: 'word', word: Object.fromEntries(['ja', 'en', 'zh'].map(locale => [locale, { prompt: p.word[locale].prompt, unit: p.word[locale].unit }])),
    choices: p.choices.map(choice => formulaChoiceTex(p, choice)),
  };
  if (isFormulaUnit(unit) && p.kind === 'graph') return {
    id: p.id, type: 'formula', kind: 'graph', instruction: instructionJa(p), figure: graphReading(p),
    choices: p.choices.map(choice => formulaChoiceTex(p, choice)),
  };
  if (p.kind === 'statement') return { id: p.id, type: 'statement', statement: { ja: { prompt: p.statement.ja.prompt, options: p.statement.ja.options }, en: { prompt: p.statement.en.prompt, options: p.statement.en.options }, zh: { prompt: p.statement.zh.prompt, options: p.statement.zh.options } }, choices: ['1', '2', '3', '4'] };
  if (p.kind === 'figure') return { id: p.id, type: 'formula', kind: 'figure', instruction: instructionJa(p), figure: figureReading(p), choices: p.choices.map(choice => formulaChoiceLabel(p, choice) ? FORMULA_JA[formulaChoiceLabel(p, choice)] : formulaChoiceTex(p, choice)) };
  if (isFormulaUnit(unit)) return {
    id: p.id, type: 'formula', kind: p.kind, instruction: instructionJa(p),
    question: formulaQuestionTex(p), given: p.given && p.kind !== 'sets' ? solutionTex(p.given, 'x') : undefined,
    ...(p.divisor && { divisor: p.divisor }), ...(p.bounds && { bounds: p.bounds }), ...(p.which && { which: p.which }), ...(p.progression && { progression: p.progression }),
    choices: p.choices.map(choice => formulaChoiceLabel(p, choice) ? FORMULA_JA[formulaChoiceLabel(p, choice)] : formulaChoiceTex(p, choice)),
  };
  if (p.word !== null) return { id: p.id, type: 'word', word: Object.fromEntries(['ja', 'en', 'zh'].map(locale => [locale, { prompt: p.word[locale].prompt, unit: p.word[locale].unit }])), choices: p.choices };
  return { id: p.id, type: 'expression', expression: p.expression, choices: p.choices };
}
export function compareReviews(unit, problems, result) {
  assert.equal(result.reviews.length, problems.length, 'Review count mismatch');
  const ids = new Set();
  for (const review of result.reviews) {
    assert.ok(problems.some(p => p.id === review.id) && !ids.has(review.id), `Unknown or duplicate review ID: ${review.id}`);
    ids.add(review.id);
    assert.ok(Array.isArray(review.issues) && review.issues.every(x => typeof x === 'string'), 'Invalid issues');
    assert.ok(Number.isInteger(review.choiceIndex), 'Invalid choiceIndex');
    assert.ok(review.wordExpression === null || typeof review.wordExpression === 'string', 'Invalid wordExpression');
  }
  return problems.map(p => {
    const review = result.reviews.find(r => r.id === p.id);
    const answer = unit === 'pythagoras' ? radicalChoice(p.choices[p.answerIndex]) : unit === 'factorization' ? factorChoice(p.choices[p.answerIndex]) : p.choices[p.answerIndex];
    // Formula answers can be written many ways; the chosen index decides.
    const matches = review.choiceIndex === p.answerIndex && (isFormulaUnit(unit) || review.answer === answer);
    const issues = [...review.issues];
    if (p.word && !review.wordExpression?.trim()) issues.push('文章題の立式がありません');
    return { id: p.id, matches, answer: review.answer, choiceIndex: review.choiceIndex, wordExpression: review.wordExpression, issues };
  });
}
