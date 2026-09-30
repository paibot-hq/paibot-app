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
//   node scripts/math-formulas.mjs --typeset    put the math inside existing notes in $...$ (drawn as math)
// --rewrite keeps every point and its formula as they are and only rewrites the
// explanations in the plain style below.
const rewrite = process.argv.includes('--rewrite');
const typeset = process.argv.includes('--typeset');
const wanted = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
const grades = JSON.parse(readFileSync(new URL('../messages/ja.json', import.meta.url), 'utf8')).App.math.grades;
// How explanations are written, for new points and --rewrite alike.
const STYLE = `説明の書き方（一般の大人が読める文章）:
- 読み手は学年を問わない一般の大人。子ども向けの言い回し（「〜しましょう」「〜だよ」）にせず、ふつうの丁寧な文章（「です・ます」）で書く。
- 1〜3文。まず「何がわかる式・決まりか」「いつ使うか」を言い、式の文字（a, b, θ など）が何を表すかを添える。分かりやすい数の例を1つ添えてよい。
- 専門用語は、必要なら残して短く言いかえを添える。「〜を満たす」「非負」「同周期」「頻出」のような堅い言い回しは、ふつうの言葉にする。
- 説明文の中の数式・文字式・指数（x^2、10a、f(x) など）は、TeX にして $...$ で囲む（例: $x^2$、$10a + b$）。ふつうの言葉と、数だけの言い回し（2桁）はそのまま。
- en・zh も同じ内容を同じ読みやすさで（en は平易な英語、zh は简体中文）。各言語 150字/60語程度まで。`;
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
// Math in a note (x^2, X=x^2, 10a, f(x)) must be inside $...$; this finds notes that have some outside.
const looksLikeMath = text => /[\^_\\=]|\b\d+[a-z]\b|[A-Za-z]\([A-Za-z0-9,]+\)|[A-Za-z]\d/.test(text.replace(/\$[^$]+\$/g, ''));
try {
  if (typeset) {
    const todo = Object.entries(store).flatMap(([key, points]) => points.map((point, index) => ({ key, index, point }))).filter(({ point }) => LOCALES.some(locale => looksLikeMath(point[locale])));
    for (let start = 0; start < todo.length; start += 25) {
      const group = todo.slice(start, start + 25);
      const prompt = `数学ドリルの要点の説明文（日本語 ja・英語 en・中国語 zh）。文章の中の数式・文字式・指数・数と文字の組（x^2、X=x^2、10a、f(x)、a^2 - b^2 など）を、TeX にして $...$ で囲む。ふつうの言葉や、数だけの言い回し（2桁、3つ）はそのまま。文章の意味・言い回しは変えない。すでに $...$ の部分はそのまま。コマンドやツールは使わず JSON だけを出力する: {"notes":[{"id":0,"ja":"","en":"","zh":""}]}
${JSON.stringify(group.map(({ point }, id) => ({ id, ja: point.ja, en: point.en, zh: point.zh })), null, 2)}`;
      let result;
      for (let attempt = 0; attempt < 3 && !result; attempt++) { try { result = extractJSON(run('agy', ['--sandbox', '--print-timeout', '10m', '-p', prompt], temp), 'notes'); } catch { /* ask again */ } }
      if (!result) throw new Error(`typeset batch ${start / 25 + 1}: no usable answer`);
      for (const note of result.notes) {
        const target = group[note.id]?.point;
        if (!target) continue;
        const valid = LOCALES.every(locale => typeof note[locale] === 'string' && note[locale].trim() && (note[locale].match(/\$/g) ?? []).length % 2 === 0 && [...note[locale].matchAll(/\$([^$]+)\$/g)].every(([, tex]) => renders(tex)));
        if (valid) for (const locale of LOCALES) target[locale] = note[locale].trim();
      }
      writeFileSync(path, JSON.stringify(store, null, 2) + '\n');
      console.log(`typeset ${Math.min(start + 25, todo.length)}/${todo.length}`);
    }
    const left = Object.values(store).flat().filter(point => LOCALES.some(locale => /[\^_\\]/.test(point[locale].replace(/\$[^$]+\$/g, '')))).length;
    console.log(`${left} notes still have an exponent or subscript outside $...$`);
    process.exit(0);
  }
  for (let start = 0; start < rows.length; start += 15) {
    const group = rows.slice(start, start + 15);
    const prompt = rewrite ? `数学ドリルの学習項目の「要点」の説明文（ja/en/zh）を、一般の大人が読める文章に書き直す。
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
