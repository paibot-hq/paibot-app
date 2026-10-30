/// <reference lib="webworker" />
// SQLite (sql.js, compiled to WebAssembly) in a worker that stays loaded. Every run starts from a new database holding
// the sample shop, so a DELETE or DROP in one run is gone by the next. Each statement's rows come back as a table.
import initSqlJs, { type Database } from "sql.js";
import wasm from "sql.js/dist/sql-wasm-browser.wasm?url";
import type { WorkerMessage } from "../../lib/code-runner";

const MAX_ROWS = 500;
const post = (message: WorkerMessage) => postMessage(message);
const SQL = initSqlJs({ locateFile: () => wasm });
SQL.then(() => post({ type: "ready" }), error => setTimeout(() => { throw error; }));

const lineAt = (text: string, index: number) => text.slice(0, index).split("\n").length;

self.onmessage = async ({ data }: MessageEvent<{ code: string; setup: string }>) => {
  const sqlite = await SQL;
  let db: Database | null = null;
  // Where the statement being run starts, for the line of an error.
  let at = 0;
  try {
    db = new sqlite.Database();
    db.exec(data.setup);
    const statements = db.iterateStatements(data.code);
    let remaining = data.code;
    for (;;) {
      // Set before the statement is read, so an error in reading it (a syntax error) points at it too.
      at = data.code.length - remaining.trimStart().length;
      const next = statements.next();
      if (next.done) break;
      const statement = next.value;
      remaining = statements.getRemainingSQL();
      const columns = statement.getColumnNames();
      const rows: unknown[][] = [];
      let total = 0;
      while (statement.step()) {
        if (rows.length < MAX_ROWS) rows.push(statement.get().map(value => (value instanceof Uint8Array ? `<blob ${value.length} bytes>` : value)));
        total++;
      }
      if (columns.length > 0) post({ type: "output", item: { kind: "table", columns, rows, total } });
      else if (db.getRowsModified() > 0 && /^\s*(insert|update|delete|replace)\b/i.test(statement.getSQL())) post({ type: "output", item: { kind: "changed", count: db.getRowsModified() } });
      statement.free();
    }
    post({ type: "done", result: { ok: true } });
  } catch (error) {
    const line = lineAt(data.code, at);
    post({ type: "output", item: { kind: "error", text: `${error instanceof Error ? error.message : String(error)} (line ${line})`, line } });
    post({ type: "done", result: { ok: false, line } });
  } finally {
    db?.close();
  }
};
