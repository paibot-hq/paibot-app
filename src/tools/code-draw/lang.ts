// A small turtle language: the robot starts in the middle facing up, and each command moves it, turns it or changes its pen.
// The words can be written in Japanese, English or Chinese (all three are understood whatever the page's language), and
// full-width digits, brackets and spaces count as their half-width forms, so code typed with a Japanese keyboard works.

export type Locale = "ja" | "en" | "zh";
export type Command = "forward" | "back" | "right" | "left" | "repeat" | "penup" | "pendown" | "color" | "width";

export const COMMANDS: Command[] = ["forward", "back", "right", "left", "repeat", "penup", "pendown", "color", "width"];

// The first word of each list is the one shown in that language; the others are also understood.
const WORDS: Record<Command, Record<Locale, string[]>> = {
  forward: { ja: ["すすむ", "まえ", "前進"], en: ["forward", "fd"], zh: ["前进"] },
  back: { ja: ["さがる", "うしろ", "後退"], en: ["back", "bk"], zh: ["后退"] },
  right: { ja: ["みぎ", "右"], en: ["right", "rt"], zh: ["右转"] },
  left: { ja: ["ひだり", "左"], en: ["left", "lt"], zh: ["左转"] },
  repeat: { ja: ["くりかえす", "くりかえし", "繰り返す", "繰り返し"], en: ["repeat"], zh: ["重复"] },
  penup: { ja: ["ペンをあげる", "ペンを上げる", "ペンあげ"], en: ["penup", "pu"], zh: ["抬笔"] },
  pendown: { ja: ["ペンをおろす", "ペンを下ろす", "ペンおろし"], en: ["pendown", "pd"], zh: ["落笔"] },
  color: { ja: ["いろ", "色"], en: ["color", "colour"], zh: ["颜色"] },
  width: { ja: ["ふとさ", "太さ"], en: ["width"], zh: ["粗细"] },
};

const KEYWORDS = new Map<string, Command>();
for (const command of COMMANDS) for (const list of Object.values(WORDS[command])) for (const word of list) KEYWORDS.set(word.toLowerCase(), command);

export const word = (command: Command, locale: Locale) => WORDS[command][locale][0];

// Color names, as a hue on the color wheel (0 red, 120 green, 240 blue) or a fixed color; the first name in each language is
// the one shown in that language, as with the command words.
const COLORS: { value: number | string; names: Record<Locale, string[]> }[] = [
  { value: 0, names: { ja: ["あか", "赤"], en: ["red"], zh: ["红"] } },
  { value: 30, names: { ja: ["オレンジ", "だいだい", "橙"], en: ["orange"], zh: ["橙"] } },
  { value: 55, names: { ja: ["きいろ", "黄色", "黄"], en: ["yellow"], zh: ["黄"] } },
  { value: 120, names: { ja: ["みどり", "緑"], en: ["green"], zh: ["绿"] } },
  { value: 185, names: { ja: ["みずいろ", "水色"], en: ["cyan"], zh: ["天蓝"] } },
  { value: 220, names: { ja: ["あお", "青"], en: ["blue"], zh: ["蓝"] } },
  { value: 275, names: { ja: ["むらさき", "紫"], en: ["purple"], zh: ["紫"] } },
  { value: 330, names: { ja: ["ピンク"], en: ["pink"], zh: ["粉"] } },
  { value: "#ffffff", names: { ja: ["しろ", "白"], en: ["white"], zh: ["白"] } },
];
const COLOR_NAMES = new Map<string, (typeof COLORS)[number]>();
for (const color of COLORS) for (const list of Object.values(color.names)) for (const name of list) if (!COLOR_NAMES.has(name)) COLOR_NAMES.set(name, color);

export const DEFAULT_COLOR = "#7dd3fc";
export const hue = (h: number) => `hsl(${((h % 360) + 360) % 360} 90% 62%)`;

// Limits that keep a runaway loop from freezing the page.
export const MAX_STEPS = 40000;
const MAX_WORK = 400000;

export type Token =
  | { kind: "word"; text: string; start: number; end: number; line: number }
  | { kind: "num"; value: number; start: number; end: number; line: number }
  | { kind: "sym"; text: string; start: number; end: number; line: number };

export type CodeError =
  | { code: "badChar"; line: number; text: string }
  | { code: "unknownWord"; line: number; text: string }
  | { code: "needNumber"; line: number; text: string }
  | { code: "needOpen"; line: number }
  | { code: "unclosed"; line: number }
  | { code: "strayClose"; line: number }
  | { code: "unknownVariable"; line: number; text: string }
  | { code: "badNumber"; line: number }
  | { code: "tooMany"; line: number };

