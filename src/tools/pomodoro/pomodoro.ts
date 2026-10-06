// The Pomodoro technique: a focus session, then a short break; after every fourth focus session, a long break.

export type Phase = "focus" | "short" | "long";
export type Plan = { focus: number; short: number; long: number; every: number };
export const DEFAULT_PLAN: Plan = { focus: 25, short: 5, long: 15, every: 4 };

// The seconds a phase lasts.
export function seconds(phase: Phase, plan: Plan): number {
  return Math.max(1, Math.round(plan[phase] * 60));
}

// What comes after `phase`, and how many focus sessions are done by then: a finished focus session counts, and after
// every `plan.every`-th one the break is the long one.
export function next(phase: Phase, done: number, plan: Plan): { phase: Phase; done: number } {
  if (phase !== "focus") return { phase: "focus", done };
  const finished = done + 1;
  return { phase: finished % Math.max(1, plan.every) === 0 ? "long" : "short", done: finished };
}

// The seconds left until `endsAt` (a time in ms), never below 0; computed from the clock, not from counting ticks,
// so a tab that was in the background still shows the true time.
export function remaining(endsAt: number, now: number): number {
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

export function clock(total: number): string {
  const safe = Math.max(0, Math.floor(total));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

// The share of a phase that has passed (0 to 1), for the ring.
export function progress(left: number, whole: number): number {
  return whole <= 0 ? 1 : Math.min(1, Math.max(0, 1 - left / whole));
}

// Keeps a typed number of minutes in a sensible range.
export function minutes(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.min(180, Math.max(1, Math.round(value))) : fallback;
}
