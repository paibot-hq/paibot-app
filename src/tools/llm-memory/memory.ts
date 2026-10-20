// Memory the weights of a language model take: parameters × bytes per parameter. Weights only; the cache that grows with
// the conversation, the OS and other apps need room on top, which is what the verdict's margin stands for.

export const SIZES = [7, 14, 32, 70] as const;      // billions of parameters offered as quick picks
export const BITS = [16, 8, 4] as const;            // bits per parameter (16 = unquantized half precision)
export const RAMS = [8, 16, 24, 32, 64, 128] as const; // GB

export type Verdict = "fit" | "tight" | "over";

export function weightGB(billions: number, bits: number): number {
  return (billions * 1e9 * bits / 8) / 1e9;
}

// Within 80% of the memory: should fit with room for the cache. Up to 100%: the weights fit, little else does.
export function verdict(weights: number, ram: number): Verdict {
  const ratio = weights / ram;
  return ratio <= 0.8 ? "fit" : ratio <= 1 ? "tight" : "over";
}
