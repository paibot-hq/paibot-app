// The worker is made in a .client module so the server build (an empty module in its place) does not carry it.
export const createJsWorker = () => new Worker(new URL("./js-run.worker.ts", import.meta.url), { type: "module" });
