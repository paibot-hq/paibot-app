// Shows what the search by meaning finds for some questions, with the nearness of each: for choosing SEM_MIN and SEM_SURE in
// src/tools/govfaq/govfaq-semantic.ts. Needs the vector file (npm run govfaq:embed) and, like that script, your own account id and token:
//   CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_API_TOKEN=... node scripts/govfaq-probe.mjs ["a question" ...]
// Nothing is written; the token is never printed.
import { readFileSync } from 'node:fs';
import { workersAiEmbedder } from './lib/govfaq-embed.mjs';
import { DIM, decodeVectors, nearest, quantize } from '../src/tools/govfaq/govfaq-vectors.ts';
import { buildIndex, toItems, search } from '../src/tools/govfaq/govfaq-search.ts';
import { SEM_MIN, SEM_SURE } from '../src/tools/govfaq/govfaq-semantic.ts';

const { CLOUDFLARE_ACCOUNT_ID: accountId, CLOUDFLARE_API_TOKEN: token } = process.env;
if (!accountId || !token) { console.error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in your own terminal.'); process.exit(1); }
const faq = JSON.parse(readFileSync(new URL('../src/data/govfaq.json', import.meta.url), 'utf8'));
const items = toItems(faq);
const index = buildIndex(items, faq.categories);
const { data } = decodeVectors(new Uint8Array(readFileSync(new URL('../public/govfaq-vectors.bin', import.meta.url))));
const embed = workersAiEmbedder({ accountId, token });

const QUESTIONS = process.argv.length > 2 ? process.argv.slice(2) : [
  // Same meaning, other words: what the search by words misses.
  '財布を落とした', '子どもが生まれた', '引っ越しをしたい', '保険証をなくしたらどうする', '税金が払えない', '結婚したときの手続き', '親が亡くなった',
  '赤ちゃんが生まれたらもらえるお金', '仕事を辞めたらどうなる', 'マイナンバーカードの更新',
  // Plain questions (the words are there).
  'マイナンバーカードをなくした', '年金はいつからもらえる', '確定申告のやり方',
  // Not about the FAQ at all: nothing should be offered as an answer.
  'ぬるぽがっ', '今日の天気は', 'ラーメンの作り方', '好きな食べ物は何ですか',
];
const rows = await embed(QUESTIONS);
QUESTIONS.forEach((question, i) => {
  const top = nearest(data, DIM, quantize(rows[i]), 3);
  const words = search(index, question, { limit: 1 });
  console.log(`\n■ ${question}   (words: ${words.length ? `found, coverage ${words[0].coverage.toFixed(2)}` : 'none'})`);
  for (const { doc, score } of top) console.log(`  ${score.toFixed(3)} ${score >= SEM_SURE ? 'SURE ' : score >= SEM_MIN ? 'maybe' : 'below'}  ${items[doc].question.slice(0, 60)}`);
});
console.log(`\n(SEM_MIN ${SEM_MIN}, SEM_SURE ${SEM_SURE})`);
