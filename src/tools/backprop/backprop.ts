// A tiny network with hand-placed numbers: input x → two tanh hidden units →
// one linear output, squared-error loss. Every number on the page is computed
// from these constants on the client, so what is shown is what the unit tests
// re-derive (the gradients also against finite differences). No randomness.

export type Weights = {
  // Input → hidden.
  w1: number;
  w2: number;
  // Hidden → output.
  v1: number;
  v2: number;
};

export type WeightId = keyof Weights;
export const WEIGHT_IDS: readonly WeightId[] = ['w1', 'w2', 'v1', 'v2'];

export const X = 0.8;
export const TARGET = 0.5;
export const INITIAL_WEIGHTS: Weights = { w1: 0.75, w2: -0.5, v1: 1.1, v2: -0.9 };
export const LEARNING_RATE = 0.2;
// Step 3 nudges one weight by this much and recomputes the loss.
export const NUDGE = 0.01;

export type Forward = {
  a1: number; h1: number;
  a2: number; h2: number;
  y: number;
  loss: number;
};

// a_i = w_i x, h_i = tanh(a_i), y = v_1 h_1 + v_2 h_2, L = (y − t)².
export function forward(weights: Weights, x = X, target = TARGET): Forward {
  const a1 = weights.w1 * x;
  const h1 = Math.tanh(a1);
  const a2 = weights.w2 * x;
  const h2 = Math.tanh(a2);
  const y = weights.v1 * h1 + weights.v2 * h2;
  const loss = (y - target) ** 2;
  return { a1, h1, a2, h2, y, loss };
}

export type Gradients = {
  dy: number;
  dv1: number; dv2: number;
  dh1: number; dh2: number;
  da1: number; da2: number;
  dw1: number; dw2: number;
};

// The chain rule from the loss backwards. Each line multiplies the gradient
// already known on the output side by one local derivative:
// ∂L/∂y = 2(y − t); ∂L/∂v_i = ∂L/∂y · h_i; ∂L/∂h_i = ∂L/∂y · v_i;
// ∂L/∂a_i = ∂L/∂h_i · (1 − h_i²); ∂L/∂w_i = ∂L/∂a_i · x.
export function gradients(weights: Weights, x = X, target = TARGET): Gradients {
  const { h1, h2, y } = forward(weights, x, target);
  const dy = 2 * (y - target);
  const dv1 = dy * h1;
  const dv2 = dy * h2;
  const dh1 = dy * weights.v1;
  const dh2 = dy * weights.v2;
  const da1 = dh1 * (1 - h1 * h1);
  const da2 = dh2 * (1 - h2 * h2);
  const dw1 = da1 * x;
  const dw2 = da2 * x;
  return { dy, dv1, dv2, dh1, dh2, da1, da2, dw1, dw2 };
}

export function gradientOf(grads: Gradients, id: WeightId): number {
  return { w1: grads.dw1, w2: grads.dw2, v1: grads.dv1, v2: grads.dv2 }[id];
}

// Step 3: move one weight by `delta` and recompute the whole loss, so the page
// can show that the actual change matches ∂L/∂w · delta.
export function nudgedLoss(weights: Weights, id: WeightId, delta = NUDGE, x = X, target = TARGET): number {
  return forward({ ...weights, [id]: weights[id] + delta }, x, target).loss;
}

// Step 4: one plain gradient-descent step, w ← w − η ∂L/∂w.
export function updated(weights: Weights, rate = LEARNING_RATE, x = X, target = TARGET): Weights {
  const grads = gradients(weights, x, target);
  return {
    w1: weights.w1 - rate * grads.dw1,
    w2: weights.w2 - rate * grads.dw2,
    v1: weights.v1 - rate * grads.dv1,
    v2: weights.v2 - rate * grads.dv2,
  };
}

// ---------------------------------------------------------------------------
// The same mathematics for any layer sizes: tanh hidden layers, one linear
// output, squared-error loss. The film's "large network" runs on this; a unit
// test checks the small network gives identical numbers through both paths.

// weights[l][j][i] connects unit i of layer l to unit j of layer l + 1.
export type Matrix = readonly (readonly number[])[];

export type NetForward = {
  // Per layer, the unit activations (layer 0 is the input itself).
  acts: readonly (readonly number[])[];
  y: number;
  loss: number;
};

export function netForward(weights: readonly Matrix[], x: readonly number[], target: number): NetForward {
  const acts: number[][] = [[...x]];
  weights.forEach((layer, l) => {
    const previous = acts[l];
    const last = l === weights.length - 1;
    acts.push(layer.map(row => {
      const sum = row.reduce((total, w, i) => total + w * previous[i], 0);
      return last ? sum : Math.tanh(sum);
    }));
  });
  const y = acts[acts.length - 1][0];
  return { acts, y, loss: (y - target) ** 2 };
}

// ∂L/∂w for every weight, by the same backward walk the film draws: the
// output's gradient, handed layer by layer back through tanh.
export function netGradients(weights: readonly Matrix[], x: readonly number[], target: number): number[][][] {
  const { acts, y } = netForward(weights, x, target);
  // delta[j]: ∂L/∂(pre-activation of unit j) in the layer being visited.
  let delta = [2 * (y - target)];
  const grads: number[][][] = [];
  for (let l = weights.length - 1; l >= 0; l--) {
    const below = acts[l];
    grads[l] = weights[l].map((row, j) => row.map((_, i) => delta[j] * below[i]));
    if (l > 0) {
      delta = below.map((h, i) =>
        weights[l].reduce((total, row, j) => total + delta[j] * row[i], 0) * (1 - h * h));
    }
  }
  return grads;
}

export function netUpdated(weights: readonly Matrix[], x: readonly number[], target: number, rate: number): number[][][] {
  const grads = netGradients(weights, x, target);
  return weights.map((layer, l) => layer.map((row, j) => row.map((w, i) => w - rate * grads[l][j][i])));
}

// The large network the film can switch to: 2 inputs → 4 → 3 → 1, every
// weight placed by hand. Shown as colours and thicknesses, not numbers.
export const LARGE_X: readonly number[] = [0.8, -0.3];
export const LARGE_TARGET = 0.5;
// A smaller rate than the small network's: these weights start further out
// (loss 1.479), and 0.1 closes the gap in the same six rounds the film plays.
export const LARGE_RATE = 0.1;
export const LARGE_WEIGHTS: readonly Matrix[] = [
  [[0.9, -0.5], [-0.6, 0.7], [0.4, 0.9], [-0.9, -0.3]],
  [[0.9, -0.5, 0.8, -0.6], [-0.8, 0.6, 0.4, 0.9], [0.5, 0.7, -0.9, 0.4]],
  [[1.3, -1.0, 0.9]],
];

// Numbers as the page prints them: fixed decimals, ASCII '-' as a real minus.
export function fmt(value: number, decimals = 3): string {
  const text = value.toFixed(decimals).replace('-', '−');
  // toFixed can yield "−0.000"; the page never needs a signed zero.
  return text === `−0.${'0'.repeat(decimals)}` ? text.slice(1) : text;
}
