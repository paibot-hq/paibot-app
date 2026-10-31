import type { Compile } from "../../lib/js-runner";
import { createTsWorker } from "./worker.client";

type Checked = { type: "checked"; problems: { line?: number; text: string }[]; js: string };

// The TypeScript compiler's worker (ts.worker.ts), loaded once; a stopped run only ends the program's own worker, unless
// it was still being checked.
export function compiler(locale: string) {
  let worker: Worker | null = null;
  let ready: Promise<void> | null = null;
  let pending: ((data: Checked | null) => void) | null = null;
  const start = () => {
    worker = createTsWorker();
    ready = new Promise((resolve, reject) => {
      worker!.onmessage = ({ data }: MessageEvent<{ type: "ready" } | Checked>) => {
        if (data.type === "ready") resolve();
        else { const done = pending; pending = null; done?.(data); }
      };
      worker!.onerror = event => { event.preventDefault(); reject(new Error(event.message)); };
    });
    worker.postMessage({ type: "init", locale });
    return ready;
  };
  const prepare = () => ready ?? start();
  const compile: Compile = async (code, emit) => {
    await prepare();
    const data = await new Promise<Checked | null>(resolve => { pending = resolve; worker!.postMessage({ type: "check", code }); });
    if (!data) return null;
    for (const problem of data.problems) emit({ kind: "error", text: problem.text, line: problem.line });
    // Type errors do not stop the run (as in the TypeScript playground), but the run is reported as having them.
    return { js: data.js, result: data.problems.length ? { ok: false, line: data.problems[0].line } : undefined };
  };
  const stop = () => {
    if (!pending) return;
    worker?.terminate();
    worker = null;
    ready = null;
    const done = pending;
    pending = null;
    done(null);
  };
  return { prepare, compile, stop };
}
