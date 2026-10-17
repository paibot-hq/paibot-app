// The instruments, as data: the strings (from the top of the picture to the bottom, as in a tab), whether the neck has frets, and what
// the sound is like. The page, the neck and the synth are all driven by this, so a new instrument is a new entry here and its name in the messages.

// How a plucked string sounds (see pluck.ts): `halfLife` is in seconds at 200 Hz, `shift` how much the loop averages (0.5 is dull, small is
// bright), `smooth` how soft the pick is (0 hard, 1 soft), `pick` where on the string it is plucked, `strings` how many strings sound together
// (a mandolin's course) and `spread` how far apart they are in cents.
export type PluckSound = {
  kind: "pluck";
  halfLife: number; shift: number; smooth: number; pick: number;
  strings: 1 | 2; spread: number;
  level: number;
  eq: [frequency: number, gain: number][];
};
// How a bowed string sounds: a filtered sawtooth that follows the pitch (`track` times the pitch, between `min` and `max`), `attack` seconds
// to come in, `hiss` of bow noise, `vibrato` cents deep.
export type BowSound = {
  kind: "bow";
  track: number; min: number; max: number; attack: number; hiss: number; vibrato: number;
  level: number;
  eq: [frequency: number, gain: number][];
};

export type StringSpec = { name: string; midi: number; from?: number }; // `from`: a string that starts at a fret (a banjo's drone)
export type Look = { wood: string; fret: string; string: string; even?: boolean; inlay: string };
export type InstrumentSpec = {
  id: InstrumentId;
  strings: StringSpec[];
  fretted: boolean;
  reach: number;      // how many semitones of the neck are drawn
  sound: PluckSound | BowSound;
  pizzicato?: PluckSound; // a bowed instrument can also be plucked
  tremolo?: boolean;  // the instrument has a tremolo (rolling picking)
  look: Look;
};

export const INSTRUMENT_IDS = ["mandolin", "violin", "viola", "cello", "doublebass", "guitar", "bass", "ukulele", "banjo", "shamisen"] as const;
export type InstrumentId = (typeof INSTRUMENT_IDS)[number];

const pizzicato = (eq: PluckSound["eq"]): PluckSound => ({ kind: "pluck", halfLife: 0.35, shift: 0.38, smooth: 0.5, pick: 0.3, strings: 1, spread: 0, level: 1.1, eq });
const wooden = (wood: string, extra: Partial<Look> = {}): Look => ({ wood, fret: "#cfd3d8", string: "#e3e6ea", inlay: "#efe6d2", ...extra });

