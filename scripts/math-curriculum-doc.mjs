import { readFileSync, writeFileSync } from 'node:fs';
import { MATH_CATALOG } from '../src/lib/math-catalog.ts';
import { JP_GRADES, jpGrade } from '../src/lib/math-curriculum-jp.ts';

// Writes docs/plans/math-curriculum-jp.md: every learning item by its grade in
// Japan's curriculum, as a checklist against the Course of Study, with what each
// item still needs before problems can be made. Run after changing the catalog
// or the grade table; tests/unit/math-curriculum-doc.test.mjs checks the file is
// up to date.   node scripts/math-curriculum-doc.mjs

// What an item without a rule yet needs: a unit's default, overridden per item.
//   A: only a rule and a prompt (an existing problem shape fits)
//   B: a wider formula grammar or a new problem kind (functions, factor, inequalities, calculus, ...)
//   C: text in three languages (word problems, knowledge, proof steps, construction steps)
//   D: a figure or graph drawn on the page
export const NEEDS = {
  addition: 'A', multiplication: 'A', arith: 'A',
  unknowns: 'B', 'unknowns/letters': 'A', 'place-value': 'C', time: 'D', 'time/elapsed': 'C',
  decimal: 'A', fraction: 'A', 'fraction/unit-fractions': 'D', 'fraction/meaning': 'D', 'fraction/mixed': 'B',
  divisors: 'B', rounding: 'B', ratio: 'C', measurement: 'D', 'measurement/length-capacity': 'C', 'measurement/weight': 'C', 'measurement/area-units': 'C',
  shapes: 'D', symmetry: 'D', data: 'A', 'data/median-range': 'B', graphs: 'D', counting: 'C', rate: 'C', relations: 'C', 'relations/change': 'D',
  signed: 'A', exponents: 'A', 'exponents/scientific': 'B', expression: 'A', 'expression/rearrange': 'B',
  'linear-equation': 'A', 'linear-equation/word-problems': 'C', 'linear-equation/proportion': 'B',
  simultaneous: 'A', 'simultaneous/word-problems': 'C', 'linear-function': 'B', 'square-function': 'B', 'square-function/graph': 'D',
  inequality: 'B', expansion: 'A', factorization: 'B', factoring: 'A', sqrt: 'A', 'sqrt/rational-irrational': 'C', prime: 'B', integers: 'B',
  pythagoras: 'D', probability: 'C', quadratic: 'A', 'quadratic/discriminant': 'B',
  identities: 'B', 'identities/binomial': 'A', 'identities/inequality-proof': 'C', 'polynomial-equations': 'A',
  'quadratic-function': 'B', sequence: 'B', 'sequence/induction': 'C', trig: 'B', 'exp-log': 'B', conic: 'B',
  combinatorics: 'B', 'combinatorics/probability': 'C', 'combinatorics/conditional': 'C', 'combinatorics/independent': 'C', distributions: 'B',
  limit: 'B', derivative: 'B', integral: 'B', complex: 'B', 'coordinate-geometry': 'B', 'coordinate-geometry/region': 'D', vector: 'B',
  matrix: 'B', 'linear-system': 'B', 'vector-space': 'B', 'linear-map': 'B', eigen: 'B', 'inner-product': 'B',
  angles: 'D', congruence: 'D', 'circle-solid': 'D', similarity: 'D', transformations: 'D', 'geometric-reasoning': 'C',
  'triangle-trig': 'B', 'triangle-properties': 'D', quartiles: 'D', sampling: 'C', frequency: 'D', statistics: 'B', 'statistics/hypothesis': 'C',
  inference: 'C', sets: 'C', logic: 'C', mapping: 'C', series: 'B', 'improper-integral': 'B', multivariable: 'B', ode: 'B',
  'univ-calculus': 'C',
};

// Parts of the Course of Study the drills leave out, by grade.
const LEFT_OUT = {
  e3: ['そろばん（計算の道具の扱いで、4択の計算問題とは別）'],
  e4: ['そろばん'],
  'h-b': ['数学と社会生活（課題学習）'],
};

