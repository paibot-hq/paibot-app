// Makes the vectors of the government FAQ (see src/tools/govfaq/govfaq-vectors.ts): each FAQ's text goes to Workers AI in batches, and what comes
// back is made small and put in a file. A FAQ whose text has not changed since the last run keeps its vector, so an update of the FAQ costs the AI
// only what is new.
import { DIM, MODEL, decodeVectors, encodeVectors, hash, quantize, signature, textFor } from '../../src/tools/govfaq/govfaq-vectors.ts';

// Rows of numbers for texts, from Workers AI's REST address (account id and token from the environment; neither is ever printed).
export function workersAiEmbedder({ accountId, token, fetchImpl = fetch, retries = 5, wait = ms => new Promise(r => setTimeout(r, ms)) }) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`;
  return async texts => {
    for (let attempt = 0; ; attempt++) {
      const response = await fetchImpl(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ text: texts }) });
      if (response.ok) {
        const body = await response.json();
        const rows = body?.result?.data;
        if (!Array.isArray(rows) || rows.length !== texts.length || rows.some(r => !Array.isArray(r) || r.length !== DIM)) throw new Error(`Workers AI answered with something that is not ${texts.length} vectors of ${DIM} numbers`);
        return rows;
      }
      if ((response.status === 429 || response.status >= 500) && attempt < retries) { await wait(Math.min(30000, 1000 * 2 ** attempt)); continue; }
      throw new Error(`Workers AI answered ${response.status}${response.status === 401 || response.status === 403 ? ' (check the token and that it may use Workers AI)' : ''}`);
    }
  };
}

// The vectors made last time, by FAQ id: from the file and the list of fingerprints kept beside it (src/data/govfaq-vectors.meta.json).
export function readPrevious(bytes, meta) {
  const previous = new Map();
  if (!bytes || !meta || meta.model !== MODEL || meta.dim !== DIM) return previous;
  const { header, data } = decodeVectors(bytes);
  if (header.model !== MODEL || header.dim !== DIM || !Array.isArray(meta.ids) || meta.ids.length !== header.count || meta.hashes?.length !== header.count) return previous;
  meta.ids.forEach((id, i) => previous.set(id, { hash: meta.hashes[i], vector: data.slice(i * DIM, (i + 1) * DIM) }));
  return previous;
}

// All the vectors, in the order of the FAQ: the file's bytes, the list of fingerprints for next time, and how many were new.
export async function buildVectors(items, { embed, previous = new Map(), batch = 50, log = () => {} }) {
  const wanted = items.map(item => { const text = textFor(item); return { id: item.id, text, hash: hash(text) }; });
  const rows = new Array(items.length);
  const todo = [];
  wanted.forEach((w, i) => {
    const old = previous.get(w.id);
    if (old && old.hash === w.hash) rows[i] = old.vector; else todo.push(i);
  });
  for (let start = 0; start < todo.length; start += batch) {
    const part = todo.slice(start, start + batch);
    const vectors = await embed(part.map(i => wanted[i].text));
    part.forEach((i, k) => { rows[i] = quantize(vectors[k]); });
    log(`${Math.min(start + batch, todo.length)} / ${todo.length}`);
  }
  const header = { model: MODEL, dim: DIM, count: items.length, signature: signature(items) };
  return { bytes: encodeVectors(header, rows), meta: { model: MODEL, dim: DIM, signature: header.signature, ids: wanted.map(w => w.id), hashes: wanted.map(w => w.hash) }, embedded: todo.length, reused: items.length - todo.length };
}
