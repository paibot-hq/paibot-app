import { findUnit } from './math-catalog';

// The practice set to go back to from the math list ("Continue"): the one last opened, or after finishing one, the next.
// Kept in this browser only; ids that are no longer in the catalog are ignored.
const KEY = 'math-resume:v1';

export interface MathResume { unit: string; item: string; set: string }

export function readResume(): MathResume | null {
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) ?? 'null') as MathResume | null;
    const item = value && findUnit(value.unit)?.items.find(entry => entry.id === value.item);
    return item && item.sets.some(set => set.id === value.set) ? value : null;
  } catch { return null; }
}

export function saveResume(value: MathResume) {
  try { window.localStorage.setItem(KEY, JSON.stringify(value)); } catch { /* storage blocked */ }
}
