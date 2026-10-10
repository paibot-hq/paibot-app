// Checks the sources of the incident list (src/data/breaches.json) against the web: does each link open, and does the page say what the entry says?
//
//   node scripts/check-breaches.mjs                  every entry
//   node scripts/check-breaches.mjs --only bookoff,aflac
//   node scripts/check-breaches.mjs --no-content     only whether the links open
//   node scripts/check-breaches.mjs --strict         warnings fail too
//
// The offline rules (src/tools/breaches/breaches-rules.mjs) run first and must pass. Then, for each source URL:
//   FAIL  404/410, a bad address, or no answer: the link is dead, so the entry is not backed any more
//   WARN  a block (401/403/429), a server error, or a page that does not name the organization or does not show the count: look at it by hand
// A WARN is not proof that the entry is wrong (pages that load their text by script, or write "約870万" for 8,724,000, are not read by this); a FAIL is.
// Nothing is changed: the list is kept up to date by hand, after reading what this prints. See docs/breaches.md.
import { readFileSync } from 'node:fs';
import { numberForms, numbersIn, validateBreaches } from '../src/tools/breaches/breaches-rules.mjs';

const args = process.argv.slice(2);
const flag = name => args.includes(`--${name}`);
const only = args.find(arg => arg.startsWith('--only='))?.slice(7).split(',') ?? (args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null);
const data = JSON.parse(readFileSync(new URL('../src/data/breaches.json', import.meta.url), 'utf8'));

const problems = validateBreaches(data);
if (problems.length) { console.error(`The rules are broken:\n${problems.map(p => `  ${p}`).join('\n')}`); process.exit(1); }

const items = data.items.filter(item => !only || only.includes(item.id));
if (!items.length) { console.error('No entry matches --only.'); process.exit(1); }

const normalize = text => text.normalize('NFKC').replace(/[,\s]/g, '');
const toText = html => html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
const nameToken = name => name.split(/[()（）・\s]/).find(part => part.length >= 2) ?? name;
// The organization may be written shorter on the page (京王電鉄グループ -> 京王電鉄), so the first half of the name is enough.
const nameTokens = name => { const token = nameToken(name); return [token, token.slice(0, Math.max(2, Math.ceil(token.length / 2)))].map(normalize); };

// Pages come in UTF-8 and also in Shift_JIS/EUC-JP: the label is in the header, or else in a <meta> near the top.
function decode(buffer, type) {
  const head = new TextDecoder('latin1').decode(buffer.slice(0, 2048));
  const label = /charset=([\w-]+)/i.exec(type)?.[1] ?? /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1] ?? 'utf-8';
  try { return new TextDecoder(label).decode(buffer); } catch { return new TextDecoder('utf-8').decode(buffer); }
}

const cache = new Map();
async function load(url) {
  if (cache.has(url)) return cache.get(url);
  const job = (async () => {
    for (let attempt = 0; ; attempt++) {
      const result = await fetchOnce(url);
      if (result.status !== 0 || attempt === 2) return result;
      await new Promise(resolve => setTimeout(resolve, 1500)); // a dropped connection is retried before a link is called dead
    }
  })();
  cache.set(url, job);
  return job;
}

async function fetchOnce(url) {
  try {
    const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(25000), headers: { 'user-agent': 'Mozilla/5.0 (compatible; paibot-source-check/1.0)', 'accept-language': 'ja,en;q=0.8' } });
    const type = response.headers.get('content-type') ?? '';
    const text = response.ok && /html|text/.test(type) ? normalize(toText(decode(await response.arrayBuffer(), type))) : null;
    return { status: response.status, type, text };
  } catch (error) {
    return { status: 0, error: error.cause?.code ?? error.message, text: null };
  }
}

async function pool(list, size, task) {
  const queue = [...list];
  await Promise.all(Array.from({ length: size }, async () => { while (queue.length) await task(queue.shift()); }));
}

const results = new Map(items.map(item => [item.id, { fail: [], warn: [], ok: 0 }]));
await pool(items, 5, async item => {
  const result = results.get(item.id);
  const pages = [];
  for (const source of item.sources) {
    const page = await load(source.url);
    pages.push({ source, page });
    if (page.status >= 200 && page.status < 300) result.ok++;
    else if (page.status === 404 || page.status === 410 || page.status === 0) result.fail.push(`${source.url} -> ${page.status || page.error}`);
    else result.warn.push(`${source.url} -> ${page.status} (blocked or server error; check by hand)`);
  }
  if (flag('no-content')) return;
  const readable = pages.filter(({ page }) => page.text);
  if (!readable.length) { if (!result.fail.length) result.warn.push('no source page could be read as text (PDF, blocked or script-built); check by hand'); return; }
  if (!readable.some(({ page }) => nameTokens(item.name).some(token => page.text.includes(token)))) result.warn.push(`no readable source names "${nameToken(item.name)}"`);
  // What is said not to be an attack: the words its sources use for it (a loss, a mistaken send, a secondee...) have to be on one of the pages.
  if (item.origin !== 'attack') {
    for (const word of item.originProof ?? []) {
      if (!readable.some(({ page }) => page.text.includes(normalize(word)))) result.warn.push(`no readable source says "${word}": check by hand that this is not an attack`);
    }
  }
  if (item.count !== null) {
    const forms = new Set([...numberForms(item.count), ...numbersIn(item.countNote).flatMap(numberForms)].map(normalize));
    if (!readable.some(({ page }) => [...forms].some(form => page.text.includes(form)))) result.warn.push(`no readable source shows the count (${item.countNote})`);
  }
});

// The advisories' links: a dead one is a failure, a block is a warning.
for (const advisory of data.advisories ?? []) {
  if (only) break;
  const page = await load(advisory.url);
  if (page.status === 404 || page.status === 410 || page.status === 0) { console.log(`FAIL advisory ${advisory.url} -> ${page.status || page.error}`); process.exitCode = 1; }
  else if (!(page.status >= 200 && page.status < 300)) console.log(`WARN advisory ${advisory.url} -> ${page.status} (blocked or server error; check by hand)`);
}

let fails = 0, warns = 0;
for (const item of items) {
  const { fail, warn, ok } = results.get(item.id);
  fails += fail.length; warns += warn.length;
  const mark = fail.length ? 'FAIL' : warn.length ? 'WARN' : 'ok  ';
  console.log(`${mark} ${item.id} [${item.verification}] ${ok}/${item.sources.length} links open`);
  for (const line of fail) console.log(`       FAIL ${line}`);
  for (const line of warn) console.log(`       WARN ${line}`);
}
console.log(`\n${items.length} entries: ${fails} dead links, ${warns} warnings.`);
process.exit(fails || process.exitCode || (flag('strict') && warns) ? 1 : 0);