export const INSTRUMENTS: Record<InstrumentId, InstrumentSpec> = {
  mandolin: {
    id: "mandolin", fretted: true, reach: 14, tremolo: true, look: wooden("#5b3a26"),
    strings: [{ name: "E", midi: 76 }, { name: "A", midi: 69 }, { name: "D", midi: 62 }, { name: "G", midi: 55 }],
    sound: { kind: "pluck", halfLife: 0.9, shift: 0.5, smooth: 0.35, pick: 0.2, strings: 2, spread: 5, level: 0.8, eq: [[900, 4], [2400, 3]] },
  },
  violin: {
    id: "violin", fretted: false, reach: 14, look: wooden("#1f1916", { fret: "#efe6d2" }),
    strings: [{ name: "E", midi: 76 }, { name: "A", midi: 69 }, { name: "D", midi: 62 }, { name: "G", midi: 55 }],
    sound: { kind: "bow", track: 7, min: 1500, max: 7000, attack: 0.05, hiss: 0.05, vibrato: 16, level: 0.2, eq: [[300, 4], [1200, 2], [2800, 5]] },
    pizzicato: pizzicato([[300, 4], [1200, 2], [2800, 5]]),
  },
  viola: {
    id: "viola", fretted: false, reach: 14, look: wooden("#241a14", { fret: "#efe6d2" }),
    strings: [{ name: "A", midi: 69 }, { name: "D", midi: 62 }, { name: "G", midi: 55 }, { name: "C", midi: 48 }],
    sound: { kind: "bow", track: 6, min: 1200, max: 6000, attack: 0.06, hiss: 0.05, vibrato: 15, level: 0.16, eq: [[220, 4], [900, 3], [2200, 3]] },
    pizzicato: pizzicato([[220, 4], [900, 3], [2200, 3]]),
  },
  cello: {
    id: "cello", fretted: false, reach: 14, look: wooden("#2a1b12", { fret: "#efe6d2" }),
    strings: [{ name: "A", midi: 57 }, { name: "D", midi: 50 }, { name: "G", midi: 43 }, { name: "C", midi: 36 }],
    sound: { kind: "bow", track: 5, min: 700, max: 4500, attack: 0.09, hiss: 0.06, vibrato: 14, level: 0.2, eq: [[110, 4], [250, 4], [1000, 2]] },
    pizzicato: pizzicato([[110, 4], [250, 4], [1000, 2]]),
  },
  doublebass: {
    id: "doublebass", fretted: false, reach: 12, look: wooden("#33231a", { fret: "#efe6d2" }),
    strings: [{ name: "G", midi: 43 }, { name: "D", midi: 38 }, { name: "A", midi: 33 }, { name: "E", midi: 28 }],
    sound: { kind: "bow", track: 3.5, min: 400, max: 3000, attack: 0.14, hiss: 0.07, vibrato: 10, level: 0.26, eq: [[70, 4], [160, 4], [700, 2]] },
    pizzicato: { ...pizzicato([[70, 4], [160, 4], [700, 2]]), halfLife: 0.9, shift: 0.45 },
  },
  guitar: {
    id: "guitar", fretted: true, reach: 15, look: wooden("#4a2f1d"),
    strings: [{ name: "E", midi: 64 }, { name: "B", midi: 59 }, { name: "G", midi: 55 }, { name: "D", midi: 50 }, { name: "A", midi: 45 }, { name: "E", midi: 40 }],
    sound: { kind: "pluck", halfLife: 1.5, shift: 0.42, smooth: 0.45, pick: 0.17, strings: 1, spread: 0, level: 0.8, eq: [[110, 5], [250, 2], [2500, 2]] },
  },
  bass: {
    id: "bass", fretted: true, reach: 15, look: wooden("#2d2018", { string: "#c9ced4" }),
    strings: [{ name: "G", midi: 43 }, { name: "D", midi: 38 }, { name: "A", midi: 33 }, { name: "E", midi: 28 }],
    sound: { kind: "pluck", halfLife: 2.4, shift: 0.5, smooth: 0.7, pick: 0.25, strings: 1, spread: 0, level: 0.95, eq: [[80, 6], [700, 2]] },
  },
  ukulele: {
    id: "ukulele", fretted: true, reach: 12, look: wooden("#9a6a40", { fret: "#e6dcc3", string: "#f4f0e6", even: true }),
    // The G string is the high one (re-entrant tuning).
    strings: [{ name: "A", midi: 69 }, { name: "E", midi: 64 }, { name: "C", midi: 60 }, { name: "G", midi: 67 }],
    sound: { kind: "pluck", halfLife: 0.7, shift: 0.45, smooth: 0.6, pick: 0.2, strings: 1, spread: 0, level: 1, eq: [[420, 4], [1800, 1]] },
  },
  banjo: {
    id: "banjo", fretted: true, reach: 17, look: wooden("#6b4a2f"),
    // Open G tuning. The 5th string, a short high drone, starts at the 5th fret.
    strings: [{ name: "D", midi: 62 }, { name: "B", midi: 59 }, { name: "G", midi: 55 }, { name: "D", midi: 50 }, { name: "G", midi: 67, from: 5 }],
    sound: { kind: "pluck", halfLife: 0.45, shift: 0.22, smooth: 0.15, pick: 0.12, strings: 1, spread: 0, level: 0.9, eq: [[1800, 6], [3500, 3]] },
  },
  shamisen: {
    id: "shamisen", fretted: false, reach: 12, look: wooden("#3b2a20", { fret: "#efe6d2", string: "#f2eee4" }),
    // Honchoshi: a fourth, then a fifth, starting from C.
    strings: [{ name: "C", midi: 60 }, { name: "F", midi: 53 }, { name: "C", midi: 48 }],
    sound: { kind: "pluck", halfLife: 0.5, shift: 0.2, smooth: 0.1, pick: 0.1, strings: 1, spread: 0, level: 1, eq: [[1500, 6], [3000, 3]] },
  },
};
