// The challenges (a picture to draw, shown faintly) and the examples, written with the English words; the page shows them
// in its own language with translate(). `lines` is the shortest answer we know, which a loop usually makes short.

export type Stage = { id: "square" | "triangle" | "dashes" | "stairs" | "circle" | "star" | "flower" | "spiral"; answer: string; lines: number };

export const STAGES: Stage[] = [
  { id: "square", answer: "repeat 4 [\n  forward 100\n  right 90\n]", lines: 4 },
  { id: "triangle", answer: "repeat 3 [\n  forward 120\n  right 120\n]", lines: 4 },
  { id: "dashes", answer: "repeat 5 [\n  pendown\n  forward 15\n  penup\n  forward 15\n]", lines: 6 },
  { id: "stairs", answer: "repeat 4 [\n  forward 30\n  right 90\n  forward 30\n  left 90\n]", lines: 6 },
  { id: "circle", answer: "repeat 36 [\n  forward 10\n  right 10\n]", lines: 4 },
  { id: "star", answer: "repeat 5 [\n  forward 150\n  right 144\n]", lines: 4 },
  { id: "flower", answer: "repeat 6 [\n  repeat 6 [\n    forward 40\n    right 60\n  ]\n  right 60\n]", lines: 7 },
  { id: "spiral", answer: "repeat 20 [\n  forward i * 8\n  right 90\n]", lines: 4 },
];

export type Example = { id: "start" | "star" | "flower" | "spiral" | "rings" | "snow"; code: string };

export const EXAMPLES: Example[] = [
  { id: "start", code: "# ▶\nrepeat 4 [\n  forward 100\n  right 90\n]" },
  { id: "star", code: "color yellow\nrepeat 5 [\n  forward 150\n  right 144\n]" },
  { id: "flower", code: "repeat 12 [\n  color i * 30\n  repeat 4 [\n    forward 80\n    right 90\n  ]\n  right 30\n]" },
  { id: "spiral", code: "width 2\nrepeat 150 [\n  color i * 3\n  forward i * 1.2\n  right 59\n]" },
  { id: "rings", code: "repeat 36 [\n  color i * 10\n  repeat 5 [\n    forward 100\n    right 144\n  ]\n  right 10\n]" },
  { id: "snow", code: "color white\nwidth 2\nrepeat 6 [\n  forward 90\n  repeat 3 [\n    back 20\n    left 45\n    forward 25\n    back 25\n    right 90\n    forward 25\n    back 25\n    left 45\n  ]\n  back 30\n  right 60\n]" },
];
