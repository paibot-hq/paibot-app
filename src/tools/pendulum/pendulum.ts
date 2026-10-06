// A double pendulum (two arms of length l1 and l2 with masses m1 and m2), integrated with the fourth-order Runge-Kutta method.
// Angles are from straight down. It is chaotic: two starts a hair apart end up in completely different places. Pure functions,
// tested without a browser.

export type State = { a1: number; a2: number; w1: number; w2: number };
export type Params = { m1: number; m2: number; l1: number; l2: number; g: number };
export const DEFAULTS: Params = { m1: 1, m2: 1, l1: 1, l2: 1, g: 9.81 };

// The derivative of the state: (angle speeds, angle accelerations).
function derivative(s: State, p: Params): State {
  const { m1, m2, l1, l2, g } = p;
  const delta = s.a1 - s.a2;
  const den = 2 * m1 + m2 - m2 * Math.cos(2 * delta);
  const dw1 = (-g * (2 * m1 + m2) * Math.sin(s.a1) - m2 * g * Math.sin(s.a1 - 2 * s.a2)
    - 2 * Math.sin(delta) * m2 * (s.w2 * s.w2 * l2 + s.w1 * s.w1 * l1 * Math.cos(delta))) / (l1 * den);
  const dw2 = (2 * Math.sin(delta) * (s.w1 * s.w1 * l1 * (m1 + m2) + g * (m1 + m2) * Math.cos(s.a1) + s.w2 * s.w2 * l2 * m2 * Math.cos(delta))) / (l2 * den);
  return { a1: s.w1, a2: s.w2, w1: dw1, w2: dw2 };
}

const add = (s: State, d: State, k: number): State => ({ a1: s.a1 + d.a1 * k, a2: s.a2 + d.a2 * k, w1: s.w1 + d.w1 * k, w2: s.w2 + d.w2 * k });

export function step(s: State, dt: number, p: Params = DEFAULTS): State {
  const k1 = derivative(s, p);
  const k2 = derivative(add(s, k1, dt / 2), p);
  const k3 = derivative(add(s, k2, dt / 2), p);
  const k4 = derivative(add(s, k3, dt), p);
  return {
    a1: s.a1 + (dt / 6) * (k1.a1 + 2 * k2.a1 + 2 * k3.a1 + k4.a1),
    a2: s.a2 + (dt / 6) * (k1.a2 + 2 * k2.a2 + 2 * k3.a2 + k4.a2),
    w1: s.w1 + (dt / 6) * (k1.w1 + 2 * k2.w1 + 2 * k3.w1 + k4.w1),
    w2: s.w2 + (dt / 6) * (k1.w2 + 2 * k2.w2 + 2 * k3.w2 + k4.w2),
  };
}

// Kinetic plus potential energy (zero at the pivot's height): constant for a pendulum with no friction.
export function energy(s: State, p: Params = DEFAULTS): number {
  const { m1, m2, l1, l2, g } = p;
  const kinetic = 0.5 * m1 * l1 * l1 * s.w1 * s.w1 + 0.5 * m2 * (l1 * l1 * s.w1 * s.w1 + l2 * l2 * s.w2 * s.w2 + 2 * l1 * l2 * s.w1 * s.w2 * Math.cos(s.a1 - s.a2));
  const potential = -(m1 + m2) * g * l1 * Math.cos(s.a1) - m2 * g * l2 * Math.cos(s.a2);
  return kinetic + potential;
}

// Where the two bobs are, in the arms' own units with y up and the pivot at the origin.
export function bobs(s: State, p: Params = DEFAULTS): { x1: number; y1: number; x2: number; y2: number } {
  const x1 = p.l1 * Math.sin(s.a1), y1 = -p.l1 * Math.cos(s.a1);
  return { x1, y1, x2: x1 + p.l2 * Math.sin(s.a2), y2: y1 - p.l2 * Math.cos(s.a2) };
}

// Runs for `seconds` in steps of at most `dt`.
export function run(s: State, seconds: number, dt = 0.002, p: Params = DEFAULTS): State {
  const steps = Math.max(1, Math.ceil(seconds / dt));
  const h = seconds / steps;
  for (let i = 0; i < steps; i++) s = step(s, h, p);
  return s;
}

// A number of pendulums that start almost alike: the first at (a1, a2), the others a little further on each, by `spread` radians.
export function family(count: number, a1: number, a2: number, spread: number): State[] {
  return Array.from({ length: count }, (_, i) => ({ a1: a1 + (spread * i) / Math.max(1, count - 1), a2, w1: 0, w2: 0 }));
}
