/// <reference lib="webworker" />
// Python (CPython compiled to WebAssembly: Pyodide) in a worker that stays loaded between runs. Pyodide's own files come
// from this site (/pyodide/<version>/, vite.config.ts); a package the code imports beyond the standard library (numpy,
// pandas ...) is fetched from Pyodide's CDN the first time, as the code names it.
import { outputBuffer, type WorkerMessage } from "../../lib/code-runner";
import { cleanTraceback } from "./traceback";

declare const __PYODIDE_VERSION__: string;
const BASE = `/pyodide/${__PYODIDE_VERSION__}/`;
const CDN = `https://cdn.jsdelivr.net/pyodide/v${__PYODIDE_VERSION__}/full/`;

type PyProxy = { set(key: string, value: unknown): void; destroy(): void };
type Pyodide = {
  setStdout(options: { write(buffer: Uint8Array): number }): void;
  setStderr(options: { write(buffer: Uint8Array): number }): void;
  setStdin(options: { read(buffer: Uint8Array): number }): void;
  loadPackagesFromImports(code: string, options: { messageCallback(message: string): void; errorCallback(message: string): void }): Promise<unknown>;
  runPythonAsync(code: string, options: { globals: PyProxy; filename: string }): Promise<unknown>;
  globals: { get(name: "dict"): () => PyProxy };
};

const post = (message: WorkerMessage) => postMessage(message);

const pyodide: Promise<Pyodide> = (async () => {
  const { loadPyodide } = await import(/* @vite-ignore */ `${BASE}pyodide.mjs`);
  return loadPyodide({ indexURL: BASE, packageBaseUrl: CDN });
})();
// A failure to load is thrown outside the promise, so the page hears of it as the worker's error.
pyodide.then(() => post({ type: "ready" }), error => setTimeout(() => { throw error; }));

self.onmessage = async ({ data }: MessageEvent<{ code: string; stdin: string }>) => {
  const py = await pyodide;
  const out = outputBuffer(item => post({ type: "output", item }));
  const writer = (kind: "stdout" | "stderr") => {
    const decoder = new TextDecoder();
    return { write(buffer: Uint8Array) { out.write(kind, decoder.decode(buffer, { stream: true })); return buffer.length; } };
  };
  py.setStdout(writer("stdout"));
  py.setStderr(writer("stderr"));
  const input = new TextEncoder().encode(data.stdin);
  let at = 0;
  py.setStdin({ read(buffer) { const n = Math.min(buffer.length, input.length - at); buffer.set(input.subarray(at, at + n)); at += n; return n; } });

  // Each run starts with empty globals, as a fresh "python main.py" would (modules already imported stay loaded).
  const globals = py.globals.get("dict")();
  globals.set("__name__", "__main__");
  let result: { ok: boolean; line?: number } = { ok: true };
  try {
    await py.loadPackagesFromImports(data.code, {
      messageCallback: message => { out.flush(); post({ type: "output", item: { kind: "info", text: message } }); },
      errorCallback: message => out.write("stderr", `${message}\n`),
    });
    await py.runPythonAsync(data.code, { globals, filename: "main.py" });
  } catch (error) {
    const { text, line } = cleanTraceback(error instanceof Error ? error.message : String(error));
    out.flush();
    post({ type: "output", item: { kind: "error", text, line } });
    result = { ok: false, line };
  } finally {
    globals.destroy();
  }
  out.flush();
  post({ type: "done", result });
};
