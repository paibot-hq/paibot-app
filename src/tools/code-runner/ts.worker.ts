/// <reference lib="webworker" />
// Type-checks the TypeScript runner's code and turns it into JavaScript, with the TypeScript compiler (5.9, the last
// version written in JavaScript; the app's own typecheck uses 7). It stays loaded between runs: the compiler and its
// standard library are read once. The run itself happens in src/lib/js-run.worker.ts.
import ts from "typescript5";

const LIBS = import.meta.glob("/node_modules/typescript5/lib/lib.{es,decorators}*.d.ts", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const MESSAGES = import.meta.glob("/node_modules/typescript5/lib/{ja,zh-cn}/diagnosticMessages.generated.json", { query: "?raw", import: "default" }) as Record<string, () => Promise<string>>;

// What the runner provides beyond the language: console, standard input and the timers.
const GLOBALS = `
declare var console: { log(...data: any[]): void; info(...data: any[]): void; debug(...data: any[]): void; warn(...data: any[]): void; error(...data: any[]): void; table(...data: any[]): void; dir(...data: any[]): void; count(label?: string): void; assert(condition?: boolean, ...data: any[]): void };
/** One line of the standard input box, or null when there is no more. */
declare function input(): string | null;
declare function prompt(): string | null;
declare function require(name: "fs"): { readFileSync(path: "/dev/stdin" | 0, encoding?: string): string };
declare function setTimeout(handler: (...args: any[]) => void, timeout?: number, ...args: any[]): number;
declare function clearTimeout(id?: number): void;
declare function setInterval(handler: (...args: any[]) => void, timeout?: number, ...args: any[]): number;
declare function clearInterval(id?: number): void;
declare function queueMicrotask(callback: () => void): void;
declare function structuredClone<T>(value: T): T;
declare var performance: { now(): number };
`;

const files = new Map<string, string>(Object.entries(LIBS).map(([path, text]) => [path.slice(path.lastIndexOf("/") + 1), text]));
files.set("globals.d.ts", GLOBALS);
const LIB = "lib.es2023.d.ts";
const OPTIONS: ts.CompilerOptions = { target: ts.ScriptTarget.ES2022, lib: [LIB], strict: true, noEmit: true, types: [], skipDefaultLibCheck: true };
// Top-level await is allowed: the code runs inside an async function, not as a module.
const IGNORED = new Set([1375, 1378]);
const parsed = new Map<string, ts.SourceFile>();
const base = (name: string) => name.slice(name.lastIndexOf("/") + 1);

function check(code: string) {
  const host: ts.CompilerHost = {
    getSourceFile(name, language) {
      if (base(name) === "main.ts") return ts.createSourceFile("main.ts", code, language);
      const key = base(name), text = files.get(key);
      if (text === undefined) return undefined;
      if (!parsed.has(key)) parsed.set(key, ts.createSourceFile(key, text, language));
      return parsed.get(key);
    },
    getDefaultLibFileName: () => LIB,
    getDefaultLibLocation: () => "",
    writeFile() {},
    getCurrentDirectory: () => "",
    getCanonicalFileName: name => name,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => "\n",
    fileExists: name => base(name) === "main.ts" || files.has(base(name)),
    readFile: name => (base(name) === "main.ts" ? code : files.get(base(name))),
  };
  const program = ts.createProgram(["main.ts", "globals.d.ts"], OPTIONS, host);
  const diagnostics = ts.getPreEmitDiagnostics(program).filter(d => !IGNORED.has(d.code) && (!d.file || d.file.fileName === "main.ts"));
  const problems = diagnostics.map(d => {
    const line = d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start).line + 1 : undefined;
    return { line, text: `${line ? `${line}: ` : ""}TS${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}` };
  });
  const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, removeComments: false }, reportDiagnostics: false }).outputText;
  return { problems, js };
}

self.onmessage = async ({ data }: MessageEvent<{ type: "init"; locale: string } | { type: "check"; code: string }>) => {
  if (data.type === "init") {
    const folder = data.locale === "ja" ? "ja" : data.locale === "zh" ? "zh-cn" : null;
    const load = folder ? MESSAGES[`/node_modules/typescript5/lib/${folder}/diagnosticMessages.generated.json`] : undefined;
    if (load && folder) {
      const text = await load();
      ts.validateLocaleAndSetLanguage(folder, {
        getExecutingFilePath: () => "/lib/typescript.js",
        resolvePath: path => path,
        fileExists: path => path.endsWith(`${folder}/diagnosticMessages.generated.json`),
        readFile: path => (path.endsWith(`${folder}/diagnosticMessages.generated.json`) ? text : undefined),
      });
    }
    check("");
    postMessage({ type: "ready" });
    return;
  }
  postMessage({ type: "checked", ...check(data.code) });
};
