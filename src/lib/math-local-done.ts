import { useEffect, useState } from 'react';

// The practice sets finished in this browser, as "unit/item/set", so that they turn green for a visitor who is not signed in too.
// A signed-in visitor's finished sets come from D1 (getDoneSets); the pages show both.
const KEY = 'math-done:v1';

function read(): string[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(value) ? value.filter(entry => typeof entry === 'string') : [];
  } catch { return []; }
}

export function markSetDone(set: string) {
  const done = read();
  if (done.includes(set)) return;
  try { window.localStorage.setItem(KEY, JSON.stringify([...done, set])); } catch { /* storage blocked */ }
}

// The server's finished sets, joined after hydration by this browser's.
export function useDoneSets(server: readonly string[]): readonly string[] {
  const [local, setLocal] = useState<string[]>([]);
  useEffect(() => { setLocal(read()); }, []);
  return local.length ? [...new Set([...server, ...local])] : server;
}