const DOMAINS = { number: '数と計算', algebra: '式と方程式', functions: '関数・変化と関係', geometry: '図形と測定', data: 'データと確率', logic: '集合と論理', 'linear-algebra': '線形代数', calculus: '微分積分' };

export function render() {
  const ja = JSON.parse(readFileSync(new URL('../messages/ja.json', import.meta.url), 'utf8')).App.math;
  const rows = Object.fromEntries(JP_GRADES.map(grade => [grade, []]));
  for (const unit of MATH_CATALOG) for (const item of unit.items) {
    const key = `${unit.id}/${item.id}`;
    const ready = item.sets.some(set => set.rule);
    const needs = ready ? '✅' : NEEDS[key] ?? NEEDS[unit.id];
    if (!needs) throw new Error(`No NEEDS entry for ${key} (or its unit) in scripts/math-curriculum-doc.mjs`);
    rows[jpGrade(unit.id, item.id)].push({ domain: unit.domain, key, name: `${ja.units[unit.id].title} / ${ja.units[unit.id].items[item.id].title}`, needs });
  }
  const order = Object.keys(DOMAINS);
  const lines = [
    '# 学習指導要領と学習項目の対応（日本）', '',
    '<!-- node scripts/math-curriculum-doc.mjs が生成する。直接編集しない。 -->', '',
    '数学ドリルの学習項目が、日本の学習指導要領（小中は2017年告示、高校は2018年告示）の内容をどこまで覆っているかのチェックリスト。学年は `src/lib/math-curriculum-jp.ts`、状態はカタログ（`src/lib/math-catalog.ts`）から作る。', '',
    '## 使い方', '',
    '- 学習項目を足すとき: カタログと学年表に足し、`node scripts/math-curriculum-doc.mjs` でこの表を作り直す（作り直していないと `npm test` が失敗する）。1つの学習項目が2学年にまたがるなら分ける。',
    '- 抜けを探すとき: 学習指導要領（または教科書の目次）を学年ごとに上から読み、各内容がどの行に当たるかを確かめる。当たる行がなければ学習項目を足す。',
    '- 証明と作図も4択にする（根拠や次の一手・手順を選ぶ、誤りを見つける、できる図形を選ぶ）。',
    '',
    '状態の列:',
    '',
    '| 状態 | 意味 |', '| --- | --- |',
    '| ✅ | 今すぐ問題を生成できる（出題ルールと生成の指示文がある） |',
    '| A | 出題ルールと指示文を書けば作れる（今の問題の形で足りる） |',
    '| B | 数式の書き方か問題の種類を広げる必要がある（関数、因数分解・不等式・微分積分の形 など） |',
    '| C | 3言語の文章が必要（文章題、知識、証明や作図の手順） |',
    '| D | 図やグラフの描画が必要 |',
    '',
    '大学は学習指導要領がないため、理工系の一般的な順番（1・2年）を目安にしている。', '',
  ];
  for (const grade of JP_GRADES) {
    lines.push(`## ${ja.grades[grade]}（\`${grade}\`）`, '', '| 領域 | 学習項目 | 状態 | キー |', '| --- | --- | --- | --- |');
    for (const row of rows[grade].sort((a, b) => order.indexOf(a.domain) - order.indexOf(b.domain))) {
      lines.push(`| ${DOMAINS[row.domain]} | ${row.name} | ${row.needs} | \`${row.key}\` |`);
    }
    if (LEFT_OUT[grade]) lines.push('', `扱わないもの: ${LEFT_OUT[grade].join('、')}`);
    lines.push('');
  }
  return lines.join('\n');
}

export const DOC = new URL('../docs/plans/math-curriculum-jp.md', import.meta.url);

if (import.meta.url === `file://${process.argv[1]}`) {
  writeFileSync(DOC, render());
  console.log(`Wrote ${DOC.pathname}`);
}
