// The metronome's logic, apart from the page: the tempo range, the names of tempos, tap tempo, and the scheduling of clicks.
export const MIN_BPM = 30;
export const MAX_BPM = 300;
export const DEFAULT_BPM = 120;
export const BEATS_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export const clampBpm = (bpm: number) => Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(Number.isFinite(bpm) ? bpm : DEFAULT_BPM)));

export type Tempo = "grave" | "largo" | "larghetto" | "adagio" | "andante" | "moderato" | "allegro" | "vivace" | "presto" | "prestissimo";
const TEMPOS: [number, Tempo][] = [[40, "grave"], [60, "largo"], [66, "larghetto"], [76, "adagio"], [108, "andante"], [120, "moderato"], [156, "allegro"], [176, "vivace"], [200, "presto"]];

// The traditional name for a speed: the first range that the tempo is still below.
export function tempoName(bpm: number): Tempo {
  for (const [below, name] of TEMPOS) if (bpm < below) return name;
  return "prestissimo";
}

// A tap is a time in milliseconds. The tempo is that of the last few taps, and a pause starts the count again.
export const TAP_RESET_MS = 2000;
const TAP_KEEP = 6;
export function tap(taps: number[], now: number): { taps: number[]; bpm: number | null } {
  const last = taps[taps.length - 1];
  const next = (last !== undefined && now - last <= TAP_RESET_MS ? [...taps, now] : [now]).slice(-TAP_KEEP);
  if (next.length < 2) return { taps: next, bpm: null };
  const average = (next[next.length - 1]! - next[0]!) / (next.length - 1);
  return { taps: next, bpm: clampBpm(60000 / average) };
}

// Clicks are scheduled a little ahead on the audio clock (in seconds), which is exact, where a timer in the page is not.
export type Clock = { next: number; beat: number };
export type Click = { time: number; beat: number };
export function schedule(clock: Clock, now: number, ahead: number, bpm: number, beats: number): Click[] {
  const clicks: Click[] = [];
  // Late (the page was busy or hidden): start again from now, not with a burst of clicks to catch up.
  if (clock.next < now - 0.05) clock.next = now + 0.05;
  clock.beat %= beats;
  while (clock.next < now + ahead) {
    clicks.push({ time: clock.next, beat: clock.beat });
    clock.next += 60 / bpm;
    clock.beat = (clock.beat + 1) % beats;
  }
  return clicks;
}
