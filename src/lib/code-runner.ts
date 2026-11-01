// What the code runners (src/tools/python, javascript, typescript, sql) share: the pieces of output a run produces, the
// interface the page (src/components/code-playground.tsx) drives, and the code-in-the-link used by "copy link".
// Code always runs in a Web Worker of its own: the page stays responsive, and a run that does not end is stopped by
// ending the worker. A worker is a same-origin file under /assets, which is served without the pages' CSP, so it can
// compile WebAssembly and evaluate code that the page itself may not.

export type OutputItem =
  | { kind: "stdout" | "stderr" | "info"; text: string }
  | { kind: "error"; text: string; line?: number }
  | { kind: "table"; columns: string[]; rows: unknown[][]; total: number }
  // A statement that changed rows (SQL), and the mark that the rest of a long output was left out; the page words both.
  | { kind: "changed"; count: number }
  | { kind: "limit" };

export type RunResult = { ok: boolean; line?: number };

export type Runner = {
  // Loads what the language needs (Python's interpreter, SQLite) before the first run; the page shows it as getting ready.
  prepare?: () => Promise<void>;
  run: (code: string, stdin: string, emit: (item: OutputItem) => void) => Promise<RunResult>;
  stop: () => void;
};

// The messages a worker sends while it runs code; "done" ends the run.
export type WorkerMessage = { type: "ready" } | { type: "output"; item: OutputItem } | { type: "done"; result: RunResult };

// At most this much text is kept from one run; a loop that prints forever is cut off rather than filling the page.
export const MAX_OUTPUT = 200_000;

// Batches a worker's text output into a few messages a second, and stops passing it on past MAX_OUTPUT.
export function outputBuffer(post: (item: OutputItem) => void) {
  let pending: { kind: "stdout" | "stderr"; text: string } | null = null;
  let size = 0, timer: ReturnType<typeof setTimeout> | null = null, cut = false;
  const flush = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    if (pending) { post(pending); pending = null; }
  };
  return {
    write(kind: "stdout" | "stderr", text: string) {
      if (cut || !text) return;
      if (size + text.length > MAX_OUTPUT) { text = text.slice(0, MAX_OUTPUT - size); cut = true; }
      size += text.length;
      if (pending && pending.kind !== kind) flush();
      pending = pending ? { kind, text: pending.text + text } : { kind, text };
      if (cut) { flush(); post({ kind: "limit" }); }
      else if (!timer) timer = setTimeout(flush, 50);
    },
    flush,
  };
}

// A runner over a worker that loads once and runs many times (Python, SQL); stop() ends it and the next run starts a new one.
export function workerRunner(create: () => Worker, message: (code: string, stdin: string) => unknown): Runner {
  let worker: Worker | null = null;
  let ready: Promise<void> | null = null;
  let finish: ((result: RunResult) => void) | null = null;
  let emit: ((item: OutputItem) => void) | null = null;

  function start() {
    worker = create();
    ready = new Promise((resolve, reject) => {
      worker!.onmessage = ({ data }: MessageEvent<WorkerMessage>) => {
        if (data.type === "ready") resolve();
        else if (data.type === "output") emit?.(data.item);
        else if (data.type === "done") { const done = finish; finish = null; done?.(data.result); }
      };
      worker!.onerror = event => { event.preventDefault(); reject(new Error(event.message)); const done = finish; finish = null; done?.({ ok: false }); };
    });
    return ready;
  }
  const runner: Runner = {
    prepare: () => ready ?? start(),
    async run(code, stdin, onOutput) {
      await runner.prepare!();
      emit = onOutput;
      return new Promise(resolve => {
        finish = resolve;
        worker!.postMessage(message(code, stdin));
      });
    },
    stop() {
      worker?.terminate();
      worker = null;
      ready = null;
      const done = finish;
      finish = null;
      done?.({ ok: false });
    },
  };
  return runner;
}

// The code in a link: deflated and base64url-encoded after "#code=", so a link holds a fair-sized program and never reaches the server.
export async function encodeCode(code: string) {
  const stream = new Blob([code]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function decodeCode(text: string) {
  const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(stream).text();
}
