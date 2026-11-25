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

// Numbers as the page prints them: fixed decimals, ASCII '-' as a real minus.
export function fmt(value: number, decimals = 3): string {
  const text = value.toFixed(decimals).replace('-', '−');
  // toFixed can yield "−0.000"; the page never needs a signed zero.
  return text === `−0.${'0'.repeat(decimals)}` ? text.slice(1) : text;
}
