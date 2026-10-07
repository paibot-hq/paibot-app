// Builds src/data/govfaq.json from the Ministry of Internal Affairs and Communications' FAQ file (Govbot):
//   node scripts/govfaq-build.mjs [--url <xlsx url>] [--file <local xlsx>] [--updated YYYY-MM-DD] [--if-changed] [--summary <markdown file>]
// With no --url or --file, the Excel file and the date of its data are found on the Ministry's page (scripts/lib/govfaq-source.mjs); if the page is
// not what is expected it fails. --if-changed leaves the data alone when the file is the same as the one it was built from (by its SHA-256).
// --summary writes what changed, as text for a pull request. In GitHub Actions the result is also written as `changed=true|false` to $GITHUB_OUTPUT.
// The data is a snapshot kept in the repository, so a deploy does not depend on that site. Source: 総務省ホームページ,
// https://www.soumu.go.jp/main_sosiki/hyouka/soudan_n/kyotsucb_top.html (open data licence: use is free with the source stated, and
// a note that it was processed).
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { readFirstSheet } from './lib/xlsx.mjs';
import { buildFaq } from './lib/govfaq.mjs';
import { PAGE, diffFaq, fetchSource, sha256, summaryMarkdown } from './lib/govfaq-source.mjs';

const arg = name => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const flag = name => process.argv.includes(`--${name}`);
const output = (name, value) => { if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`); };

const DATA = new URL('../src/data/govfaq.json', import.meta.url);
const previous = existsSync(DATA) ? JSON.parse(readFileSync(DATA, 'utf8')) : null;

let url = arg('url'), updated = arg('updated');
if (!arg('file') && (!url || !updated)) {
  const found = await fetchSource();
  url ??= found.fileUrl;
  updated ??= found.updated;
}
if (!arg('file') && !url) throw new Error('no address for the FAQ file');
const buffer = arg('file') ? readFileSync(arg('file')) : Buffer.from(await (await fetch(url)).arrayBuffer());
const hash = sha256(buffer);
if (flag('if-changed') && previous?.source?.sha256 === hash) {
  console.log(`unchanged (the file is the one the data was built from, data of ${previous.source.updated})`);
  output('changed', 'false');
  process.exit(0);
}
if (!updated) throw new Error('the date of the data is needed: --updated YYYY-MM-DD (it is read from the page when the file is not given by --file)');

const rows = readFirstSheet(buffer);
const faq = buildFaq(rows, { name: '総務省 Govbot FAQデータ', page: PAGE, file: url ?? arg('file'), updated, sha256: hash });
writeFileSync(DATA, `${JSON.stringify(faq)}\n`);
console.log(`${faq.items.length} questions in ${faq.categories.length} categories (${rows.length - 1} rows read), data of ${updated}`);
if (arg('summary')) writeFileSync(arg('summary'), `${summaryMarkdown({ diff: diffFaq(previous, faq), source: faq.source, previous: previous?.source })}\n`);
output('changed', 'true');
