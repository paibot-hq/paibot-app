"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useTranslations } from "use-intl";
import ToolLayout from "./tool-layout";
import controls from "./tool-controls.module.css";
import styles from "./code-playground.module.css";
import { decodeCode, encodeCode, type OutputItem, type Runner } from "../lib/code-runner";

// The page of a code runner (Python, JavaScript, TypeScript, SQL): an editor, standard input, a run button and the
// output. What runs the code is the tool's Runner (src/lib/code-runner.ts); everything on the page is shared.

export type PlaygroundExample = { id: string; label: string; code: string; stdin?: string };

type Props = {
  title: string;
  intro: string;
  language: string; // the language's name, for "getting Python ready"
  storageKey: string; // where the code last written is kept in this browser
  examples: PlaygroundExample[];
  runner: Runner;
  indent: string; // what Tab inserts
  opensBlock: RegExp; // a line ending like this indents the next one (":" in Python, "{" in JavaScript)
  stdin?: boolean;
  aside?: ReactNode; // shown beside the output (the SQL tables)
  hint?: ReactNode;
};

type Status = "preparing" | "failedToLoad" | "idle" | "running" | "done" | "error" | "stopped";

function load(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function save(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
}

export default function CodePlayground({ title, intro, language, storageKey, examples, runner, indent, opensBlock, stdin: hasStdin = false, aside, hint }: Props) {
  const t = useTranslations("App.codePlayground");
  const [code, setCode] = useState(examples[0].code);
  const [stdin, setStdin] = useState(examples[0].stdin ?? "");
  const [output, setOutput] = useState<OutputItem[]>([]);
  const [status, setStatus] = useState<Status>(runner.prepare ? "preparing" : "idle");
  const [elapsed, setElapsed] = useState(0);
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const stoppedRef = useRef(false);
  const tabLeaves = useRef(false);

  // The code from a shared link first, then what was last written here, else the first example.
  useEffect(() => {
    const shared = /^#code=([\w-]+)$/.exec(location.hash)?.[1];
    if (shared) decodeCode(shared).then(setCode).catch(() => { /* a broken link keeps the example */ });
    else {
      const saved = load(`${storageKey}:code`);
      if (saved !== null) setCode(saved);
      const savedInput = load(`${storageKey}:stdin`);
      if (savedInput !== null) setStdin(savedInput);
    }
    if (runner.prepare) runner.prepare().then(() => setStatus(current => (current === "preparing" ? "idle" : current)), () => setStatus("failedToLoad"));
    return () => runner.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function edit(value: string) {
    setCode(value);
    setErrorLine(null);
    save(`${storageKey}:code`, value);
  }
  function editInput(value: string) {
    setStdin(value);
    save(`${storageKey}:stdin`, value);
  }

  async function run() {
    if (status === "running") return;
    stoppedRef.current = false;
    setOutput([]);
    setErrorLine(null);
    setStatus("running");
    const started = performance.now();
    try {
      const result = await runner.run(code, stdin, item => setOutput(list => [...list, item]));
      setElapsed(Math.round(performance.now() - started));
      setErrorLine(result.line ?? null);
      setStatus(stoppedRef.current ? "stopped" : result.ok ? "done" : "error");
    } catch {
      setStatus("failedToLoad");
    }
  }
  function stop() {
    stoppedRef.current = true;
    runner.stop();
  }

  function open(id: string) {
    const example = examples.find(e => e.id === id);
    if (!example) return;
    edit(example.code);
    editInput(example.stdin ?? "");
    setOutput([]);
    if (status !== "preparing" && status !== "failedToLoad") setStatus("idle");
  }

  async function copyLink() {
    const url = `${location.origin}${location.pathname}#code=${await encodeCode(code)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* clipboard refused */ }
  }

  // Typing that keeps the browser's undo history: execCommand where it works, else a plain replacement.
  function type(editor: HTMLTextAreaElement, text: string, from = editor.selectionStart, to = editor.selectionEnd) {
    editor.setSelectionRange(from, to);
    if (!document.execCommand("insertText", false, text)) {
      editor.setRangeText(text, from, to, "end");
      edit(editor.value);
    }
  }

  function keys(event: KeyboardEvent<HTMLTextAreaElement>) {
    const editor = event.currentTarget;
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); run(); return; }
    if (event.key === "Escape") { tabLeaves.current = true; return; }
    if (event.key === "Tab" && !tabLeaves.current) {
      event.preventDefault();
      const { selectionStart: start, selectionEnd: end, value } = editor;
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      if (start === end && !event.shiftKey) { type(editor, indent); return; }
      // Several lines (or Shift+Tab): indent or unindent each whole line.
      // A selection that ends just after a line break does not take in the next line.
      const lineEnd = value.indexOf("\n", end > start && value[end - 1] === "\n" ? end - 1 : end);
      const stop = lineEnd === -1 ? value.length : lineEnd;
      const lines = value.slice(lineStart, stop).split("\n");
      const changed = lines.map(line => (event.shiftKey ? line.replace(new RegExp(`^( {1,${indent.length}}|\\t)`), "") : indent + line)).join("\n");
      type(editor, changed, lineStart, stop);
      editor.setSelectionRange(lineStart, lineStart + changed.length);
      return;
    }
    tabLeaves.current = false;
    if (event.key === "Enter" && !event.shiftKey && !event.altKey && !event.nativeEvent.isComposing) {
      // A new line keeps the indentation of the one before, one step more after a line that opens a block.
      const { selectionStart: start, value } = editor;
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const before = value.slice(lineStart, start);
      const current = /^[ \t]*/.exec(before)![0];
      event.preventDefault();
      type(editor, `\n${current}${opensBlock.test(before.trimEnd()) ? indent : ""}`);
    }
  }

  const lineCount = code.split("\n").length;
  const busy = status === "running";
  const shown = merge(output);

  return (
    <ToolLayout title={title}>
      <p className={controls.label}>{intro}</p>
      <div className={styles.toolbar}>
        {busy
          ? <button type="button" className={styles.run} onClick={stop}>■ {t("stop")}</button>
          : <button type="button" className={styles.run} onClick={run} disabled={status === "preparing" || status === "failedToLoad"}>▶ {t("run")}</button>}
        <label className={styles.examples}>
          <span className={styles.visuallyHidden}>{t("examples")}</span>
          <select value="" onChange={event => open(event.target.value)} aria-label={t("examples")}>
            <option value="" disabled>{t("examples")}</option>
            {examples.map(example => <option key={example.id} value={example.id}>{example.label}</option>)}
          </select>
        </label>
        <button type="button" className={styles.secondary} onClick={copyLink}>{copied ? t("copied") : t("copyLink")}</button>
      </div>
      <div className={styles.workspace}>
        <div className={styles.editor}>
          <div ref={gutterRef} className={styles.gutter} aria-hidden="true">
            {Array.from({ length: lineCount }, (_, i) => <div key={i} data-error={errorLine === i + 1 || undefined}>{i + 1}</div>)}
          </div>
          <textarea
            ref={editorRef}
            className={styles.code}
            value={code}
            onChange={event => edit(event.target.value)}
            onKeyDown={keys}
            onScroll={event => { if (gutterRef.current) gutterRef.current.scrollTop = event.currentTarget.scrollTop; }}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            wrap="off"
            aria-label={t("editorLabel")}
          />
        </div>
        <div className={styles.side}>
          {aside}
          {hasStdin && (
            <label className={styles.stdin}>
              <span className={styles.heading}>{t("stdin")}</span>
              <textarea value={stdin} onChange={event => editInput(event.target.value)} spellCheck={false} wrap="off" rows={3} aria-label={t("stdin")} placeholder={t("stdinPlaceholder")} />
            </label>
          )}
          <section className={styles.output} aria-label={t("output")}>
            <div className={styles.outputHead}>
              <span className={styles.heading}>{t("output")}</span>
              <span className={styles.status} role="status" data-playground="status" data-state={status}>
                {status === "preparing" ? t("preparing", { language })
                  : status === "failedToLoad" ? t("failedToLoad", { language })
                  : status === "running" ? t("running")
                  : status === "done" ? t("done", { ms: elapsed })
                  : status === "error" ? t("error", { ms: elapsed })
                  : status === "stopped" ? t("stopped")
                  : ""}
              </span>
            </div>
            <div className={styles.result} data-playground="output">
              {shown.length === 0 && status !== "running" && <p className={styles.empty}>{t("empty")}</p>}
              {shown.map((item, index) => {
                if (item.kind === "table") return <ResultTable key={index} item={item} />;
                if (item.kind === "changed") return <p key={index} className={styles.note}>{t("changed", { count: item.count })}</p>;
                if (item.kind === "limit") return <p key={index} className={styles.note}>{t("limit")}</p>;
                return <pre key={index} className={styles.text} data-kind={item.kind}>{item.text}</pre>;
              })}
            </div>
          </section>
        </div>
      </div>
      <p className={controls.label}>{t("keys")}</p>
      {hint && <div className={styles.hint}>{hint}</div>}
    </ToolLayout>
  );
}

// Text written in many small pieces reads as one block per stream.
function merge(items: OutputItem[]) {
  const list: OutputItem[] = [];
  for (const item of items) {
    const last = list[list.length - 1];
    if (last && (item.kind === "stdout" || item.kind === "stderr") && last.kind === item.kind) list[list.length - 1] = { kind: item.kind, text: last.text + item.text };
    else list.push(item);
  }
  return list;
}

function ResultTable({ item }: { item: Extract<OutputItem, { kind: "table" }> }) {
  const t = useTranslations("App.codePlayground");
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead><tr>{item.columns.map((column, i) => <th key={i} scope="col">{column}</th>)}</tr></thead>
        <tbody>
          {item.rows.map((row, r) => <tr key={r}>{row.map((cell, c) => <td key={c} data-null={cell === null || undefined}>{cell === null ? "NULL" : String(cell)}</td>)}</tr>)}
        </tbody>
      </table>
      <p className={styles.note}>{item.total > item.rows.length ? t("rowsShown", { total: item.total, count: item.rows.length }) : t("rows", { count: item.total })}</p>
    </div>
  );
}
