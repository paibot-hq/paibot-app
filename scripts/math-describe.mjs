import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MATH_CATALOG } from '../src/lib/math-catalog.ts';
import { jpGrade } from '../src/lib/math-curriculum-jp.ts';
import { extractJSON, run, saveWork } from './math-pipeline.mjs';

// Writes each learning item's `summary` (one line, shown on the unit page) and
// `description` (2-3 sentences, shown on the item page) in ja, en and zh into
// messages/*.json. Existing descriptions are kept. An LLM writes them; Codex then
// checks them for mistakes (--review).
//   node scripts/math-describe.mjs [unit ...]           write the missing ones
//   node scripts/math-describe.mjs --review [unit ...]  list problems found
//   node scripts/math-describe.mjs --fix issues.json    rewrite the items a review flagged
const args = process.argv.slice(2);
const review = args.includes('--review');
const fixIndex = args.indexOf('--fix');
const issuesFile = fixIndex >= 0 ? args[fixIndex + 1] : undefined;
const wanted = args.filter((arg, index) => !arg.startsWith('--') && index !== fixIndex + 1);
const LOCALES = ['ja', 'en', 'zh'];
const files = Object.fromEntries(LOCALES.map(locale => [locale, new URL(`../messages/${locale}.json`, import.meta.url)]));
const messages = Object.fromEntries(LOCALES.map(locale => [locale, JSON.parse(readFileSync(files[locale], 'utf8'))]));
const units = messages.ja.App.math.units;
const grades = messages.ja.App.math.grades;
const save = () => {
  for (const locale of LOCALES) {
    const text = JSON.stringify(messages[locale], null, 2) + '\n';
    // Keep the language names on one line, as the file has them.
    writeFileSync(files[locale], text.replace(/"languages": \{\n\s*"ja": "(.*?)",\n\s*"en": "(.*?)",\n\s*"zh": "(.*?)"\n\s*\}/, '"languages": { "ja": "$1", "en": "$2", "zh": "$3" }'));
  }
};
const rows = MATH_CATALOG.filter(unit => !wanted.length || wanted.includes(unit.id)).flatMap(unit => unit.items.map(item => ({
  unit: unit.id, item: item.id, unitTitle: units[unit.id].title, unitSummary: units[unit.id].summary, title: units[unit.id].items[item.id].title,
  grade: grades[jpGrade(unit.id, item.id)] ?? '',
  ja: units[unit.id].items[item.id],
})));
const chunk = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));
let temp = mkdtempSync(join(tmpdir(), 'math-describe-'));
const ask = (tool, prompt) => {
  let raw = '';
  for (let attempt = 0; attempt < 3 && !raw.trim(); attempt++) raw = tool === 'agy' ? run('agy', ['--sandbox', '--print-timeout', '10m', '-p', prompt], temp) : run('codex', ['exec', '--sandbox', 'read-only', '--skip-git-repo-check', prompt], temp);
  return raw;
};
try {
  if (issuesFile) {
    const issues = JSON.parse(readFileSync(issuesFile, 'utf8'));
    for (const [index, group] of chunk(issues, 15).entries()) {
      const prompt = `数学ドリルの学習項目の説明に、レビューで次の問題が指摘された。指摘を直して、日本語(ja)・英語(en)・中国語(zh)の summary と description を書き直す。
- summary は1行（ja・zh は30字以内、en は60字以内）、description は2〜3文（ja・zh は100字前後、en は40〜60語）。
- 標準的な数学の内容だけを書く。数検などの試験や決まった学年の言い方には触れない。3言語で同じ内容にする。数学的に正確で、誤解を招かない表現にする。
- コマンドやツールは使わず JSON だけを出力する: {"items":[{"unit":"","item":"","ja":{"summary":"","description":""},"en":{...},"zh":{...}}]}
項目と指摘:
${JSON.stringify(group.map(issue => ({ unit: issue.unit, item: issue.item, 指摘: issue.problem, 現在: Object.fromEntries(LOCALES.map(locale => [locale, { summary: messages[locale].App.math.units[issue.unit].items[issue.item].summary, description: messages[locale].App.math.units[issue.unit].items[issue.item].description }])) })), null, 2)}`;
      let result;
      for (let attempt = 0; attempt < 3 && !result; attempt++) { try { result = extractJSON(ask('agy', prompt), 'items'); } catch { /* ask again */ } }
      assert.ok(result, `batch ${index + 1}: no usable answer`);
      for (const entry of result.items) {
        for (const locale of LOCALES) {
          const { summary, description } = entry[locale] ?? {};
          assert.ok(summary?.trim() && description?.trim(), `${entry.unit}/${entry.item}: ${locale} needs summary and description`);
          const item = messages[locale].App.math.units[entry.unit].items[entry.item];
          item.summary = summary.trim(); item.description = description.trim();
        }
      }
      save();
      console.log(`fixed batch ${index + 1}: ${result.items.length} items`);
    }
  } else if (review) {
    const problems = [];
    for (const group of chunk(rows.filter(row => row.ja.summary && row.ja.description), 25)) {
      const prompt = `次は数学ドリルの学習項目の説明（日本語）。数学的な誤り、誤解を招く表現、学年に合わない内容、不自然な日本語だけを指摘する。問題がなければ issues は空。出力は JSON のみ: {"issues":[{"unit":"","item":"","problem":""}]}。コマンドやツールは使わない。\n${JSON.stringify(group.map(row => ({ unit: row.unit, item: row.item, 単元: row.unitTitle, 項目: row.title, 学年: row.grade, summary: row.ja.summary, description: row.ja.description })), null, 2)}`;
      const raw = ask('codex', prompt);
      try { problems.push(...extractJSON(raw, 'issues').issues); } catch { problems.push({ unit: group[0].unit, item: '?', problem: `unparseable review: ${raw.slice(0, 200)}` }); }
    }
    console.log(problems.length ? JSON.stringify(problems, null, 2) : 'No issues found');
    process.exitCode = problems.length ? 1 : 0;
  } else {
    const todo = rows.filter(row => !row.ja.summary || !row.ja.description);
    for (const [index, group] of chunk(todo, 20).entries()) {
      const prompt = `数学ドリル（日本の学習指導要領に沿った、小学校〜大学の数学の練習サイト）の学習項目それぞれに、説明を日本語(ja)・英語(en)・中国語(zh)で書く。
- summary: 1行の要約（この項目で何を学ぶか）。ja は30字以内、en は60字以内、zh は30字以内。
- description: 2〜3文の説明（何を学び、どんな場面で使うか、前にどんな知識があるとよいか）。ja は100字前後、en は40〜60語、zh は100字前後。
- 標準的な数学の内容だけを書く。数検などの試験には触れない。具体的な問題の答えや数値例は書かない。決まった学年の言い方は使わない（学年は別に表示される）。
- 3言語で同じ内容にする。用語は各言語で一般的なもの。既存の説明がある項目は、その説明を description にそのまま出力する。
- コマンドやツールは使わず JSON だけを出力する: {"items":[{"unit":"","item":"","ja":{"summary":"","description":""},"en":{...},"zh":{...}}]}
項目:
${JSON.stringify(group.map(row => ({ unit: row.unit, item: row.item, 単元: row.unitTitle, 単元の概要: row.unitSummary, 項目: row.title, 学年: row.grade, 既存の説明: row.ja.description ?? null })), null, 2)}`;
      const raw = ask('agy', prompt);
      let result;
      try { result = extractJSON(raw, 'items'); } catch (error) { throw new Error(`${error.message}\nRaw: ${saveWork('describe-raw', raw, 'txt')}`); }
      for (const entry of result.items) {
        const target = units[entry.unit]?.items[entry.item];
        assert.ok(target, `unknown item ${entry.unit}/${entry.item}`);
        for (const locale of LOCALES) {
          const { summary, description } = entry[locale] ?? {};
          assert.ok(typeof summary === 'string' && summary.trim() && typeof description === 'string' && description.trim(), `${entry.unit}/${entry.item}: ${locale} needs summary and description`);
          const item = messages[locale].App.math.units[entry.unit].items[entry.item];
          item.summary = summary.trim();
          if (!item.description) item.description = description.trim();
        }
      }
      save();
      console.log(`batch ${index + 1}/${Math.ceil(todo.length / 20)}: ${result.items.length} items`);
    }
    const missing = rows.filter(row => !messages.ja.App.math.units[row.unit].items[row.item].summary || !messages.ja.App.math.units[row.unit].items[row.item].description);
    console.log(missing.length ? `Missing: ${missing.map(row => `${row.unit}/${row.item}`).join(', ')}` : 'Every item has a summary and a description');
    process.exitCode = missing.length ? 1 : 0;
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { rmSync(temp, { recursive: true, force: true }); }
