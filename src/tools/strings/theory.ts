// Pitches and the neck, for any instrument in instruments.ts.
import type { InstrumentSpec, StringSpec } from "./instruments";

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export const noteName = (midi: number) => `${NOTES[((Math.round(midi) % 12) + 12) % 12]}${Math.floor(Math.round(midi) / 12) - 1}`;
export const frequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

// A string of length 1 stopped at distance d from the nut sounds s semitones up, where d = 1 - 2^(-s/12); the neck drawn stops `reach` semitones up.
const stretch = (reach: number) => 1 - 2 ** (-reach / 12);
// u is how far along the drawn neck, 0 at the nut and 1 at its end.
export const positionOf = (semitones: number, reach: number) => (1 - 2 ** (-semitones / 12)) / stretch(reach);
export const semitonesAt = (u: number, reach: number) => -12 * Math.log2(1 - Math.min(Math.max(u, 0), 1) * stretch(reach));

// How many semitones above the string's open note a press at u is. Behind the nut (u < 0) is the open string. On a fretted instrument the
// finger stands between two frets and the note is the fret just above it (a string that starts at a fret, like a banjo's drone, counts from
// there); on a fretless one the pitch is wherever the finger is, or the nearest semitone when it is helped.
export function pressed(instrument: InstrumentSpec, string: StringSpec, u: number, snap: boolean): number {
  if (u <= 0) return 0;
  const semitones = semitonesAt(u, instrument.reach);
  if (instrument.fretted) {
    const fret = Math.min(instrument.reach, Math.max(1, Math.ceil(semitones - 1e-9)));
    return Math.max(0, fret - (string.from ?? 0));
  }
  return snap ? Math.round(semitones) : semitones;
}

// The string nearest to a height v (0 at the top of the neck, 1 at the bottom), when the strings are spaced evenly.
export const stringAt = (v: number, count: number) => Math.min(count - 1, Math.max(0, Math.floor(v * count)));
