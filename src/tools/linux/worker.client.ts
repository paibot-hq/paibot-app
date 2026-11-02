export const createLinuxWorker = () => new Worker(new URL('./linux.worker.ts', import.meta.url), { type: 'module' });
