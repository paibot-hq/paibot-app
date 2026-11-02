// The worker is made in a .client module so the server build (an empty module in its place) does not carry SQLite.
export const createSqlWorker = () => new Worker(new URL("./sql.worker.ts", import.meta.url), { type: "module" });
export const createPostgresWorker = () => new Worker(new URL("./postgres.worker.ts", import.meta.url), { type: "module" });
