// The worker is made in a .client module so the server build (an empty module in its place) does not carry the compiler.
export const createTsWorker = () => new Worker(new URL("./ts.worker.ts", import.meta.url), { type: "module" });