class Failure extends Error {
  readonly detail: CodeError;
  constructor(detail: CodeError) { super(detail.code); this.detail = detail; }
}

// One character at a time, so every token keeps its place in the source (a slider writes a number back into it).
function plain(char: string) {
  const normal = char.normalize("NFKC");
  if (normal.length !== 1) return char;
  return normal === "{" ? "[" : normal === "}" ? "]" : normal;
}

export function tokenize(source: string): Token[] {
  const chars = Array.from(source, plain);
  const text = chars.join("");
  const tokens: Token[] = [];
  let i = 0, line = 1;
  while (i < text.length) {
    const c = text[i];
    if (c === "\n") { line++; i++; continue; }
    if (/\s/.test(c)) { i++; continue; }
    if (c === "#" || (c === "/" && text[i + 1] === "/")) { while (i < text.length && text[i] !== "\n") i++; continue; }
    const start = i;
    if (/[0-9.]/.test(c) && /[0-9]/.test(c === "." ? text[i + 1] ?? "" : c)) {
      while (/[0-9]/.test(text[i] ?? "")) i++;
      if (text[i] === "." && /[0-9]/.test(text[i + 1] ?? "")) { i++; while (/[0-9]/.test(text[i] ?? "")) i++; }
      tokens.push({ kind: "num", value: Number(text.slice(start, i)), start, end: i, line });
      continue;
    }
    if (/[\p{L}_]/u.test(c)) {
      // Latin words may end in digits (x2); others stop before a digit, so すすむ100 is すすむ 100.
      const latin = /[A-Za-z_]/.test(c);
      while (i < text.length && (/[\p{L}_]/u.test(text[i]) || (latin && /[0-9]/.test(text[i])))) i++;
      tokens.push({ kind: "word", text: text.slice(start, i), start, end: i, line });
      continue;
    }
    if ("[]()+-*/%=".includes(c)) { tokens.push({ kind: "sym", text: c, start, end: i + 1, line }); i++; continue; }
    throw new Failure({ code: "badChar", line, text: c });
  }
  return tokens;
}

type Expr =
  | { kind: "num"; value: number }
  | { kind: "var"; name: string; line: number }
  | { kind: "neg"; value: Expr }
  | { kind: "bin"; op: string; left: Expr; right: Expr };

export type Statement =
  | { kind: "move"; command: "forward" | "back"; value: Expr; line: number }
  | { kind: "turn"; command: "right" | "left"; value: Expr; line: number }
  | { kind: "pen"; down: boolean; line: number }
  | { kind: "color"; value: Expr | string; line: number }
  | { kind: "width"; value: Expr; line: number }
  | { kind: "repeat"; count: Expr; body: Statement[]; line: number }
  | { kind: "set"; name: string; value: Expr; line: number };

export function parse(source: string): Statement[] {
  const tokens = tokenize(source);
  let at = 0;
  const peek = () => tokens[at];
  const isSym = (text: string, token = peek()) => token?.kind === "sym" && token.text === text;

  function primary(owner: Token): Expr {
    const token = peek();
    const missing = () => new Failure({ code: "needNumber", line: owner.line, text: owner.kind === "word" ? owner.text : owner.kind === "sym" ? owner.text : "" });
    if (!token) throw missing();
    if (token.kind === "num") { at++; return { kind: "num", value: token.value }; }
    if (isSym("-")) { at++; return { kind: "neg", value: primary(owner) }; }
    if (isSym("(")) {
      at++;
      const inner = expression(owner);
      if (!isSym(")")) throw missing();
      at++;
      return inner;
    }
    if (token.kind === "word" && !KEYWORDS.has(token.text.toLowerCase())) { at++; return { kind: "var", name: token.text, line: token.line }; }
    throw missing();
  }
  function term(owner: Token): Expr {
    let left = primary(owner);
    while (isSym("*") || isSym("/") || isSym("%")) {
      const op = (tokens[at++] as { text: string }).text;
      left = { kind: "bin", op, left, right: primary(owner) };
    }
    return left;
  }
  function expression(owner: Token): Expr {
    let left = term(owner);
    while (isSym("+") || isSym("-")) {
      const op = (tokens[at++] as { text: string }).text;
      left = { kind: "bin", op, left, right: term(owner) };
    }
    return left;
  }

  function block(inside: Token | null): Statement[] {
    const list: Statement[] = [];
    while (at < tokens.length) {
      const token = tokens[at];
      if (isSym("]")) {
        if (!inside) throw new Failure({ code: "strayClose", line: token.line });
        at++;
        return list;
      }
      list.push(statement());
    }
    if (inside) throw new Failure({ code: "unclosed", line: inside.line });
    return list;
  }

  function statement(): Statement {
    const token = tokens[at++];
    const line = token.line;
    if (token.kind !== "word") throw new Failure(token.kind === "sym" && token.text === "[" ? { code: "needOpen", line } : { code: "unknownWord", line, text: token.kind === "num" ? String(token.value) : token.text });
    const command = KEYWORDS.get(token.text.toLowerCase());
    if (!command) {
      if (isSym("=")) { at++; return { kind: "set", name: token.text, value: expression(token), line }; }
      throw new Failure({ code: "unknownWord", line, text: token.text });
    }
    switch (command) {
      case "forward": case "back": return { kind: "move", command, value: expression(token), line };
      case "right": case "left": return { kind: "turn", command, value: expression(token), line };
      case "penup": case "pendown": return { kind: "pen", down: command === "pendown", line };
      case "width": return { kind: "width", value: expression(token), line };
      case "color": {
        const next = peek();
        if (next?.kind === "word" && COLOR_NAMES.has(next.text.toLowerCase())) { at++; return { kind: "color", value: next.text.toLowerCase(), line }; }
        return { kind: "color", value: expression(token), line };
      }
      case "repeat": {
        const count = expression(token);
        if (!isSym("[")) throw new Failure({ code: "needOpen", line });
        const open = tokens[at++];
        return { kind: "repeat", count, body: block(open), line };
      }
    }
  }

  return block(null);
}

