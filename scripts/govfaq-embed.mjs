// Makes public/govfaq-vectors.bin (the FAQ's vectors, for the search by meaning) from src/data/govfaq.json, with Workers AI:
//   CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_API_TOKEN=... node scripts/govfaq-embed.mjs [--dry]
// The token needs permission to use Workers AI. --dry says how many FAQs would be sent and does not call anything. A FAQ that has not changed since
// the last run keeps its vector. Run it after scripts/govfaq-build.mjs, and commit the file and src/data/govfaq-vectors.meta.json with the data.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { buildVectors, readPrevious, workersAiEmbedder } from './lib/govfaq-embed.mjs';

const BIN = new URL('../public/govfaq-vectors.bin', import.meta.url);
const META = new URL('../src/data/govfaq-vectors.meta.json', import.meta.url);
const faq = JSON.parse(readFileSync(new URL('../src/data/govfaq.json', import.meta.url), 'utf8'));
const items = faq.items.map(([id, , question, answer]) => ({ id, question, answer }));
const previous = existsSync(BIN) && existsSync(META) ? readPrevious(new Uint8Array(readFileSync(BIN)), JSON.parse(readFileSync(META, 'utf8'))) : new Map();

if (process.argv.includes('--dry')) {
  const { textFor, hash } = await import('../src/tools/govfaq/govfaq-vectors.ts');
  const fresh = items.filter(item => previous.get(item.id)?.hash !== hash(textFor(item))).length;
  console.log(`${items.length} FAQs, ${fresh} to send to Workers AI (${items.length - fresh} keep their vectors)`);
  process.exit(0);
}
const { CLOUDFLARE_ACCOUNT_ID: accountId, CLOUDFLARE_API_TOKEN: token } = process.env;
if (!accountId || !token) { console.error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (a token that may use Workers AI) in your own terminal.'); process.exit(1); }
const result = await buildVectors(items, { embed: workersAiEmbedder({ accountId, token }), previous, log: line => console.log(line) });
writeFileSync(BIN, result.bytes);
writeFileSync(META, `${JSON.stringify(result.meta)}\n`);
console.log(`${result.embedded} sent to Workers AI, ${result.reused} kept; ${(result.bytes.length / 1048576).toFixed(1)} MB written to public/govfaq-vectors.bin`);
