// A plucked string by the Karplus-Strong method: a loop of noise (the pluck) that is averaged a little each time round, so the high
// harmonics fade first, as they do on a real string. Pure, so it can be tested; the page turns the samples into a sound.
export type Plucked = { data: Float32Array<ArrayBuffer>; f0: number };

// `limit` is the longest it may ring, in seconds (a tremolo needs only a short one).
export function pluckSamples(sampleRate: number, frequency: number, random: () => number = Math.random, limit = 2.6): Plucked {
  // The averaging delays the loop by half a sample, so the loop is that much shorter; f0 is the pitch it really has, and the page plays
  // the samples at frequency / f0 to land exactly on the note.
  const length = Math.max(2, Math.round(sampleRate / frequency - 0.5));
  const f0 = sampleRate / (length + 0.5);
  // A low string rings longer than a high one.
  const halfLife = 0.9 * (200 / f0) ** 0.4;
  const seconds = Math.min(limit, halfLife * 4);
  const decay = 0.5 ** (1 / (halfLife * f0));

  // The pluck: noise softened by a one-pole filter (a soft pick), then shaped by where the string is plucked (a comb).
  const noise = new Float32Array(length);
  let previous = 0;
  for (let i = 0; i < length; i++) { previous = previous * 0.35 + (random() * 2 - 1) * 0.65; noise[i] = previous; }
  const spot = Math.max(1, Math.round(length / 5));
  const line = new Float32Array(length);
  let peak = 1e-9;
  for (let i = 0; i < length; i++) { line[i] = noise[i]! - noise[(i + spot) % length]!; peak = Math.max(peak, Math.abs(line[i]!)); }
  for (let i = 0; i < length; i++) line[i]! /= peak;

  const data = new Float32Array(Math.floor(sampleRate * seconds));
  let index = 0;
  for (let n = 0; n < data.length; n++) {
    const here = line[index]!, ahead = line[(index + 1) % length]!;
    data[n] = here;
    line[index] = (here + ahead) * 0.5 * decay;
    index = (index + 1) % length;
  }
  return { data, f0 };
}
