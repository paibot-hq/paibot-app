// The workers are made in a .client module so the server build (an empty module in its place) does not carry them.
export const createPythonWorker = () => new Worker(new URL("./python.worker.ts", import.meta.url), { type: "module" });
export const createTsWorker = () => new Worker(new URL("./ts.worker.ts", import.meta.url), { type: "module" });
