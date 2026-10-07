// Finding the Ministry's FAQ file, and telling what changed in it: the pieces of scripts/govfaq-build.mjs that the update workflow
// (.github/workflows/govfaq-update.yml) needs. The page is Shift_JIS; it links the Excel file once and says the date of the data in the Japanese
// era ("令和8年10月1日時点の情報です。"). Nothing here guesses: when the page is not what is expected, it throws, and the workflow fails.
import { createHash } from 'node:crypto';

export const PAGE = 'https://www.soumu.go.jp/main_sosiki/hyouka/soudan_n/kyotsucb_top.html';

// The year of an era's first year, less one: 令和1 is 2019, 平成1 is 1989.
const ERAS = { 令和: 2018, 平成: 1988 };

// "令和8年10月1日" -> "2026-10-01" (null when it is not a date).
export function warekiToIso(text) {
  const m = /(令和|平成)\s*(元|\d{1,2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/.exec(text);
  if (!m) return null;
  const year = ERAS[m[1]] + (m[2] === '元' ? 1 : Number(m[2]));
  const month = Number(m[3]), day = Number(m[4]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

// The page as text: its charset is in the header or in a <meta> near the top (these pages say Shift_JIS), and Shift_JIS when it says nothing.
export function decodePage(bytes, contentType = '') {
  const head = Buffer.from(bytes).subarray(0, 2048).toString('latin1');
  const named = /charset=["']?([\w-]+)/i.exec(contentType)?.[1] ?? /<meta[^>]*charset=["']?([\w-]+)/i.exec(head)?.[1] ?? 'shift_jis';
  return new TextDecoder(named).decode(bytes);
}

const textOf = html => html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

// The Excel file's address and the date of its data, from the page. Exactly one Excel link is needed (the one whose words mention the FAQ is
// preferred when there are several), and a date followed by "時点".
export function parseSourcePage(html, pageUrl = PAGE) {
  const links = [...html.matchAll(/<a\s[^>]*href\s*=\s*["']([^"']+\.xlsx(?:\?[^"']*)?)["'][^>]*>([\s\S]*?)<\/a>/gi)].map(m => ({ href: m[1], text: textOf(m[2]) }));
  const named = links.filter(link => /FAQ/i.test(link.text));
  const chosen = named.length === 1 ? named[0] : links.length === 1 ? links[0] : null;
  if (!chosen) throw new Error(`expected one Excel link on the page, found ${links.length} (${named.length} that mention the FAQ)`);
  const date = /((?:令和|平成)\s*(?:元|\d{1,2})\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日)\s*時点/.exec(textOf(html));
  const updated = date && warekiToIso(date[1]);
  if (!updated) throw new Error('the page does not give the date of the data ("…時点")');
  return { fileUrl: new URL(chosen.href, pageUrl).href, updated };
}

export async function fetchSource(fetchImpl = fetch) {
  const response = await fetchImpl(PAGE);
  if (!response.ok) throw new Error(`the page answered ${response.status}`);
  return parseSourcePage(decodePage(new Uint8Array(await response.arrayBuffer()), response.headers.get('content-type') ?? ''), PAGE);
}

export const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');

// What changed between two builds of the data, by id: those added, those gone, and those whose question or answer changed.
export function diffFaq(before, after) {
  const index = faq => new Map((faq?.items ?? []).map(([id, category, question, answer]) => [id, { category: faq.categories[category], question, answer }]));
  const old = index(before), now = index(after);
  const added = [...now].filter(([id]) => !old.has(id)).map(([id, item]) => ({ id, question: item.question }));
  const removed = [...old].filter(([id]) => !now.has(id)).map(([id, item]) => ({ id, question: item.question }));
  const changed = [...now].filter(([id, item]) => old.has(id) && (old.get(id).question !== item.question || old.get(id).answer !== item.answer || old.get(id).category !== item.category))
    .map(([id, item]) => ({ id, question: item.question }));
  return { added, removed, changed, total: now.size, before: old.size };
}

// The update as text for a pull request.
export function summaryMarkdown({ diff, source, previous, sample = 8 }) {
  const list = (title, rows) => rows.length === 0 ? '' : `\n### ${title}（${rows.length}件）\n${rows.slice(0, sample).map(row => `- ${row.id}: ${row.question.replace(/\s+/g, ' ').slice(0, 70)}`).join('\n')}${rows.length > sample ? `\n- …ほか ${rows.length - sample} 件` : ''}\n`;
  return [
    `総務省 Govbot の FAQ データを更新しました（データの日付: ${previous?.updated ?? '不明'} → ${source.updated}）。`,
    '',
    `- 件数: ${diff.before} → ${diff.total}`,
    `- 追加 ${diff.added.length}、削除 ${diff.removed.length}、内容の変更 ${diff.changed.length}`,
    `- 元のファイル: ${source.file}`,
    list('追加', diff.added), list('削除', diff.removed), list('変更', diff.changed),
    '',
    '意味の検索用のベクトル（`public/govfaq-vectors.bin`）は、追加・変更された分だけ作り直しています。',
  ].join('\n').replace(/\n{3,}/g, '\n\n');
}
