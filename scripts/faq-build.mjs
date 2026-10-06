// Builds src/data/faq.json from the Ministry of Internal Affairs and Communications' FAQ file (Govbot):
//   node scripts/faq-build.mjs [--url <xlsx url>] [--file <local xlsx>] [--updated YYYY-MM-DD]
// The data is a snapshot kept in the repository, so a deploy does not depend on that site. Source: 総務省ホームページ,
// https://www.soumu.go.jp/main_sosiki/hyouka/soudan_n/kyotsucb_top.html (open data licence: use is free with the source stated, and
// a note that it was processed).
import { readFileSync, writeFileSync } from 'node:fs';
import { readFirstSheet } from './lib/xlsx.mjs';
import { buildFaq } from './lib/faq.mjs';

const PAGE = 'https://www.soumu.go.jp/main_sosiki/hyouka/soudan_n/kyotsucb_top.html';
const FILE_URL = 'https://www.soumu.go.jp/main_content/001094882.xlsx';
const arg = name => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };

const url = arg('url') ?? FILE_URL;
const buffer = arg('file') ? readFileSync(arg('file')) : Buffer.from(await (await fetch(url)).arrayBuffer());
const rows = readFirstSheet(buffer);
const faq = buildFaq(rows, { name: '総務省 Govbot FAQデータ', page: PAGE, file: url, updated: arg('updated') ?? '2026-10-01' });
writeFileSync(new URL('../src/data/faq.json', import.meta.url), `${JSON.stringify(faq)}\n`);
console.log(`${faq.items.length} questions in ${faq.categories.length} categories (${rows.length - 1} rows read)`);
