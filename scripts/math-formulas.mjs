import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import katex from 'katex';
import { MATH_CATALOG } from '../src/lib/math-catalog.ts';
import { jpGrade } from '../src/lib/math-curriculum-jp.ts';
import { extractJSON, run, saveWork } from './math-pipeline.mjs';

// Writes src/data/item-formulas.json: for each learning item, the key points worth
// knowing (shown under "要点" on the item page): a well-known formula or rule as TeX
// with a short explanation in ja, en and zh, or a note alone ("watch out for ...").
// An LLM writes them; nothing is machine-verified except that the TeX renders.
//   node scripts/math-formulas.mjs [--rewrite] [unit ...]
// --rewrite keeps every point and its formula as they are and only rewrites the
// explanations in the plain style below.
const rewrite = process.argv.includes('--rewrite');
const wanted = process.argv.slice(2).filter(arg => arg !== '--rewrite');
const grades = JSON.parse(readFileSync(new URL('../messages/ja.json', import.meta.url), 'utf8')).App.math.grades;
// How explanations are written, for new points and --rewrite alike.
const STYLE = `説明の書き方（やさしく）:
- 読み手はその学年（「学年」）の生徒。初めて習う人にもわかる、やさしい言葉で書く。ja は「です・ます」。
- 1〜2文。まず「何がわかる式か・いつ使うか」を言い、式の文字（a, b, θ など）が何を表すかを添える。
- 難しい言い回し（「〜を満たす」「非負」「同周期」「頻出」など）や、その学年で習わない用語を避け、ふつうの言葉に言いかえる。
- en・zh も同じ内容を同じやさしさで（en は短い平易な英語、zh は简体中文）。各言語 100字/45語程度まで。`;
const path = new URL('../src/data/item-formulas.json', import.meta.url);
const ja = JSON.parse(readFileSync(new URL('../messages/ja.json', import.meta.url), 'utf8')).App.math.units;
const store = JSON.parse(readFileSync(path, 'utf8'));
const seed = (() => { try { return JSON.parse(readFileSync(process.env.SEED_FORMULAS ?? '/nonexistent', 'utf8')); } catch { return {}; } })();
const rows = MATH_CATALOG.filter(unit => !wanted.length || wanted.includes(unit.id)).flatMap(unit => unit.items.map(item => ({
  unit: unit.id, item: item.id, unitTitle: ja[unit.id].title, title: ja[unit.id].items[item.id].title, description: ja[unit.id].items[item.id].description,
  grade: grades[jpGrade(unit.id, item.id)], points: store[`${unit.id}/${item.id}`] ?? [],
  current: (seed[`${unit.id}/${item.id}`] ?? store[`${unit.id}/${item.id}`] ?? []).map(point => point.tex).filter(Boolean),
})));
const temp = mkdtempSync(join(tmpdir(), 'math-formulas-'));
const renders = tex => { try { katex.renderToString(tex, { throwOnError: true }); return true; } catch { return false; } };
const LOCALES = ['ja', 'en', 'zh'];
try {
  for (let start = 0; start < rows.length; start += 15) {
    const group = rows.slice(start, start + 15);
    const prompt = rewrite ? `数学ドリルの学習項目の「要点」の説明文（ja/en/zh）を、やさしく書き直す。
- 要点の数・順番・tex は変えない（tex はそのまま写す）。説明だけを書き直す。内容の誤りがあれば正しく直す。
${STYLE}
- コマンドやツールは使わず JSON だけを出力する: {"points":[{"unit":"","item":"","points":[{"tex":"...","ja":"","en":"","zh":""}]}]}
項目:
${JSON.stringify(group.map(row => ({ unit: row.unit, item: row.item, 単元: row.unitTitle, 項目: row.title, 学年: row.grade, 要点: row.points })), null, 2)}` : `数学ドリルの学習項目それぞれに、「要点」（有名な公式や、ここを知っておくとよいという決まり）を書く。日本語(ja)・英語(en)・中国語(zh)の説明つき。
- 要点は2〜5つ。重複させない（同じ内容を文字だけ変えて繰り返さない、順序だけ違う式を並べない）。
- 式で書けるものは tex に TeX（KaTeX で表示できるもの、日本語は使わず式だけ、160文字以内）を書き、ja/en/zh にその式の意味・使い方・条件を説明する。一般的な形にできるものは、具体的な数の例ではなく文字を使った一般の形で書く。
- 式にならない大事な決まり・注意点（手順のコツ、間違えやすい点、用語の意味）は tex を省いて ja/en/zh の説明だけで書いてよい。手順や考え方が中心の項目は、そうした説明だけでよい。
- 標準的で正しい内容だけを書く。「現在の式」がある項目は、それを残して（誤りがあれば直して）説明をつけ、足りない要点を足す。
${STYLE}
- コマンドやツールは使わず JSON だけを出力する: {"points":[{"unit":"","item":"","points":[{"tex":"...","ja":"","en":"","zh":""}]}]}
項目:
${JSON.stringify(group.map(row => ({ unit: row.unit, item: row.item, 単元: row.unitTitle, 項目: row.title, 学年: row.grade, 説明: row.description, 現在の式: row.current })), null, 2)}`;
    let result;
    for (let attempt = 0; attempt < 3 && !result; attempt++) {
      const raw = run('agy', ['--sandbox', '--print-timeout', '10m', '-p', prompt], temp);
      try { result = extractJSON(raw, 'points'); } catch { if (attempt === 2) throw new Error(`No usable answer: ${saveWork('formulas-raw', raw, 'txt')}`); }
    }
    for (const entry of result.points) {
      const key = `${entry.unit}/${entry.item}`;
      if (!group.some(row => `${row.unit}/${row.item}` === key)) continue;
      const seen = new Set();
      const kept = (Array.isArray(entry.points) ? entry.points : []).filter(point => LOCALES.every(locale => typeof point[locale] === 'string' && point[locale].trim()) && (point.tex === undefined || point.tex === null || point.tex === '' || (typeof point.tex === 'string' && point.tex.length <= 160 && renders(point.tex))))
        .map(point => ({ ...(point.tex ? { tex: point.tex.trim() } : {}), ja: point.ja.trim(), en: point.en.trim(), zh: point.zh.trim() }))
        .filter(point => { const id = point.tex ?? point.ja; if (seen.has(id)) return false; seen.add(id); return true; }).slice(0, 5);
      if (rewrite) {
        const before = store[key] ?? [];
        // Only the wording may change: same points, same formulas, in the same order.
        if (kept.length !== before.length || kept.some((point, index) => (point.tex ?? '') !== (before[index].tex ?? ''))) { console.warn(`${key}: points or formulas changed, kept as before`); continue; }
        store[key] = kept;
        continue;
      }
      if (kept.length) store[key] = kept; else delete store[key];
    }
    writeFileSync(path, JSON.stringify(store, null, 2) + '\n');
    console.log(`${start + group.length}/${rows.length}`);
  }
  console.log(`${Object.keys(store).length} items have key points`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { rmSync(temp, { recursive: true, force: true }); }
