// The worker is made in a .client module so the server build (an empty module in its place) does not carry Transformers.js.
export const createLlmWorker = () => new Worker(new URL("./llm.worker.ts", import.meta.url), { type: "module" });