export type Pose = { x: number; y: number; heading: number };
// What the robot does, one step at a time, for drawing it as an animation: heading is in degrees, clockwise from up; y is up.
export type Step =
  | { kind: "move"; from: Pose; to: Pose; draw: boolean; color: string; width: number; line: number }
  | { kind: "turn"; from: Pose; to: Pose; line: number };

export type Result = { steps: Step[]; error: CodeError | null };

export function run(source: string): Result {
  const steps: Step[] = [];
  let pose: Pose = { x: 0, y: 0, heading: 0 };
  let down = true, color = DEFAULT_COLOR, width = 3, work = 0;
  const vars = new Map<string, number>();

  function value(expr: Expr, line: number): number {
    switch (expr.kind) {
      case "num": return expr.value;
      case "neg": return -value(expr.value, line);
      case "var": {
        const found = vars.get(expr.name) ?? vars.get(expr.name.toLowerCase());
        if (found === undefined) throw new Failure({ code: "unknownVariable", line: expr.line, text: expr.name });
        return found;
      }
      case "bin": {
        const a = value(expr.left, line), b = value(expr.right, line);
        const out = expr.op === "+" ? a + b : expr.op === "-" ? a - b : expr.op === "*" ? a * b : expr.op === "/" ? a / b : a % b;
        if (!Number.isFinite(out)) throw new Failure({ code: "badNumber", line });
        return out;
      }
    }
  }
  function push(step: Step) {
    if (steps.length >= MAX_STEPS) throw new Failure({ code: "tooMany", line: step.line });
    steps.push(step);
  }
  function exec(list: Statement[]) {
    for (const s of list) {
      if (++work > MAX_WORK) throw new Failure({ code: "tooMany", line: s.line });
      switch (s.kind) {
        case "move": {
          const d = value(s.value, s.line) * (s.command === "back" ? -1 : 1);
          const rad = (pose.heading * Math.PI) / 180;
          const to = { x: pose.x + d * Math.sin(rad), y: pose.y + d * Math.cos(rad), heading: pose.heading };
          push({ kind: "move", from: pose, to, draw: down, color, width, line: s.line });
          pose = to;
          break;
        }
        case "turn": {
          const a = value(s.value, s.line) * (s.command === "left" ? -1 : 1);
          const to = { ...pose, heading: pose.heading + a };
          push({ kind: "turn", from: pose, to, line: s.line });
          pose = to;
          break;
        }
        case "pen": down = s.down; break;
        case "width": width = Math.min(40, Math.max(0.5, value(s.value, s.line))); break;
        case "color": color = typeof s.value === "string" ? named(s.value) : hue(value(s.value, s.line)); break;
        case "set": vars.set(s.name, value(s.value, s.line)); break;
        case "repeat": {
          const n = Math.floor(value(s.count, s.line));
          if (n > MAX_WORK) throw new Failure({ code: "tooMany", line: s.line });
          // i counts the rounds of the innermost loop, from 1; the outer loop's i comes back when the inner one ends.
          const outer = vars.get("i");
          for (let k = 1; k <= n; k++) { vars.set("i", k); exec(s.body); }
          if (outer === undefined) vars.delete("i"); else vars.set("i", outer);
          break;
        }
      }
    }
  }

  try {
    exec(parse(source));
    return { steps, error: null };
  } catch (error) {
    if (error instanceof Failure) return { steps, error: error.detail };
    throw error;
  }
}

