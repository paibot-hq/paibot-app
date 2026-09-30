import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MATH_CATALOG } from '../src/lib/math-catalog.ts';
import { extractJSON, run, saveWork, root } from './math-pipeline.mjs';

// Writes src/data/item-key-points.json: each learning item's key formulas, as
// equations in the formula grammar. An LLM proposes them; verify_key_points.py
// keeps only those SymPy proves (both sides equal), so a wrong formula is never shown.
//   node scripts/math-key-points.mjs [unit ...]
const wanted = process.argv.slice(2);
const path = new URL('../src/data/item-key-points.json', import.meta.url);
const ja = JSON.parse(readFileSync(new URL('../messages/ja.json', import.meta.url), 'utf8')).App.math.units;
const store = JSON.parse(readFileSync(path, 'utf8'));
const rows = MATH_CATALOG.filter(unit => !wanted.length || wanted.includes(unit.id)).flatMap(unit => unit.items.map(item => ({ unit: unit.id, item: item.id, unitTitle: ja[unit.id].title, title: ja[unit.id].items[item.id].title, description: ja[unit.id].items[item.id].description ?? '' })));
const temp = mkdtempSync(join(tmpdir(), 'math-key-points-'));
try {
  for (let start = 0; start < rows.length; start += 25) {
    const group = rows.slice(start, start + 25);
    const prompt = `数学ドリルの学習項目それぞれに、覚えておくべき公式・法則を「左辺 = 右辺」の等式で最大4つ挙げる。等式を式として書ける項目だけでよい（意味の説明だけの項目は空の配列）。
書き方: 数は整数か小数、文字は a〜z の1文字（i は虚数単位なので使わない、pi は円周率）、演算は + - * / ^ と ( )、かけ算は必ず * を書く、関数は sqrt(x)、sin(x)、cos(x)、tan(x)、abs(x)、log(真数, 底)、C(n, k)、P(n, k)。等号は1つだけ。例: "(a + b)^2 = a^2 + 2*a*b + b^2"、"sin(x)^2 + cos(x)^2 = 1"、"a^m * a^n = a^(m + n)"。
恒等式（どの文字についても常に成り立つ等式）に加えて、方程式の解の公式は「方程式 => 文字 = 式」の形で書ける（例: 二次方程式の解の公式は "a*x^2 + b*x + c = 0 => x = (-b ± sqrt(b^2 - 4*a*c))/(2*a)"。=> は1つだけ、その式が方程式の解であること。1つの式に ± を1回だけ使え、+ と - の両方で成り立つこと）。それ以外の条件つきの公式は書かない。コマンドやツールは使わず JSON だけを出力する: {"points":[{"unit":"","item":"","formulas":["..."]}]}
項目:
${JSON.stringify(group.map(row => ({ unit: row.unit, item: row.item, 単元: row.unitTitle, 項目: row.title })), null, 2)}`;
    let raw = '';
    for (let attempt = 0; attempt < 3 && !raw.trim(); attempt++) raw = run('agy', ['--sandbox', '--print-timeout', '10m', '-p', prompt], temp);
    let result;
    try { result = extractJSON(raw, 'points'); } catch (error) { throw new Error(`${error.message}\nRaw: ${saveWork('key-points-raw', raw, 'txt')}`); }
    const candidates = Object.fromEntries(result.points.filter(point => Array.isArray(point.formulas) && point.formulas.length).map(point => [`${point.unit}/${point.item}`, point.formulas]));
    const file = join(temp, 'candidates.json');
    writeFileSync(file, JSON.stringify(candidates));
    const checked = JSON.parse(run('uv', ['run', '--locked', 'python', `${root}scripts/verify_key_points.py`, file], root).trim().split('\n').pop());
    Object.assign(store, checked.ok);
    writeFileSync(path, JSON.stringify(store, null, 2) + '\n');
    console.log(`${start + group.length}/${rows.length}: ${Object.keys(checked.ok).length} items with verified formulas, ${checked.bad.length} formulas dropped`);
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { rmSync(temp, { recursive: true, force: true }); }
