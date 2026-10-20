// A top's shape and what the shape does. The shape is the radius of a solid of revolution at LEVELS heights, from the tip (index 0)
// to the top: what the player draws is one side of its cross-section, and everything else (weight, how long it keeps spinning,
// how sluggish it is, when it starts to wobble) is calculated from that solid, so the drawing is the only thing to choose.
export const LEVELS = 24;
export const MAX_RADIUS = 16;  // the drawing box: this wide (one side) ...
export const MAX_HEIGHT = 26;  // ... and this high, in the same units as the dish (radius 100)
export const MIN_RADIUS = 0.4; // nothing is thinner than this, so the solid never has a hole in it

export type Profile = number[]; // length LEVELS, each MIN_RADIUS..MAX_RADIUS

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high);

// A profile from a few (height, radius) points, linear in between.
function fromKeys(keys: [number, number][]): Profile {
  return Array.from({ length: LEVELS }, (_, i) => {
    const y = (i / (LEVELS - 1)) * MAX_HEIGHT;
    for (let k = 1; k < keys.length; k++) {
      const [y0, r0] = keys[k - 1]!, [y1, r1] = keys[k]!;
      if (y <= y1) return clamp(r0 + ((r1 - r0) * (y - y0)) / Math.max(y1 - y0, 1e-6), MIN_RADIUS, MAX_RADIUS);
    }
    return clamp(keys[keys.length - 1]![1], MIN_RADIUS, MAX_RADIUS);
  });
}

export const PRESETS = {
  standard: fromKeys([[0, 1.5], [9, 12], [12.5, 12], [14, 2], [22, 1.3], [22.5, MIN_RADIUS], [MAX_HEIGHT, MIN_RADIUS]]),
  heavy: fromKeys([[0, 3], [3, 13.5], [10, 15.5], [13, 15], [14, 2], [19, 1.5], [19.5, MIN_RADIUS], [MAX_HEIGHT, MIN_RADIUS]]),
  sharp: fromKeys([[0, 0.75], [9.5, 9.3], [15, 9.3], [17, 1.6], [22, 1.2], [22.5, MIN_RADIUS], [MAX_HEIGHT, MIN_RADIUS]]),
  flat: fromKeys([[0, 1], [3, 6], [5, 15.5], [8, 15.5], [9, 3], [14, 1.5], [14.5, MIN_RADIUS], [MAX_HEIGHT, MIN_RADIUS]]),
} satisfies Record<string, Profile>;
export type PresetName = keyof typeof PRESETS;
export const PRESET_NAMES = Object.keys(PRESETS) as PresetName[];

// A stored profile that is not the right shape of data is dropped rather than trusted.
export function parseProfile(value: unknown): Profile | null {
  if (!Array.isArray(value) || value.length !== LEVELS) return null;
  if (!value.every(item => typeof item === "number" && Number.isFinite(item))) return null;
  return value.map(item => clamp(item, MIN_RADIUS, MAX_RADIUS));
}

// A stroke drawn in the box (x: 0 at the axis to 1 at MAX_RADIUS, y: 0 at the tip to 1 at MAX_HEIGHT) becomes a profile:
// at each height, the outermost the stroke reaches. Above the stroke the solid ends (it is thin there); below it, the lowest point goes on down.
export function profileFromStroke(points: { x: number; y: number }[]): Profile | null {
  if (points.length < 2) return null;
  const reach: (number | null)[] = Array(LEVELS).fill(null);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!, b = points[i]!;
    const low = Math.min(a.y, b.y), high = Math.max(a.y, b.y);
    for (let level = 0; level < LEVELS; level++) {
      const y = level / (LEVELS - 1);
      if (y < low - 1e-9 || y > high + 1e-9) continue;
      const x = high - low < 1e-9 ? Math.max(a.x, b.x) : a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y);
      reach[level] = Math.max(reach[level] ?? 0, x);
    }
  }
  const first = reach.findIndex(value => value !== null);
  if (first < 0) return null;
  const radii = reach.map((value, level) => {
    const x = value ?? (level < first ? reach[first]! : 0);
    return clamp(x, 0, 1) * MAX_RADIUS;
  });
  // One pass of smoothing, so a shaky hand does not make a rough solid.
  return radii.map((value, i) => clamp(i === 0 || i === LEVELS - 1 ? value : (radii[i - 1]! + 2 * value + radii[i + 1]!) / 4, MIN_RADIUS, MAX_RADIUS));
}

