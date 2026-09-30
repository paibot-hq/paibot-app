import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import katex from 'katex';
import { MATH_CATALOG } from '../src/lib/math-catalog.ts';
import { extractJSON, run, saveWork } from './math-pipeline.mjs';

// Writes src/data/item-formulas.json: for each learning item, the well-known
// formulas and rules worth knowing, as TeX (shown under "要点" on the item page).
// An LLM writes them; they are not machine-verified, they only have to render in KaTeX.
//   node scripts/math-formulas.mjs [unit ...]
const wanted = process.argv.slice(2);
const path = new URL('../src/data/item-formulas.json', import.meta.url);
const ja = JSON.parse(readFileSync(new URL('../messages/ja.json', import.meta.url), 'utf8')).App.math.units;
const store = JSON.parse(readFileSync(path, 'utf8'));
const rows = MATH_CATALOG.filter(unit => !wanted.length || wanted.includes(unit.id)).flatMap(unit => unit.items.map(item => ({
  unit: unit.id, item: item.id, unitTitle: ja[unit.id].title, title: ja[unit.id].items[item.id].title, description: ja[unit.id].items[item.id].description,
})));
const temp = mkdtempSync(join(tmpdir(), 'math-formulas-'));
const renders = tex => { try { katex.renderToString(tex, { throwOnError: true }); return true; } catch { return false; } };
try {
  for (let start = 0; start < rows.length; start += 20) {
    const group = rows.slice(start, start + 20);
    const prompt = `数学ドリルの学習項目それぞれに、有名な公式や「ここを知っておくとよい」という決まりを TeX で書く。
- その項目で最も大事で有名なものを2〜4つ。重複させない（同じ内容を文字だけ変えて繰り返さない、順序だけ違う式を並べない）。
- 公式・定義・定理のように式で書けるものだけ。手順や考え方だけの項目は空の配列。
- 一般的な形にできるものは、具体的な数の例（0.1 = \\frac{1}{10}、\\frac{2}{3} + \\frac{1}{4} のような式）ではなく、文字を使った一般の形で書く（例: \\frac{a}{b} = a \\div b、\\frac{a}{c} + \\frac{b}{c} = \\frac{a+b}{c}、\\text{(平均)} のような文章ではなく式）。一般の形にできない項目（九九のような個別の事実）だけは具体的な式でよい。
- KaTeX で表示できる TeX。日本語は使わず式だけにする。必要な条件は式の中に書いてよい（例: a^2 + b^2 = c^2、\\frac{a}{b} \\quad (b \\neq 0)）。1つは短く、120文字以内。
- コマンドやツールは使わず JSON だけを出力する: {"formulas":[{"unit":"","item":"","tex":["..."]}]}
項目:
${JSON.stringify(group.map(row => ({ unit: row.unit, item: row.item, 単元: row.unitTitle, 項目: row.title, 説明: row.description })), null, 2)}`;
    let raw = '';
    for (let attempt = 0; attempt < 3 && !raw.trim(); attempt++) raw = run('agy', ['--sandbox', '--print-timeout', '10m', '-p', prompt], temp);
    let result;
    try { result = extractJSON(raw, 'formulas'); } catch (error) { throw new Error(`${error.message}\nRaw: ${saveWork('formulas-raw', raw, 'txt')}`); }
    for (const entry of result.formulas) {
      const key = `${entry.unit}/${entry.item}`;
      const kept = [...new Set((Array.isArray(entry.tex) ? entry.tex : []).filter(tex => typeof tex === 'string' && tex.trim() && tex.length <= 160 && renders(tex)).map(tex => tex.trim()))].slice(0, 4);
      if (kept.length) store[key] = kept; else delete store[key];
    }
    writeFileSync(path, JSON.stringify(store, null, 2) + '\n');
    console.log(`${start + group.length}/${rows.length}`);
  }
  console.log(`${Object.keys(store).length} items have formulas`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { rmSync(temp, { recursive: true, force: true }); }
