// Reading and rewriting a ZIP file (an Office document is one), in the browser or in Node, with nothing but the platform's own parts. Reading takes the
// list of entries from the central directory; rewriting copies the entries that are not changed as they are (their compressed data is not touched) and
// writes the changed ones compressed again. No ZIP64, no encryption: those are refused.

export type Entry = { name: string; method: number; flags: number; time: number; date: number; crc: number; compressed: number; size: number; attributes: number; data: Uint8Array };

const view = (bytes: Uint8Array) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

let table: Uint32Array | null = null;
export function crc32(bytes: Uint8Array): number {
  if (!table) {
    table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export function readZip(bytes: Uint8Array): Entry[] {
  const v = view(bytes);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65535); i--) if (v.getUint32(i, true) === 0x06054b50) { end = i; break; }
  if (end < 0) throw new Error("not a ZIP file");
  const total = v.getUint16(end + 10, true), directory = v.getUint32(end + 16, true);
  if (total === 0xffff || directory === 0xffffffff) throw new Error("ZIP64 is not supported");
  const entries: Entry[] = [];
  let at = directory;
  for (let n = 0; n < total; n++) {
    if (at + 46 > bytes.length || v.getUint32(at, true) !== 0x02014b50) throw new Error("the ZIP directory is damaged");
    const flags = v.getUint16(at + 8, true), method = v.getUint16(at + 10, true);
    const compressed = v.getUint32(at + 20, true), size = v.getUint32(at + 24, true), nameLength = v.getUint16(at + 28, true);
    const extra = v.getUint16(at + 30, true), comment = v.getUint16(at + 32, true), local = v.getUint32(at + 42, true);
    if (flags & 1) throw new Error("the ZIP is encrypted");
    if (compressed === 0xffffffff || size === 0xffffffff || local === 0xffffffff) throw new Error("ZIP64 is not supported");
    const name = new TextDecoder(flags & 0x800 ? "utf-8" : "latin1").decode(bytes.subarray(at + 46, at + 46 + nameLength));
    if (local + 30 > bytes.length || v.getUint32(local, true) !== 0x04034b50) throw new Error("the ZIP is damaged");
    const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
    if (start + compressed > bytes.length) throw new Error("the ZIP is cut short");
    entries.push({ name, method, flags: flags & 0x800, time: v.getUint16(at + 12, true), date: v.getUint16(at + 14, true), crc: v.getUint32(at + 16, true), compressed, size, attributes: v.getUint32(at + 38, true), data: bytes.subarray(start, start + compressed) });
    at += 46 + nameLength + extra + comment;
  }
  return entries;
}

async function pipe(bytes: Uint8Array, stream: { writable: WritableStream<BufferSource>; readable: ReadableStream<Uint8Array> }): Promise<Uint8Array> {
  const writer = stream.writable.getWriter();
  void writer.write(bytes as BufferSource).then(() => writer.close());
  const chunks: Uint8Array[] = [];
  const reader = stream.readable.getReader();
  for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); }
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.length; }
  return out;
}

// The content of an entry (inflated when it is deflated).
export async function content(entry: Entry): Promise<Uint8Array> {
  if (entry.method === 0) return entry.data;
  if (entry.method !== 8) throw new Error(`compression method ${entry.method} is not supported`);
  return pipe(entry.data, new DecompressionStream("deflate-raw"));
}
export const deflate = (bytes: Uint8Array) => pipe(bytes, new CompressionStream("deflate-raw"));

export const text = (bytes: Uint8Array) => new TextDecoder("utf-8").decode(bytes);
export const encode = (value: string) => new TextEncoder().encode(value);

// The ZIP with some entries replaced (a Uint8Array: the new content) or left out (null); the others are copied as they are.
export async function rewriteZip(entries: Entry[], changes: Map<string, Uint8Array | null>): Promise<Uint8Array> {
  type Out = { entry: Entry; method: number; crc: number; compressed: number; size: number; data: Uint8Array };
  const outs: Out[] = [];
  for (const entry of entries) {
    if (!changes.has(entry.name)) { outs.push({ entry, method: entry.method, crc: entry.crc, compressed: entry.compressed, size: entry.size, data: entry.data }); continue; }
    const replacement = changes.get(entry.name);
    if (replacement === null || replacement === undefined) continue;
    const packed = await deflate(replacement);
    const useDeflate = packed.length < replacement.length;
    outs.push({ entry, method: useDeflate ? 8 : 0, crc: crc32(replacement), compressed: useDeflate ? packed.length : replacement.length, size: replacement.length, data: useDeflate ? packed : replacement });
  }
  const names = outs.map(o => encode(o.entry.name));
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let at = 0;
  outs.forEach((o, i) => {
    const header = new Uint8Array(30);
    const h = view(header);
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, o.entry.flags, true); h.setUint16(8, o.method, true);
    h.setUint16(10, o.entry.time, true); h.setUint16(12, o.entry.date, true); h.setUint32(14, o.crc, true); h.setUint32(18, o.compressed, true);
    h.setUint32(22, o.size, true); h.setUint16(26, names[i].length, true);
    offsets.push(at);
    parts.push(header, names[i], o.data);
    at += 30 + names[i].length + o.data.length;
  });
  const directoryStart = at;
  outs.forEach((o, i) => {
    const record = new Uint8Array(46);
    const r = view(record);
    r.setUint32(0, 0x02014b50, true); r.setUint16(4, 20, true); r.setUint16(6, 20, true); r.setUint16(8, o.entry.flags, true); r.setUint16(10, o.method, true);
    r.setUint16(12, o.entry.time, true); r.setUint16(14, o.entry.date, true); r.setUint32(16, o.crc, true); r.setUint32(20, o.compressed, true);
    r.setUint32(24, o.size, true); r.setUint16(28, names[i].length, true); r.setUint32(38, o.entry.attributes, true); r.setUint32(42, offsets[i], true);
    parts.push(record, names[i]);
    at += 46 + names[i].length;
  });
  const end = new Uint8Array(22);
  const e = view(end);
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, outs.length, true); e.setUint16(10, outs.length, true); e.setUint32(12, at - directoryStart, true); e.setUint32(16, directoryStart, true);
  parts.push(end);
  const out = new Uint8Array(at + 22);
  let position = 0;
  for (const p of parts) { out.set(p, position); position += p.length; }
  return out;
}
