"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import styles from "./code-draw.module.css";
import { codeLines, knobs, replaceNumber, run, samePicture, segments, translate, word, type Command, type Locale, type Pose, type Result, type Segment, type Step } from "./lang";
import { EXAMPLES, STAGES } from "./stages";

const VIEW = 400; // the robot's world: -200 to 200 each way, y up
const SCALE = 2; // canvas pixels per unit, for sharp lines
const MAX_SECONDS = 20; // a long drawing is sped up to end within this
const SPEEDS = { slow: { move: 80, turn: 180 }, normal: { move: 260, turn: 600 }, fast: { move: 1200, turn: 3000 }, instant: null } as const;
type Speed = keyof typeof SPEEDS;
type Mode = "free" | "challenge";
const CLEARED_KEY = "code-draw:cleared";
const CODE_KEY = "code-draw:code";

// The buttons that type a command at the cursor, for phones; repeat brings its brackets.
const PALETTE: { command: Command; arg: string }[] = [
  { command: "forward", arg: " 50" }, { command: "back", arg: " 50" }, { command: "right", arg: " 90" }, { command: "left", arg: " 90" },
  { command: "repeat", arg: " 4 [" }, { command: "color", arg: " 0" }, { command: "width", arg: " 5" }, { command: "penup", arg: "" }, { command: "pendown", arg: "" },
];

