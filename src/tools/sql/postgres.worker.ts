/// <reference lib="webworker" />
import { PGlite } from '@electric-sql/pglite';
import type { WorkerMessage } from '../../lib/code-runner';

// Bundled same-origin assets; no CDN or database server. Compile once, but create a
// fresh in-memory cluster for every run, including after user SQL changes schemas/settings.
const assets = import.meta.glob('/node_modules/@electric-sql/pglite/dist/{pglite.wasm,initdb.wasm,pglite.data}', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
async function load(name: string) {
  const response = await fetch(assets[`/node_modules/@electric-sql/pglite/dist/${name}`]);
  if (!response.ok) throw new Error(`Unable to load PostgreSQL (${response.status})`);
  return response;
}
const options = Promise.all([
  load('pglite.wasm').then(WebAssembly.compileStreaming),
  load('initdb.wasm').then(WebAssembly.compileStreaming),
  load('pglite.data').then(response => response.blob()),
]).then(([pgliteWasmModule, initdbWasmModule, fsBundle]) => ({ pgliteWasmModule, initdbWasmModule, fsBundle }));
let initial: PGlite | null = null;
const post = (message: WorkerMessage) => postMessage(message);
const ready = options.then(async config => { initial = await PGlite.create(config); post({ type: 'ready' }); });
ready.catch(error => setTimeout(() => { throw error; }));

function cell(value: unknown): unknown {
  if (value instanceof Uint8Array) return `<blob ${value.length} bytes>`;
  if (value instanceof Date) return value.toISOString();
  if (value !== null && typeof value === 'object') return JSON.stringify(value);
  return value;
}

self.onmessage = async ({ data }: MessageEvent<{ code: string; setup: string }>) => {
  let db: PGlite | null = null;
  try {
    await ready;
    db = initial ?? await PGlite.create(await options);
    initial = null;
    await db.exec(data.setup);
    const results = await db.exec(data.code, { rowMode: 'array' });
    for (const result of results) {
      if (result.fields.length) post({ type: 'output', item: {
        kind: 'table', columns: result.fields.map(field => field.name),
        rows: (result.rows as unknown[][]).slice(0, 500).map(row => row.map(cell)), total: result.rows.length,
      } });
      else if (result.command && /^(INSERT|UPDATE|DELETE|MERGE|COPY)$/.test(result.command)) post({ type: 'output', item: { kind: 'changed', count: result.rowCount ?? result.affectedRows ?? 0 } });
    }
    post({ type: 'done', result: { ok: true } });
  } catch (error) {
    const position = Number((error as { position?: string })?.position);
    const line = Number.isInteger(position) && position > 0 ? Array.from(data.code).slice(0, position - 1).join('').split('\n').length : undefined;
    const text = `${error instanceof Error ? error.message : String(error)}${line ? ` (line ${line})` : ''}`;
    post({ type: 'output', item: { kind: 'error', text, line } });
    post({ type: 'done', result: { ok: false, line } });
  } finally {
    await db?.close();
  }
};
