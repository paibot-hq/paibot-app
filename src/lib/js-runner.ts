import type { OutputItem, Runner, RunResult, WorkerMessage } from "./code-runner";
import { createJsWorker } from "./js-run-worker.client";

// Runs JavaScript in a new worker each time (src/lib/js-run.worker.ts): starting one is quick, and stopping a run is ending it.
// `compile` turns the code into JavaScript first (TypeScript), reporting what it found along the way; null when it was stopped.
// Its line numbers are not the code's, so a run-time error of compiled code is not pinned to a line.
export type Compile = (code: string, emit: (item: OutputItem) => void) => Promise<{ js: string; result?: RunResult } | null>;

export function jsRunner(compile?: { prepare: () => Promise<void>; compile: Compile; stop: () => void }): Runner {
  let worker: Worker | null = null;
  let finish: ((result: RunResult) => void) | null = null;
  const end = (result: RunResult) => { const done = finish; finish = null; worker?.terminate(); worker = null; done?.(result); };
  return {
    prepare: compile?.prepare,
    async run(code, stdin, emit) {
      let js = code, checked: RunResult | undefined;
      if (compile) {
        const compiled = await compile.compile(code, emit);
        if (!compiled) return { ok: false };
        ({ js, result: checked } = compiled);
      }
      return new Promise<RunResult>(resolve => {
        finish = result => resolve(result.ok && checked ? checked : compile ? { ok: result.ok } : result);
        worker = createJsWorker();
        worker.onmessage = ({ data }: MessageEvent<WorkerMessage>) => {
          if (data.type === "output") emit(data.item);
          else if (data.type === "done") end(data.result);
        };
        worker.onerror = event => { event.preventDefault(); emit({ kind: "error", text: event.message }); end({ ok: false }); };
        worker.postMessage({ code: js, stdin, lines: !compile });
      });
    },
    stop() {
      compile?.stop();
      end({ ok: false });
    },
  };
}
