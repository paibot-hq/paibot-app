/// <reference lib="webworker" />
// Runs one JavaScript program (the JavaScript runner's code, or the TypeScript runner's after it is compiled) and then
// is thrown away, so nothing from one run is left for the next. The program sees console, input() and require("fs")
// for standard input, the way programs on paiza and AtCoder read it; the run ends when the code and its timers are done.
import { format } from "./js-inspect";
import { outputBuffer, type WorkerMessage } from "./code-runner";

const post = (message: WorkerMessage) => postMessage(message);
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (...args: string[]) => (...args: unknown[]) => Promise<unknown>;
const PARAMS = ["console", "input", "prompt", "require"];

// Where the code's own line 1 is in a stack trace: the engine puts a header above the body of a function made from text
// (the same for async ones), found once by throwing on the first line of a plain one.
const HEADER = (() => {
  try { new Function(...PARAMS, "throw new Error()")(); } catch (error) { return Math.max(0, (lineOf(error, 0) ?? 1) - 1); }
  return 0;
})();

function lineOf(error: unknown, header: number) {
  const stack = error instanceof Error ? error.stack ?? "" : "";
  const match = /(?:<anonymous>|anonymous|AsyncFunction|Function):(\d+):\d+/.exec(stack);
  return match ? Number(match[1]) - header : undefined;
}

self.onmessage = async ({ data }: MessageEvent<{ code: string; stdin: string; lines: boolean }>) => {
  const out = outputBuffer(item => post({ type: "output", item }));
  const lines = data.stdin.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n");
  let next = 0;
  const input = () => (data.stdin !== "" && next < lines.length ? lines[next++] : null);
  const log = (...args: unknown[]) => out.write("stdout", `${format(args)}\n`);
  const warn = (...args: unknown[]) => out.write("stderr", `${format(args)}\n`);
  const counts = new Map<string, number>();
  const shim = {
    log, info: log, debug: log, dir: log, table: log, trace: warn, warn, error: warn,
    count: (label = "default") => { counts.set(label, (counts.get(label) ?? 0) + 1); log(`${label}: ${counts.get(label)}`); },
    time() {}, timeEnd() {}, group: log, groupEnd() {}, assert: (ok: unknown, ...args: unknown[]) => { if (!ok) warn("Assertion failed", ...args); },
  };
  const require = (name: string) => {
    if (name === "fs" || name === "node:fs") return { readFileSync: (path: unknown) => { if (path === 0 || path === "/dev/stdin") return data.stdin; throw new Error(`ENOENT: no such file or directory, open '${String(path)}'`); } };
    throw new Error(`Cannot find module '${name}'`);
  };

  // The run is over when the code has finished and no timer it set is still waiting.
  let timers = 0, settle: (() => void) | null = null;
  const live = new Set<number>();
  const check = () => { if (timers === 0 && live.size === 0) settle?.(); };
  const realTimeout = self.setTimeout.bind(self), realClear = self.clearTimeout.bind(self), realInterval = self.setInterval.bind(self), realClearInterval = self.clearInterval.bind(self);
  Object.assign(self, {
    setTimeout: (fn: (...a: unknown[]) => void, ms?: number, ...rest: unknown[]) => {
      timers++;
      const id = realTimeout(() => { timers--; live.delete(id); try { fn(...rest); } catch (error) { report(error); } check(); }, ms);
      live.add(id);
      return id;
    },
    clearTimeout: (id: number) => { if (live.delete(id)) timers--; realClear(id); check(); },
    setInterval: (fn: (...a: unknown[]) => void, ms?: number, ...rest: unknown[]) => {
      const id = realInterval(() => { try { fn(...rest); } catch (error) { report(error); } }, ms);
      live.add(id);
      return id;
    },
    clearInterval: (id: number) => { live.delete(id); realClearInterval(id); check(); },
  });

  let failed: number | undefined | null = null;
  function report(error: unknown) {
    const line = data.lines ? lineOf(error, HEADER) : undefined;
    failed = line;
    const text = error instanceof Error ? `${error.name}: ${error.message}` : `Uncaught ${format([error])}`;
    out.flush();
    post({ type: "output", item: { kind: "error", text: line ? `${text} (line ${line})` : text, line } });
  }
  self.addEventListener("unhandledrejection", event => { event.preventDefault(); report(event.reason); });

  try {
    const run = new AsyncFunction(...PARAMS, data.code);
    await run(shim, input, input, require);
  } catch (error) {
    report(error);
  }
  await new Promise<void>(resolve => { settle = resolve; check(); });
  out.flush();
  post({ type: "done", result: failed === null ? { ok: true } : { ok: false, line: failed } });
};
