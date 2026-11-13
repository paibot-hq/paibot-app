# SQL practice

SQLite remains the default (`sql` editor id, preserving old saved code and links).
PostgreSQL uses the `postgres` editor id. CodePlayground keeps each editor and the
selected engine in localStorage; shared links include the engine. Old `#code=`
links without an engine still open in SQLite.

Both engines run in module workers and start from `sampleSql(locale)` on every
run. PostgreSQL uses PGlite with same-origin bundled wasm/initdb/filesystem assets.
The compiled modules are reused, but each run gets a fresh in-memory cluster so
arbitrary schema, transaction and setting changes do not affect subsequent runs.
No remote database is contacted. Only selecting PostgreSQL loads its assets.

`POSTGRES_EXAMPLES` adapts the monthly aggregation to PostgreSQL's date syntax.
Results preserve column positions (including duplicate names), show up to 500
rows per table, format JSON/arrays as JSON, and use per-statement row counts.
Stop or switching away from a running query terminates its worker.

`sql.test.mjs` runs every example against both real engines. `e2e.mjs` also checks
switching, separate editors, PostgreSQL-specific types, sample resets, errors,
row truncation, cancellation/restart and compatibility with old SQLite links.
