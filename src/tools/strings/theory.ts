// Strings, frets and pitches for the mandolin and the violin, which are both tuned in fifths from G3 (the mandolin's strings come in pairs).
export type Instrument = "mandolin" | "violin";

// From the highest string (drawn at the top, as in a tab) to the lowest.
export const STRINGS = [
  { name: "E", midi: 76 },
  { name: "A", midi: 69 },
  { name: "D", midi: 62 },
  { name: "G", midi: 55 },
] as const;

export const MAX_SEMITONES = 14; // the part of the neck that is drawn: up to this many semitones above the open string
const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export const noteName = (midi: number) => `${NOTES[((Math.round(midi) % 12) + 12) % 12]}${Math.floor(Math.round(midi) / 12) - 1}`;
export const frequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

// A string of length 1 stopped at distance d from the nut sounds s semitones up, where d = 1 - 2^(-s/12); the neck drawn stops at MAX_SEMITONES.
const REACH = 1 - 2 ** (-MAX_SEMITONES / 12);
// u is how far along the drawn neck, 0 at the nut and 1 at its end.
export const positionOf = (semitones: number) => (1 - 2 ** (-semitones / 12)) / REACH;
export const semitonesAt = (u: number) => -12 * Math.log2(1 - Math.min(Math.max(u, 0), 1) * REACH);

// Where a press at u lands. Behind the nut (u < 0) is the open string; on a fretted instrument the finger stands between two frets and the
// note is the fret just above it; on a fretless one the pitch is wherever the finger is, or the nearest semitone when it is helped.
export function pressed(instrument: Instrument, u: number, snap: boolean): number {
  if (u <= 0) return 0;
  const semitones = semitonesAt(u);
  if (instrument === "mandolin") return Math.min(MAX_SEMITONES, Math.max(1, Math.ceil(semitones - 1e-9)));
  return snap ? Math.round(semitones) : semitones;
}

// The string nearest to a height v (0 at the top of the neck, 1 at the bottom), when the strings are spaced evenly with half a gap at each edge.
export const stringAt = (v: number) => Math.min(STRINGS.length - 1, Math.max(0, Math.floor(v * STRINGS.length)));