export type Solid = { volume: number; inertia: number; radius: number; tip: number; centerHeight: number };

// Volume, moment of inertia about the axis, widest radius, tip radius and height of the center of mass, for a uniform solid.
export function solidOf(profile: Profile): Solid {
  const dy = MAX_HEIGHT / (LEVELS - 1);
  const sub = 6;
  let volume = 0, inertia = 0, moment = 0;
  for (let i = 1; i < LEVELS; i++) {
    for (let s = 0; s < sub; s++) {
      const t = (s + 0.5) / sub;
      const r = profile[i - 1]! + (profile[i]! - profile[i - 1]!) * t;
      const y = (i - 1 + t) * dy;
      const slice = (Math.PI * r * r * dy) / sub;
      volume += slice;
      inertia += (slice * r * r) / 2;
      moment += slice * y;
    }
  }
  return { volume, inertia, radius: Math.max(...profile), tip: profile[0]!, centerHeight: moment / volume };
}

const STANDARD = solidOf(PRESETS.standard);

// How shapes turn into play. Chosen by simulation (the four presets should hold their own against each other), so change them with a simulation.
export const K = {
  friction: 0.4,     // share of the spin lost to the tip's friction (the rest is the air)
  inertiaDecay: 0.6,    // exponent of the moment of inertia in how long a top keeps going
  resistExp: 0.3,     // exponent of the moment of inertia in how little a hit takes
  steerExp: 0.68,      // exponent of the weight in how slowly it answers the steering
  dragTip: 0.2,       // how much the tip's width counts in gripping the dish
  wobbleExp: 0.3,     // how much a slender shape wobbles early
  wobbleBase: 30.9,     // the spin the standard top starts to wobble at
  massExp: 0.46,       // exponent of the weight in the collision
  shaky: 0.3,         // extra spin lost while wobbling
  wobblePush: 206,    // how hard a wobbling top is pushed around at random
};

export type Spec = {
  radius: number;     // the collision radius, in dish units
  mass: number;       // relative to the standard top
  decay: number;      // how fast its spin runs down, relative to the standard top
  drag: number;       // how much it grips the dish: slides on a sharp tip
  steer: number;      // how fast it answers the steering: heavy ones are slow
  resist: number;     // how little of a hit's force it takes as lost spin
  wobbleAt: number;   // below this much spin (out of 100) it starts to wobble
};

// The numbers the engine uses, from a profile. Ratios are to the standard top, and kept in a range so that one wild drawing cannot break the game.
export function specOf(profile: Profile): Spec {
  const solid = solidOf(profile);
  const mass = clamp(solid.volume / STANDARD.volume, 0.35, 3);
  const inertia = clamp(solid.inertia / STANDARD.inertia, 0.25, 4);
  const tip = clamp(solid.tip / STANDARD.tip, 0.4, 3);
  const wide = clamp(solid.radius / STANDARD.radius, 0.5, 1.4);
  // A tall, narrow top (high center of mass for its width) loses its footing earlier.
  const slender = clamp(solid.centerHeight / solid.radius / (STANDARD.centerHeight / STANDARD.radius), 0.4, 2.5);
  return {
    radius: clamp(solid.radius, 5, MAX_RADIUS),
    mass,
    // Friction at the tip grows with the weight pressing on it and with the width of the tip; the air takes a lot more from a wide one;
    // and what is lost is spread over the moment of inertia, which is what keeps a spinning top going.
    decay: (K.friction * mass * tip + (1 - K.friction) * wide ** 4) / inertia ** K.inertiaDecay,
    drag: 1 - K.dragTip + K.dragTip * tip,
    steer: 1 / mass ** K.steerExp,
    resist: 1 / inertia ** K.resistExp,
    wobbleAt: clamp(K.wobbleBase * slender ** K.wobbleExp, 18, 55),
  };
}

// For the picture the player sees while drawing: 0..100 for each thing a shape decides (50 is the standard top).
export function scoresOf(profile: Profile): { weight: number; stamina: number; agility: number; power: number; stable: number } {
  const spec = specOf(profile);
  const score = (ratio: number) => clamp(Math.round(50 + 50 * Math.log2(ratio) / 2), 0, 100);
  return {
    weight: score(spec.mass),
    stamina: score(1 / spec.decay),
    agility: score(spec.steer),
    power: score(spec.mass * spec.radius / specOf(PRESETS.standard).radius),
    stable: score(35 / spec.wobbleAt),
  };
}
