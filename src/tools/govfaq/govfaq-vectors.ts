// The numbers behind the "search by meaning" of the government FAQ: every question (with the start of its answer) is turned by an AI model into
// a vector of 1,024 numbers, and what is close in meaning is close as vectors. This holds the pieces that the build script, the Worker and the
// browser share: how a vector is made small and put in a file, how to find the nearest, and how the two kinds of search are merged.
// Pure functions, tested without a browser. (No imports: the scripts read this file with Node as it is.)

// The model that makes the vectors: the FAQ's and a question's must come from the same one.
export const MODEL = "@cf/baai/bge-m3";
export const DIM = 1024;
const SCALE = 127;

// What is turned into a vector for a FAQ: the question and the first part of its answer, without the markup of links.
const ANSWER_CHARS = 300;
export function textFor(item: { question: string; answer: string }): string {
  const answer = item.answer.replace(/<([^<>,]+),https?:\/\/[^<>]+>/g, "$1").replace(/※これから先は、外部のサイトに移動します。/g, "").replace(/\s+/g, " ").trim();
  return `${item.question}\n${[...answer].slice(0, ANSWER_CHARS).join("")}`;
}

// A short fingerprint of a text (FNV-1a, 32 bits, as 8 letters of hex): to know which FAQ changed, and that the file matches the FAQ.
export function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}
// The fingerprint of a whole FAQ as the vectors were made from it: the order and the id and text of each.
export const signature = (items: { id: string; question: string; answer: string }[]): string => hash(items.map(item => `${item.id}\u0001${hash(textFor(item))}`).join("\u0002"));

// A vector with length 1 (then the dot product of two is their cosine), and then as whole numbers from -127 to 127: a byte each.
export function quantize(vector: ArrayLike<number>): Int8Array {
  let sum = 0;
  for (let i = 0; i < vector.length; i++) sum += vector[i] * vector[i];
  const norm = Math.sqrt(sum) || 1;
  const out = new Int8Array(vector.length);
  for (let i = 0; i < vector.length; i++) out[i] = Math.max(-SCALE, Math.min(SCALE, Math.round((vector[i] / norm) * SCALE)));
  return out;
}

// The bytes of a vector (signed numbers) are written as they are, bit for bit.
export function toBase64(input: Uint8Array | Int8Array): string {
  const bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  let text = "";
  for (let i = 0; i < bytes.length; i += 0x2000) text += String.fromCharCode(...bytes.subarray(i, i + 0x2000));
  return btoa(text);
}
// ...and read back the same way, as signed numbers.
export function fromBase64(text: string): Int8Array {
  const raw = atob(text);
  const out = new Int8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = (raw.charCodeAt(i) << 24) >> 24;
  return out;
}

// The file: "GFV1", the length of the header (4 bytes), the header as JSON, then count x dim signed bytes.
export type Header = { model: string; dim: number; count: number; signature: string };
const MAGIC = [0x47, 0x46, 0x56, 0x31];

export function encodeVectors(header: Header, rows: Int8Array[]): Uint8Array {
  if (rows.length !== header.count || rows.some(r => r.length !== header.dim)) throw new Error("the rows do not match the header");
  const json = new TextEncoder().encode(JSON.stringify(header));
  const out = new Uint8Array(8 + json.length + header.count * header.dim);
  out.set(MAGIC, 0);
  new DataView(out.buffer).setUint32(4, json.length, true);
  out.set(json, 8);
  rows.forEach((row, i) => out.set(new Uint8Array(row.buffer, row.byteOffset, row.length), 8 + json.length + i * header.dim));
  return out;
}

export function decodeVectors(bytes: Uint8Array): { header: Header; data: Int8Array } {
  if (bytes.length < 8 || MAGIC.some((b, i) => bytes[i] !== b)) throw new Error("not a FAQ vector file");
  const length = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4, true);
  if (8 + length > bytes.length) throw new Error("the header is cut short");
  const header = JSON.parse(new TextDecoder().decode(bytes.subarray(8, 8 + length))) as Header;
  if (!header || typeof header.dim !== "number" || typeof header.count !== "number" || header.dim <= 0 || header.count < 0) throw new Error("the header is wrong");
  const start = 8 + length;
  if (bytes.length - start !== header.count * header.dim) throw new Error("the data is not the size the header says");
  return { header, data: new Int8Array(bytes.buffer, bytes.byteOffset + start, header.count * header.dim) };
}

// The cosine (about; from -1 to 1) of the query with each FAQ, and the best `k`, nearest first.
export function nearest(data: Int8Array, dim: number, query: Int8Array, k: number, allowed?: (doc: number) => boolean): { doc: number; score: number }[] {
  if (query.length !== dim) throw new Error("the query has the wrong size");
  const count = data.length / dim;
  const scores: { doc: number; score: number }[] = [];
  for (let doc = 0; doc < count; doc++) {
    if (allowed && !allowed(doc)) continue;
    let dot = 0;
    const base = doc * dim;
    for (let i = 0; i < dim; i++) dot += data[base + i] * query[i];
    scores.push({ doc, score: dot / (SCALE * SCALE) });
  }
  scores.sort((a, b) => b.score - a.score || a.doc - b.doc);
  return scores.slice(0, k);
}

// Two rankings merged by rank alone (reciprocal rank fusion: each list gives 1 / (60 + rank) to what it has), so that their different kinds of score
// do not matter; what both have comes first.
export type Fused = { doc: number; score: number; from: "both" | "lexical" | "semantic" };
export function fuse(lexical: number[], semantic: number[], limit = 50, constant = 60): Fused[] {
  const scores = new Map<number, { score: number; lexical: boolean; semantic: boolean }>();
  const add = (docs: number[], key: "lexical" | "semantic") => docs.forEach((doc, rank) => {
    const entry = scores.get(doc) ?? { score: 0, lexical: false, semantic: false };
    if (!entry[key]) { entry.score += 1 / (constant + rank + 1); entry[key] = true; }
    scores.set(doc, entry);
  });
  add(lexical, "lexical");
  add(semantic, "semantic");
  return [...scores].map(([doc, e]) => ({ doc, score: e.score, from: (e.lexical && e.semantic ? "both" : e.lexical ? "lexical" : "semantic") as Fused["from"] }))
    .sort((a, b) => b.score - a.score || a.doc - b.doc).slice(0, limit);
}
