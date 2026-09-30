import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import katex from 'katex';
import { MATH_CATALOG } from '../src/lib/math-catalog.ts';
import { extractJSON, run, saveWork } from './math-pipeline.mjs';

// Writes src/data/item-formulas.json: each learning item's standard definitions
// and formulas as TeX, the ones SymPy cannot prove as identities (S = ah/2,
// E(X) = Σ x_i p_i, ...). An LLM writes them, KaTeX must render them, and Codex
// checks each for mathematical mistakes; flagged ones are dropped.
//   node scripts/math-formulas.mjs [unit ...]
const wanted = process.argv.slice(2);
const path = new URL('../src/data/item-formulas.json', import.meta.url);
const ja = JSON.parse(readFileSync(new URL('../messages/ja.json', import.meta.url), 'utf8')).App.math.units;
const store = JSON.parse(readFileSync(path, 'utf8'));
const rows = MATH_CATALOG.filter(unit => !wanted.length || wanted.includes(unit.id)).flatMap(unit => unit.items.map(item => ({
  unit: unit.id, item: item.id, unitTitle: ja[unit.id].title, title: ja[unit.id].items[item.id].title, description: ja[unit.id].items[item.id].description,
})));
const temp = mkdtempSync(join(tmpdir(), 'math-formulas-'));
const ask = (tool, prompt) => {
  let raw = '';
  for (let attempt = 0; attempt < 3 && !raw.trim(); attempt++) raw = tool === 'agy' ? run('agy', ['--sandbox', '--print-timeout', '10m', '-p', prompt], temp) : run('codex', ['exec', '--sandbox', 'read-only', '--skip-git-repo-check', prompt], temp);
  return raw;
};
const renders = tex => { try { katex.renderToString(tex, { throwOnError: true }); return true; } catch { return false; } };
try {
  for (let start = 0; start < rows.length; start += 20) {
    const group = rows.slice(start, start + 20);
    const generated = ask('agy', `数学ドリルの学習項目それぞれに、覚えておくとよい定義・公式・定理を TeX で最大4つ挙げる。式で書ける項目だけでよい（手順や考え方だけの項目は空の配列）。
- KaTeX で表示できる TeX を書く（\\frac、\\sqrt、\\sum、\\int、\\sin、\\pi、\\bar{x}、\\begin{cases} など）。日本語は使わず、式だけにする。
- 標準的で正しい内容だけを書く。条件が必要な公式は式の中で条件がわかる形にする（例: a^2 + b^2 = c^2）。1つの式は短く、160文字以内。
- コマンドやツールは使わず JSON だけを出力する: {"formulas":[{"unit":"","item":"","tex":["..."]}]}
項目:
${JSON.stringify(group.map(row => ({ unit: row.unit, item: row.item, 単元: row.unitTitle, 項目: row.title, 説明: row.description })), null, 2)}`);
    let result;
    try { result = extractJSON(generated, 'formulas'); } catch (error) { throw new Error(`${error.message}\nRaw: ${saveWork('formulas-raw', generated, 'txt')}`); }
    const candidates = result.formulas.map(entry => ({ key: `${entry.unit}/${entry.item}`, tex: (Array.isArray(entry.tex) ? entry.tex : []).filter(tex => typeof tex === 'string' && tex.trim() && tex.length <= 160 && renders(tex)) })).filter(entry => entry.tex.length);
    // Codex checks every formula; the ones it flags are dropped.
    let flagged = new Set();
    if (candidates.length) {
      const review = ask('codex', `次は数学ドリルの学習項目ごとの定義・公式（TeX）。数学的に誤っているもの、条件が抜けて誤解を招くもの、その項目と関係のないものだけを指摘する。問題がなければ issues は空。出力は JSON のみ: {"issues":[{"key":"unit/item","tex":"指摘した TeX そのまま","problem":""}]}。コマンドやツールは使わない。\n${JSON.stringify(candidates.map(entry => ({ key: entry.key, 項目: rows.find(row => `${row.unit}/${row.item}` === entry.key)?.title, tex: entry.tex })), null, 2)}`);
      try { flagged = new Set(extractJSON(review, 'issues').issues.map(issue => `${issue.key}\n${issue.tex}`)); } catch { throw new Error(`Unparseable review: ${saveWork('formulas-review', review, 'txt')}`); }
      for (const issue of extractJSON(review, 'issues').issues) console.log(`dropped ${issue.key}: ${issue.tex} — ${issue.problem}`);
    }
    for (const entry of candidates) {
      const kept = entry.tex.filter(tex => !flagged.has(`${entry.key}\n${tex}`));
      if (kept.length) store[entry.key] = kept; else delete store[entry.key];
    }
    writeFileSync(path, JSON.stringify(store, null, 2) + '\n');
    console.log(`${start + group.length}/${rows.length}: ${candidates.length} items with formulas`);
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { rmSync(temp, { recursive: true, force: true }); }
