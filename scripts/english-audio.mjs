import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { ENGLISH_UNITS } from '../src/tools/english/catalog.ts';
import { AUDIO_DIR, audioHash, audioPath, audioText, ENGLISH_VOICE } from './english-voice.mjs';
import { bankPath, banks } from './validate-english.mjs';

// Reads every English problem's sentence (the blank filled with the answer) with Workers AI's text-to-speech and saves it as
// public/english-audio/<id>.mp3; the problem's `audio` keeps a hash of the voice and the text, so only new or changed sentences
// are sent again. In your own terminal:
//   CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_API_TOKEN=... npm run english:audio [-- --dry]
// (a token that may use Workers AI; never print it). LOCAL_AI_ACCOUNT_ID and LOCAL_AI_TOKEN in .dev.vars work too.
const local = existsSync('.dev.vars') ? Object.fromEntries(readFileSync('.dev.vars', 'utf8').split('\n').map(line => line.match(/^(LOCAL_AI_\w+)=(.*)$/)).filter(Boolean).map(m => [m[1], m[2].trim()])) : {};
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? local.LOCAL_AI_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN ?? local.LOCAL_AI_TOKEN;
const dry = process.argv.includes('--dry');

const todo = ENGLISH_UNITS.flatMap(unit => banks[unit].problems.map(problem => ({ unit, problem })))
  .filter(({ problem }) => problem.audio !== audioHash(problem) || !existsSync(audioPath(problem.id)));
console.log(`${todo.length} sentence(s) to read with ${ENGLISH_VOICE.model} (${ENGLISH_VOICE.speaker})`);
if (dry || !todo.length) process.exit(0);
if (!accountId || !token) { console.error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (a token that may use Workers AI) in your own terminal.'); process.exit(1); }

async function speak(text) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${ENGLISH_VOICE.model}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, speaker: ENGLISH_VOICE.speaker, encoding: 'mp3' }),
  });
  const type = response.headers.get('content-type') ?? '';
  if (!response.ok || !type.startsWith('audio/')) throw new Error(`${response.status} ${type}: ${(await response.text()).slice(0, 300)}`);
  return new Uint8Array(await response.arrayBuffer());
}

mkdirSync(AUDIO_DIR, { recursive: true });
const changed = new Set();
for (const { unit, problem } of todo) {
  const bytes = await speak(audioText(problem));
  writeFileSync(audioPath(problem.id), bytes);
  problem.audio = audioHash(problem);
  changed.add(unit);
  console.log(`${problem.id}: ${bytes.length} bytes  "${audioText(problem)}"`);
}
for (const unit of changed) writeFileSync(bankPath(unit), JSON.stringify(banks[unit], null, 2) + '\n');