function named(name: string) {
  const { value } = COLOR_NAMES.get(name)!;
  return typeof value === "number" ? hue(value) : value;
}

// The same code with its command words and color names in another language (comments, numbers and the rest left as they are).
export function translate(source: string, locale: Locale): string {
  let tokens: Token[];
  try { tokens = tokenize(source); } catch { return source; }
  let out = "", last = 0;
  for (const token of tokens) {
    if (token.kind !== "word") continue;
    const command = KEYWORDS.get(token.text.toLowerCase());
    const color = COLOR_NAMES.get(token.text.toLowerCase());
    if (!command && !color) continue;
    out += source.slice(last, token.start) + (command ? word(command, locale) : color!.names[locale][0]);
    last = token.end;
  }
  return out + source.slice(last);
}

// The numbers written in the code, each with the command it belongs to, for the sliders that change them.
export type Knob = { start: number; end: number; value: number; line: number; command: Command | "other"; min: number; max: number; step: number };

export function knobs(source: string): Knob[] {
  let tokens: Token[];
  try { tokens = tokenize(source); } catch { return []; }
  const list: Knob[] = [];
  let owner: Command | "other" = "other";
  tokens.forEach((token, at) => {
    // A variable in an expression keeps the command it is part of (color i * 3); one being set starts something else.
    if (token.kind === "word") {
      const next = tokens[at + 1];
      owner = KEYWORDS.get(token.text.toLowerCase()) ?? (next?.kind === "sym" && next.text === "=" ? "other" : owner);
      return;
    }
    if (token.kind !== "num") return;
    const v = token.value;
    const [min, max] = owner === "right" || owner === "left" ? [0, 360]
      : owner === "color" ? [0, 360]
      : owner === "repeat" ? [1, Math.max(72, v)]
      : owner === "width" ? [1, 20]
      : owner === "forward" || owner === "back" ? [0, Math.max(300, v)]
      : [0, Math.max(100, Math.ceil(v * 2))];
    list.push({ start: token.start, end: token.end, value: v, line: token.line, command: owner, min, max, step: Number.isInteger(v) ? 1 : 0.1 });
  });
  return list;
}

export function replaceNumber(source: string, knob: Knob, value: number) {
  const text = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return source.slice(0, knob.start) + text + source.slice(knob.end);
}

// Lines that do something (not blank, not only a comment): what a challenge counts.
export function codeLines(source: string) {
  return source.split("\n").filter(line => line.replace(/(#|\/\/).*$/, "").trim() !== "").length;
}

// Whether two drawings are the same picture: every point along one lies on the other, whatever order or direction the
// lines were drawn in and however they were split. Pen-up moves and color are not part of the picture.
export type Segment = { x1: number; y1: number; x2: number; y2: number };

export const segments = (steps: Step[]): Segment[] =>
  steps.flatMap(s => (s.kind === "move" && s.draw && (s.from.x !== s.to.x || s.from.y !== s.to.y) ? [{ x1: s.from.x, y1: s.from.y, x2: s.to.x, y2: s.to.y }] : []));

function distance(px: number, py: number, s: Segment) {
  const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
  const t = Math.max(0, Math.min(1, ((px - s.x1) * dx + (py - s.y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - s.x1 - t * dx, py - s.y1 - t * dy);
}

function covered(a: Segment[], b: Segment[], tolerance: number) {
  for (const s of a) {
    const n = Math.max(1, Math.ceil(Math.hypot(s.x2 - s.x1, s.y2 - s.y1) / 3));
    for (let k = 0; k <= n; k++) {
      const x = s.x1 + ((s.x2 - s.x1) * k) / n, y = s.y1 + ((s.y2 - s.y1) * k) / n;
      if (!b.some(other => distance(x, y, other) <= tolerance)) return false;
    }
  }
  return true;
}

export function samePicture(a: Segment[], b: Segment[], tolerance = 2.5) {
  if (a.length === 0 || b.length === 0) return a.length === b.length;
  return covered(a, b, tolerance) && covered(b, a, tolerance);
}
