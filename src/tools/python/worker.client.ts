// The worker is made in a .client module so the server build (an empty module in its place) does not carry it.
export const createPythonWorker = () => new Worker(new URL("./python.worker.ts", import.meta.url), { type: "module" });
