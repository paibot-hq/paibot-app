export const INITIAL_X = { min: -5, max: 5, step: 0.25, defaultValue: 3 };
export const LEARNING_RATE = { min: 0.01, max: 1.25, step: 0.01, defaultValue: 0.25 };
export const GRAPH_LIMIT = 6;
export const STEP_LIMIT = 100;
const NEAR_MINIMUM = 0.001;

export type DescentPoint = { x: number; value: number; slope: number };

export function pointAt(x: number): DescentPoint {
  return { x, value: x ** 2, slope: 2 * x };
}

export function nextPoint(point: DescentPoint, rate: number): DescentPoint {
  return pointAt(point.x - rate * point.slope);
}

export function stopReason(point: DescentPoint, steps: number) {
  const distance = Math.abs(point.x);
  if (distance > GRAPH_LIMIT) return 'outside';
  if (distance === 0) return 'minimum';
  if (distance < NEAR_MINIMUM) return 'near';
  if (steps >= STEP_LIMIT) return 'limit';
  return null;
}