function load(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function save(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
}

type Play = { source: string; result: Result; times: number[]; total: number; start: number; drawn: number; target: Segment[] | null };

export default function CodeDraw() {
  const t = useTranslations("App.codeDraw");
  const locale = useLocale() as Locale;
  const starter = useMemo(() => translate(EXAMPLES[0].code, locale).replace("# ▶", `# ${t("starterComment")}`), [locale, t]);
  const [mode, setMode] = useState<Mode>("free");
  const [code, setCode] = useState(starter);
  const [stage, setStage] = useState(0);
  const [stageCode, setStageCode] = useState<Record<string, string>>({});
  const [cleared, setCleared] = useState<string[]>([]);
  const [speed, setSpeed] = useState<Speed>("normal");
  const [line, setLine] = useState(0);
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<Result | null>(null);
  const [clear, setClear] = useState<{ lines: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inkRef = useRef<HTMLCanvasElement | null>(null);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const playRef = useRef<Play | null>(null);
  const frameRef = useRef(0);
  const caretRef = useRef<number | null>(null);

  const current = STAGES[stage];
  const text = mode === "free" ? code : stageCode[current.id] ?? (stage === 0 ? translate("forward 100\nright 90\n", locale) : "");
  const target = useMemo(() => (mode === "challenge" ? segments(run(current.answer).steps) : null), [mode, current]);
  const numbers = useMemo(() => knobs(text).slice(0, 16), [text]);
  const lineCount = text.split("\n").length;

  useEffect(() => {
    const saved = load(CODE_KEY);
    if (saved) setCode(saved);
    try { setCleared(JSON.parse(load(CLEARED_KEY) ?? "[]")); } catch { /* ignore a broken record */ }
  }, []);

  function edit(value: string) {
    if (mode === "free") { setCode(value); save(CODE_KEY, value); }
    else setStageCode(all => ({ ...all, [current.id]: value }));
  }

  // Draw the code. Animated, the robot walks each line; instantly (or when a slider moves), the whole picture appears at once.
  function start(source = text, instant = speed === "instant") {
    cancelAnimationFrame(frameRef.current);
    const result = run(source);
    const rate = SPEEDS[speed] ?? SPEEDS.normal;
    const times: number[] = [];
    let total = 0;
    for (const step of result.steps) {
      total += step.kind === "move" ? Math.hypot(step.to.x - step.from.x, step.to.y - step.from.y) / rate.move : Math.abs(step.to.heading - step.from.heading) / rate.turn;
      times.push(total);
    }
    const stretch = total > MAX_SECONDS ? MAX_SECONDS / total : 1;
    playRef.current = { source, result, times: times.map(time => time * stretch), total: instant ? 0 : total * stretch, start: performance.now(), drawn: 0, target };
    clearInk();
    setClear(null);
    setOutcome(null);
    setRunning(!instant);
    const tick = (now: number) => {
      const done = frame(now);
      if (done) finish();
      else frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  }

  function finish() {
    const play = playRef.current;
    if (!play) return;
    setRunning(false);
    setLine(0);
    setOutcome(play.result);
    if (play.target && !play.result.error && samePicture(segments(play.result.steps), play.target)) {
      setClear({ lines: codeLines(play.source) });
      if (!cleared.includes(current.id)) {
        const next = [...cleared, current.id];
        setCleared(next);
        save(CLEARED_KEY, JSON.stringify(next));
      }
    }
  }

  function stop() {
    const play = playRef.current;
    if (!play) return;
    play.total = 0;
  }

  function clearInk() {
    const ink = inkRef.current ?? document.createElement("canvas");
    inkRef.current = ink;
    ink.width = VIEW * SCALE;
    ink.height = VIEW * SCALE;
    ink.getContext("2d")?.clearRect(0, 0, ink.width, ink.height);
  }

  // One frame: lines finished since the last frame go onto the ink layer once; the line in progress and the robot are drawn on top.
  function frame(now: number) {
    const play = playRef.current, canvas = canvasRef.current, ink = inkRef.current;
    if (!play || !canvas || !ink) return true;
    const { steps } = play.result;
    const elapsed = (now - play.start) / 1000;
    const over = elapsed >= play.total;
    let k = play.drawn;
    while (k < steps.length && (over || play.times[k] <= elapsed)) k++;
    const inkContext = ink.getContext("2d")!;
    for (let i = play.drawn; i < k; i++) stroke(inkContext, steps[i], 1);
    play.drawn = k;
    const active = steps[k];
    const fraction = active ? (elapsed - (play.times[k - 1] ?? 0)) / Math.max(1e-6, play.times[k] - (play.times[k - 1] ?? 0)) : 1;
    paint(canvas, ink, play.target, over || !active ? null : active, Math.min(1, Math.max(0, fraction)), steps[k - 1]?.to ?? { x: 0, y: 0, heading: 0 });
    const lineNow = over || !active ? 0 : active.line;
    setLine(previous => (previous === lineNow ? previous : lineNow));
    return over || k >= steps.length;
  }

  // The empty canvas (and the faint picture to draw, in a challenge) whenever the code or the challenge changes.
  useEffect(() => {
    cancelAnimationFrame(frameRef.current);
    playRef.current = null;
    setRunning(false);
    setLine(0);
    clearInk();
    if (canvasRef.current && inkRef.current) paint(canvasRef.current, inkRef.current, target, null, 0, { x: 0, y: 0, heading: 0 });
    setOutcome(null);
    setClear(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, stage]);
  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);
  // Keep the line being run in view while the robot works through a long program.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !line) return;
    const height = parseFloat(getComputedStyle(editor).lineHeight) || 24;
    const top = (line - 1) * height;
    if (top < editor.scrollTop || top + height > editor.scrollTop + editor.clientHeight - height) editor.scrollTop = Math.max(0, top - editor.clientHeight / 3);
  }, [line]);

  function slide(index: number, value: number) {
    const next = replaceNumber(text, numbers[index], value);
    edit(next);
    start(next, true);
  }

  function insert(command: Command, arg: string) {
    const editor = editorRef.current;
    const at = editor?.selectionStart ?? text.length;
    const lineStart = text.lastIndexOf("\n", at - 1) + 1;
    const indent = /^[ \t]*/.exec(text.slice(lineStart))![0];
    const before = text.slice(0, at), after = text.slice(at);
    const prefix = before.trim() === "" || before.endsWith("\n") ? "" : `\n${indent}`;
    const piece = command === "repeat" ? `${word(command, locale)}${arg}\n${indent}  \n${indent}]` : `${word(command, locale)}${arg}`;
    const caret = before.length + prefix.length + (command === "repeat" ? word(command, locale).length + arg.length + 3 + indent.length : piece.length);
    const next = before + prefix + piece + (after.startsWith("\n") || after === "" ? "" : "\n") + after;
    caretRef.current = caret;
    edit(next);
  }

  // After a palette button has typed a command, the cursor goes where the next thing is to be written.
  useLayoutEffect(() => {
    const editor = editorRef.current, caret = caretRef.current;
    if (!editor || caret === null) return;
    caretRef.current = null;
    editor.focus();
    editor.setSelectionRange(caret, caret);
  });

  function keys(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); start(); }
  }

  const error = outcome?.error;
  const best = current.lines;

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <div className={styles.tabs} role="group" aria-label={t("modeLabel")}>
        {(["free", "challenge"] as Mode[]).map(name => <button key={name} type="button" className={styles.tab} aria-pressed={mode === name} onClick={() => setMode(name)}>{t(`modes.${name}`)}</button>)}
      </div>
      {mode === "free" ? (
        <div className={styles.chips} role="group" aria-label={t("examples")}>
          {EXAMPLES.map(example => <button key={example.id} type="button" className={styles.chip} onClick={() => { const next = translate(example.code, locale).replace("# ▶", `# ${t("starterComment")}`); edit(next); start(next); }}>{t(`exampleNames.${example.id}`)}</button>)}
        </div>
      ) : (
        <>
          <div className={styles.chips} role="group" aria-label={t("stagesLabel")}>
            {STAGES.map((s, index) => <button key={s.id} type="button" className={styles.chip} aria-pressed={stage === index} data-cleared={cleared.includes(s.id) || undefined} onClick={() => setStage(index)}>{cleared.includes(s.id) ? "✓ " : ""}{index + 1}. {t(`stages.${s.id}.name`)}</button>)}
          </div>
          <p className={styles.goal}><strong>{t("stageHeading", { n: stage + 1, name: t(`stages.${current.id}.name`) })}</strong> {t(`stages.${current.id}.goal`)}</p>
        </>
      )}
      <div className={styles.workspace}>
        <div className={styles.side}>
          <div className={styles.editor}>
            <div ref={gutterRef} className={styles.gutter} aria-hidden="true">
              {Array.from({ length: lineCount }, (_, i) => <div key={i} data-active={line === i + 1 || undefined} data-error={error?.line === i + 1 || undefined}>{i + 1}</div>)}
            </div>
            <textarea
              ref={editorRef}
              className={styles.code}
              value={text}
              onChange={event => edit(event.target.value)}
              onKeyDown={keys}
              onScroll={event => { if (gutterRef.current) gutterRef.current.scrollTop = event.currentTarget.scrollTop; }}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              wrap="off"
              placeholder={t("placeholder")}
              aria-label={t("editorLabel")}
            />
          </div>
          <div className={styles.palette} role="group" aria-label={t("paletteLabel")}>
            {PALETTE.map(item => <button key={item.command} type="button" className={styles.word} onClick={() => insert(item.command, item.arg)}>{word(item.command, locale)}</button>)}
          </div>
          <div className={styles.run}>
            {running
              ? <button type="button" className={styles.go} onClick={stop}>{t("finish")}</button>
              : <button type="button" className={styles.go} onClick={() => start()}>▶ {t("run")}</button>}
            <div className={styles.speeds} role="group" aria-label={t("speedLabel")}>
              {(Object.keys(SPEEDS) as Speed[]).map(name => <button key={name} type="button" className={styles.chip} aria-pressed={speed === name} onClick={() => setSpeed(name)}>{t(`speeds.${name}`)}</button>)}
            </div>
          </div>
        </div>
        <div className={styles.stage}>
          <canvas ref={canvasRef} className={styles.canvas} width={VIEW * SCALE} height={VIEW * SCALE} role="img" aria-label={t("canvasLabel")} />
          <p className={styles.status} role="status" data-code-draw="status" data-state={error ? "error" : clear ? "clear" : undefined}>
            {error ? t(`errors.${error.code}`, { line: error.line, text: "text" in error ? error.text : "" })
              : running ? t("running", { line })
              : clear ? `${t("cleared", { lines: clear.lines })} ${clear.lines > best ? t("shorter", { best }) : t("shortest")}`
              : outcome ? (mode === "challenge" ? t("notYet") : t("done", { steps: outcome.steps.length }))
              : t("ready")}
          </p>
          {clear && stage < STAGES.length - 1 && <div className={controls.actions}><button type="button" className={styles.go} onClick={() => setStage(stage + 1)}>{t("next")}</button></div>}
        </div>
      </div>
      {numbers.length > 0 && (
        <section className={styles.knobs} aria-label={t("knobsLabel")}>
          <h2 className={styles.knobsTitle}>{t("knobsTitle")}</h2>
          {numbers.map((knob, index) => (
            <label key={`${index}-${knob.line}`} className={styles.knob}>
              <span className={styles.knobName}>{t("knobName", { line: knob.line, command: knob.command === "other" ? "" : word(knob.command, locale) })}</span>
              <input type="range" min={knob.min} max={knob.max} step={knob.step} value={knob.value} aria-label={t("knobName", { line: knob.line, command: knob.command === "other" ? "" : word(knob.command, locale) })} onChange={event => slide(index, Number(event.target.value))} />
              <span className={styles.knobValue}>{knob.value}</span>
            </label>
          ))}
        </section>
      )}
      <details className={styles.help}>
        <summary>{t("helpTitle")}</summary>
        <ul>
          {(["forward", "back", "right", "left", "repeat", "penup", "pendown", "color", "width"] as Command[]).map(command => <li key={command}><code>{word(command, locale)}{PALETTE.find(item => item.command === command)?.arg.replace(" [", "") ?? ""}</code> {t(`help.${command}`)}</li>)}
          <li><code>i</code> {t("help.i")}</li>
          <li><code>x = 10</code> {t("help.variables")}</li>
          <li><code># …</code> {t("help.comment")}</li>
        </ul>
      </details>
      <p className={controls.label}>{t("hint")}</p>
    </ToolLayout>
  );
}

