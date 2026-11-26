// One attention head over hand-placed two-dimensional embeddings: every number
// on the page is computed from these constants, so what is shown is what the
// unit tests re-derive. No randomness anywhere.

export type Vec = readonly [number, number];
// A 2×2 matrix in row-major order [a, b, c, d]: matVec maps (x, y) to (ax + by, cx + dy).
export type Mat = readonly [number, number, number, number];

// Hand-placed weight matrices. W_Q and W_K are rotations (W_Q also scales by 1.5),
// so a word's query points about 74° counter-clockwise of its own embedding and
// the score q·k is largest for words lying in that direction.
export const W_Q: Mat = [1.2, -0.9, 0.9, 1.2];
export const W_K: Mat = [0.8, 0.6, -0.6, 0.8];
export const W_V: Mat = [0.9, -0.1, 0.1, 0.9];

export type WordId =
  | 'neko' | 'ga' | 'sakana' | 'wo' | 'tabeta'
  | 'megane' | 'denwa' | 'hashi' | 'kakeru';

// Content words sit on the unit circle; the particles が and を are short, so
// their keys score low from everywhere.
export const EMBEDDINGS: Record<WordId, Vec> = {
  neko: [0.77, -0.64],
  ga: [-0.2, 0.35],
  sakana: [0.17, -0.98],
  wo: [-0.35, 0.2],
  tabeta: [-0.94, -0.34],
  megane: [0.98, 0.17],
  denwa: [0.77, 0.64],
  hashi: [0.97, -0.26],
  kakeru: [0.5, -0.87],
};

// The sentence tokens are the object of study, so they stay Japanese in every locale.
export const WORD_TEXT: Record<WordId, string> = {
  neko: 'ねこ', ga: 'が', sakana: 'さかな', wo: 'を', tabeta: 'たべた',
  megane: '眼鏡', denwa: '電話', hashi: '橋', kakeru: 'かける',
};

// Which sense of かける a context word pins down (message keys under meanings.*).
export type Meaning = 'wear' | 'call' | 'span';
export const MEANINGS: Partial<Record<WordId, Meaning>> = { megane: 'wear', denwa: 'call', hashi: 'span' };

export type PresetId = 'cat' | 'glasses' | 'phone' | 'bridge';
export type Preset = {
  id: PresetId;
  words: readonly WordId[];
  // The word selected when the preset is chosen (the verb whose meaning updates).
  focus: number;
  // The three かける sentences, where step 3 resolves the verb's sense.
  ambiguous?: true;
};

export const PRESETS: readonly Preset[] = [
  { id: 'cat', words: ['neko', 'ga', 'sakana', 'wo', 'tabeta'], focus: 4 },
  { id: 'glasses', words: ['megane', 'wo', 'kakeru'], focus: 2, ambiguous: true },
  { id: 'phone', words: ['denwa', 'wo', 'kakeru'], focus: 2, ambiguous: true },
  { id: 'bridge', words: ['hashi', 'wo', 'kakeru'], focus: 2, ambiguous: true },
];

export function matVec(m: Mat, v: Vec): Vec {
  return [m[0] * v[0] + m[1] * v[1], m[2] * v[0] + m[3] * v[1]];
}

export function dot(a: Vec, b: Vec): number {
  return a[0] * b[0] + a[1] * b[1];
}

// Shift-invariant softmax (the usual max subtraction), so no score overflows.
export function softmax(scores: readonly number[]): number[] {
  const top = Math.max(...scores);
  const exps = scores.map(score => Math.exp(score - top));
  const total = exps.reduce((sum, value) => sum + value, 0);
  return exps.map(value => value / total);
}

export type AttentionResult = {
  q: Vec;
  keys: readonly Vec[];
  values: readonly Vec[];
  scores: readonly number[];
  weights: readonly number[];
  output: Vec;
};

// The whole head for one selected word: q = W_Q x, scores q·k_j, softmax, Σ w_j v_j.
export function attend(words: readonly WordId[], index: number): AttentionResult {
  const q = matVec(W_Q, EMBEDDINGS[words[index]]);
  const keys = words.map(word => matVec(W_K, EMBEDDINGS[word]));
  const values = words.map(word => matVec(W_V, EMBEDDINGS[word]));
  const scores = keys.map(key => dot(q, key));
  const weights = softmax(scores);
  const output = values.reduce<Vec>((sum, value, j) => [sum[0] + weights[j] * value[0], sum[1] + weights[j] * value[1]], [0, 0]);
  return { q, keys, values, scores, weights, output };
}

// Which sense かける takes: the meaning of the context word with the largest
// attention weight. Null when the selection is not the ambiguous verb.
export function resolvedMeaning(preset: Preset, index: number, weights: readonly number[]): Meaning | null {
  if (!preset.ambiguous || preset.words[index] !== 'kakeru') return null;
  let best: { meaning: Meaning; weight: number } | null = null;
  preset.words.forEach((word, j) => {
    const meaning = MEANINGS[word];
    if (meaning && (!best || weights[j] > best.weight)) best = { meaning, weight: weights[j] };
  });
  return best ? (best as { meaning: Meaning }).meaning : null;
}
