// A one-block, one-head transformer over hand-placed two-dimensional
// embeddings, small enough that "predict the next word" can be watched end to
// end: embed → self-attention → FFN + residual → logits → softmax. Every
// number on the page is computed from these constants at render time, so what
// is shown is what the unit tests re-derive. No randomness, no training.
//
// How the constants were designed (offline, nothing runs at build time):
// the six nouns sit on the unit circle (objects up, subjects left), the two
// particles are short, and the query weight W_Q turns を's downward embedding
// into an upward query, so を "looks for a noun". The position vector of slot
// 2 lifts the object's key above the subject's, which is what makes the
// directly-marked noun win the attention. The FFN (I + A below) is a pure
// rotation-and-scale 1.1·R(−125°), implemented exactly with four ReLU units,
// and each verb's embedding was placed where that rotation sends its object
// (then rounded to two decimals). A small grid search over the rotation
// angle, subject angles and the two scales confirmed that in every preset the
// intended verb has the largest probability with a margin, the object gets
// the top attention weight (0.65–0.82), and nothing drawn leaves the plane.

export type Vec = readonly [number, number];
// A 2×2 matrix in row-major order [a, b, c, d]: matVec maps (x, y) to (ax + by, cx + dy).
export type Mat2 = readonly [number, number, number, number];

export type WordId =
  | 'neko' | 'inu' | 'tori'
  | 'sakana' | 'booru' | 'sora'
  | 'ga' | 'wo'
  | 'tabeta' | 'oikaketa' | 'tonda';

// The order of the probability bar chart: subjects, objects, particles, verbs.
export const VOCAB: readonly WordId[] = [
  'neko', 'inu', 'tori', 'sakana', 'booru', 'sora', 'ga', 'wo', 'tabeta', 'oikaketa', 'tonda',
];

// The sentence tokens are the object of study, so they stay Japanese in every locale.
export const WORD_TEXT: Record<WordId, string> = {
  neko: 'ねこ', inu: 'いぬ', tori: 'とり',
  sakana: 'さかな', booru: 'ボール', sora: 'そら',
  ga: 'が', wo: 'を',
  tabeta: 'たべた', oikaketa: 'おいかけた', tonda: 'とんだ',
};

export const EMBEDDINGS: Record<WordId, Vec> = {
  neko: [-1, 0.09],
  inu: [-0.94, -0.34],
  tori: [-0.94, 0.34],
  sakana: [0, 1],
  booru: [-0.87, 0.5],
  sora: [0.87, 0.5],
  ga: [-0.33, -0.12],
  wo: [-0.12, -0.33],
  tabeta: [1.01, -0.82],
  oikaketa: [1.3, 0.09],
  tonda: [0.22, -1.28],
};

// One learned vector per slot; slot 2 (the object) points up, the others down,
// which is what lets を's upward query pick out the noun it marks.
export const POSITIONS: readonly Vec[] = [
  [-0.3, -0.35], [-0.1, -0.35], [0.1, 0.45], [0.3, -0.35],
];

export const W_Q: Mat2 = [0, 0, 0, -2];
export const W_K: Mat2 = [1, 0, 0, 1];
export const W_V: Mat2 = [1, 0, 0, 1];

// The FFN: u = z + W2·ReLU(W1·z). W1's four rows read +x, −x, +y, −y, so the
// hidden layer splits z into its positive and negative parts and W2·ReLU(W1·z)
// equals A·z exactly, with A = 1.1·R(−125°) − I: the residual stream is rotated
// 125° clockwise and stretched by 1.1, which carries object directions onto
// their verbs' directions.
export const FFN_W1: readonly Vec[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export const FFN_W2: readonly (readonly [number, number, number, number])[] = [
  [-1.63, 1.63, 0.9, -0.9],
  [-0.9, 0.9, -1.63, 1.63],
];

// Logits are tied to the embeddings: logit_w = LOGIT_SCALE · (e_w · u).
export const LOGIT_SCALE = 4;

export type PresetId = 'catFish' | 'dogBall' | 'birdSky' | 'catBall';
export type Preset = { id: PresetId; words: readonly WordId[]; next: WordId };

export const PRESETS: readonly Preset[] = [
  { id: 'catFish', words: ['neko', 'ga', 'sakana', 'wo'], next: 'tabeta' },
  { id: 'dogBall', words: ['inu', 'ga', 'booru', 'wo'], next: 'oikaketa' },
  { id: 'birdSky', words: ['tori', 'ga', 'sora', 'wo'], next: 'tonda' },
  { id: 'catBall', words: ['neko', 'ga', 'booru', 'wo'], next: 'oikaketa' },
];

export function matVec(m: Mat2, v: Vec): Vec {
  return [m[0] * v[0] + m[1] * v[1], m[2] * v[0] + m[3] * v[1]];
}

export function dot(a: Vec, b: Vec): number {
  return a[0] * b[0] + a[1] * b[1];
}

export function add(a: Vec, b: Vec): Vec {
  return [a[0] + b[0], a[1] + b[1]];
}

// Shift-invariant softmax (the usual max subtraction), so no score overflows.
export function softmax(scores: readonly number[]): number[] {
  const top = Math.max(...scores);
  const exps = scores.map(score => Math.exp(score - top));
  const total = exps.reduce((sum, value) => sum + value, 0);
  return exps.map(value => value / total);
}

export type TransformerResult = {
  // Step 1: x_i = e_i + p_i.
  xs: readonly Vec[];
  // Step 2, for the last token: q = W_Q x, k_j = W_K x_j, v_j = W_V x_j.
  q: Vec;
  keys: readonly Vec[];
  values: readonly Vec[];
  scores: readonly number[];
  weights: readonly number[];
  attended: Vec; // z = Σ w_j v_j
  // Step 3: hidden = ReLU(W1 z), ffnOut = W2 hidden, output = z + ffnOut.
  hidden: readonly number[];
  ffnOut: Vec;
  output: Vec;
  // Step 4, over VOCAB: logit_w = LOGIT_SCALE · e_w · output, probs = softmax.
  logits: readonly number[];
  probs: readonly number[];
  predicted: WordId;
};

// The whole block for one sentence, predicting what follows its last token.
export function runTransformer(words: readonly WordId[]): TransformerResult {
  const xs = words.map((word, i) => add(EMBEDDINGS[word], POSITIONS[i]));
  const q = matVec(W_Q, xs[xs.length - 1]);
  const keys = xs.map(x => matVec(W_K, x));
  const values = xs.map(x => matVec(W_V, x));
  const scores = keys.map(key => dot(q, key));
  const weights = softmax(scores);
  const attended = values.reduce<Vec>(
    (sum, value, j) => [sum[0] + weights[j] * value[0], sum[1] + weights[j] * value[1]], [0, 0]);
  const hidden = FFN_W1.map(row => Math.max(0, dot(row, attended)));
  const ffnOut: Vec = [
    FFN_W2[0].reduce((sum, w, j) => sum + w * hidden[j], 0),
    FFN_W2[1].reduce((sum, w, j) => sum + w * hidden[j], 0),
  ];
  const output = add(attended, ffnOut);
  const logits = VOCAB.map(word => LOGIT_SCALE * dot(EMBEDDINGS[word], output));
  const probs = softmax(logits);
  const predicted = VOCAB[probs.indexOf(Math.max(...probs))];
  return { xs, q, keys, values, scores, weights, attended, hidden, ffnOut, output, logits, probs, predicted };
}