const toCanvas = (x: number, y: number) => [(VIEW / 2 + x) * SCALE, (VIEW / 2 - y) * SCALE] as const;

function stroke(ctx: CanvasRenderingContext2D, step: Step, fraction: number) {
  if (step.kind !== "move" || !step.draw) return;
  ctx.strokeStyle = step.color;
  ctx.lineWidth = step.width * SCALE;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(...toCanvas(step.from.x, step.from.y));
  ctx.lineTo(...toCanvas(step.from.x + (step.to.x - step.from.x) * fraction, step.from.y + (step.to.y - step.from.y) * fraction));
  ctx.stroke();
}

function paint(canvas: HTMLCanvasElement, ink: HTMLCanvasElement, target: Segment[] | null, active: Step | null, fraction: number, rest: Pose) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const size = VIEW * SCALE;
  ctx.fillStyle = "#0b1020";
  ctx.fillRect(0, 0, size, size);
  // A faint grid every 50, the axes a little brighter.
  ctx.lineWidth = 1;
  for (let v = -200; v <= 200; v += 50) {
    ctx.strokeStyle = v === 0 ? "rgba(148, 163, 184, 0.28)" : "rgba(148, 163, 184, 0.12)";
    ctx.beginPath(); ctx.moveTo(...toCanvas(v, -200)); ctx.lineTo(...toCanvas(v, 200)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(...toCanvas(-200, v)); ctx.lineTo(...toCanvas(200, v)); ctx.stroke();
  }
  if (target) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = 12 * SCALE / 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (const s of target) { ctx.moveTo(...toCanvas(s.x1, s.y1)); ctx.lineTo(...toCanvas(s.x2, s.y2)); }
    ctx.stroke();
  }
  ctx.drawImage(ink, 0, 0);
  let pose = rest;
  if (active) {
    stroke(ctx, active, fraction);
    pose = {
      x: active.from.x + (active.to.x - active.from.x) * fraction,
      y: active.from.y + (active.to.y - active.from.y) * fraction,
      heading: active.from.heading + (active.to.heading - active.from.heading) * fraction,
    };
  }
  robot(ctx, pose);
}

// The robot: a round body with an arrow showing which way it faces.
function robot(ctx: CanvasRenderingContext2D, pose: Pose) {
  const [x, y] = toCanvas(pose.x, pose.y);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((pose.heading * Math.PI) / 180);
  ctx.fillStyle = "#fbbf24";
  ctx.strokeStyle = "#0b1020";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -26);
  ctx.lineTo(15, 4);
  ctx.lineTo(-15, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#f8fafc";
  ctx.beginPath();
  ctx.arc(0, 4, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#0b1020";
  ctx.beginPath();
  ctx.arc(-4.5, 2, 2.5, 0, Math.PI * 2);
  ctx.arc(4.5, 2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
