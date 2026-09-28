import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslations } from "use-intl";
import type MatterJS from "matter-js";
import ToolLayout from "./tool-layout";
import controls from "./tool-controls.module.css";
import styles from "./pinball.module.css";
import { BALLS_PER_GAME, STEP_MS, TABLE, createPinball, type Pinball, type PinballEvent, type Side } from "../lib/pinball";

const BEST_KEY = "paibot.pinball.best";
const LEFT_KEYS = new Set(["KeyZ", "ArrowLeft"]);
const RIGHT_KEYS = new Set(["Slash", "ArrowRight"]);
const PLUNGER_KEYS = new Set(["Space", "ArrowDown", "Enter"]);

function readBest(): number {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}
function saveBest(value: number) {
  try { localStorage.setItem(BEST_KEY, String(value)); } catch { /* storage unavailable */ }
}

function tone(audio: AudioContext, frequency: number, duration: number, type: OscillatorType, volume: number, delay = 0) {
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  const at = audio.currentTime + delay;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, at);
  gain.gain.setValueAtTime(volume, at);
  gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(at);
  oscillator.stop(at + duration);
}

function playSound(audio: AudioContext, event: PinballEvent) {
  if (event.type === "bumper") tone(audio, 620 + event.index * 90, 0.09, "square", 0.08);
  if (event.type === "sling") tone(audio, 380, 0.06, "square", 0.06);
  if (event.type === "lane") tone(audio, 1100, 0.08, "triangle", 0.1);
  if (event.type === "lanesBonus") [784, 988, 1175, 1568].forEach((f, i) => tone(audio, f, 0.2, "triangle", 0.12, i * 0.08));
  if (event.type === "launch") tone(audio, 180, 0.12, "sawtooth", 0.05);
  if (event.type === "target" || event.type === "inlane") tone(audio, 880, 0.07, "triangle", 0.09);
  if (event.type === "targetsBonus" || event.type === "inlanesBonus") [659, 880, 1319].forEach((f, i) => tone(audio, f, 0.18, "triangle", 0.12, i * 0.08));
  if (event.type === "kickback") tone(audio, 140, 0.2, "sawtooth", 0.12);
  if (event.type === "saved") [523, 659].forEach((f, i) => tone(audio, f, 0.2, "triangle", 0.12, i * 0.12));
  if (event.type === "postUp") [392, 523, 784].forEach((f, i) => tone(audio, f, 0.15, "square", 0.07, i * 0.07));
  if (event.type === "drain") [330, 247, 165].forEach((f, i) => tone(audio, f, 0.25, "triangle", 0.1, i * 0.15));
}

// How long a hit bumper or lit lane stays highlighted, in steps.
const FLASH_STEPS = 8;

function draw(canvas: HTMLCanvasElement, game: Pinball, flashes: Map<number, number>) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const css = getComputedStyle(canvas);
  const color = (name: string) => css.getPropertyValue(name).trim();
  const { state } = game;
  const scale = canvas.width / TABLE.width;
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.clearRect(0, 0, TABLE.width, TABLE.height);
  const lit = (on: boolean) => (on ? color("--success") : color("--line"));
  const dot = (x: number, y: number, r: number, fill: string) => {
    context.beginPath();
    context.arc(x, y, r, 0, Math.PI * 2);
    context.fillStyle = fill;
    context.fill();
  };

  for (const body of game.engine.world.bodies) {
    const part = game.partOf(body);
    const i = game.indexOf(body);
    const { x, y } = body.position;
    // Sensors are drawn as lamps, or not at all.
    if (part === "drain" || part === "outlane") continue;
    if (part === "inlane") { dot(x, y, 5, lit(state.inlanes[i])); continue; }
    if (part === "kickback") { dot(x, y, 6, lit(state.kickback)); continue; }
    if (part === "lane") { dot(x, y, 6, lit(state.lanes[i])); continue; }

    const flashing = (flashes.get(body.id) ?? 0) > state.steps;
    let fill = color("--muted");
    if (part === "bumper") fill = flashing ? color("--success") : color("--accent");
    if (part === "sling") fill = flashing ? color("--success") : color("--accent-dark");
    if (part === "target") fill = state.targets[i] ? color("--success") : color("--accent-dark");
    if (part === "flipper") fill = color("--text");
    if (part === "centerPost") fill = color("--success");
    if (part === "ball") fill = color("--accent-dark");
    context.beginPath();
    if (body.circleRadius) context.arc(x, y, body.circleRadius, 0, Math.PI * 2);
    else {
      // The plunger sinks as it charges.
      const drop = part === "plunger" ? state.charge * 18 : 0;
      body.vertices.forEach((v, n) => (n ? context.lineTo(v.x, v.y + drop) : context.moveTo(v.x, v.y + drop)));
      context.closePath();
    }
    context.fillStyle = fill;
    context.fill();
    if (part === "bumper") dot(x, y, (body.circleRadius ?? 20) * 0.45, color("--surface"));
    if (part === "ball") dot(x - 3, y - 3, 3, color("--surface"));
  }

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "bold 13px system-ui, sans-serif";
  context.fillStyle = lit(state.saver > 0 && !state.saverUsed);
  context.fillText("SAVE", 175, 748);
  context.fillStyle = lit(state.post > 0);
  context.fillText("POST", 267, 748);
  context.fillStyle = lit(state.kickback);
  context.fillText("KICK", 30, 725);
}

export default function PinballGame() {
  const t = useTranslations("App.pinball");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const matterRef = useRef<typeof MatterJS | null>(null);
  const gameRef = useRef<Pinball | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const soundRef = useRef(true);
  const flashesRef = useRef(new Map<number, number>());
  const [ready, setReady] = useState(false);
  const [score, setScore] = useState(0);
  const [ball, setBall] = useState(1);
  const [best, setBest] = useState(0);
  const [over, setOver] = useState(false);
  const [message, setMessage] = useState("");
  const [sound, setSound] = useState(true);
  const [charge, setCharge] = useState(0);
  soundRef.current = sound;

  const newGame = () => {
    const Matter = matterRef.current;
    if (!Matter) return;
    const game = createPinball(Matter);
    flashesRef.current.clear();
    game.onEvent(event => {
      if (soundRef.current && audioRef.current) playSound(audioRef.current, event);
      if (event.type === "bumper" || event.type === "sling") flashesRef.current.set(event.id, game.state.steps + FLASH_STEPS);
      if (event.type === "lanesBonus") setMessage(t("lanesBonus"));
      if (event.type === "targetsBonus") setMessage(t("targetsBonus"));
      if (event.type === "inlanesBonus") setMessage(t("inlanesBonus"));
      if (event.type === "kickback") setMessage(t("kickback"));
      if (event.type === "saved") setMessage(t("saved"));
      if (event.type === "postUp") setMessage(t("postUp"));
      if (event.type === "launch") setMessage("");
      if (event.type === "drain" && !game.state.over) setMessage(t("drained"));
      if (event.type === "gameOver") {
        setOver(true);
        setMessage(t("gameOver"));
        setBest(previous => {
          if (game.state.score <= previous) return previous;
          saveBest(game.state.score);
          return game.state.score;
        });
      }
    });
    gameRef.current = game;
    setScore(0);
    setBall(1);
    setOver(false);
    setMessage(t("howToLaunch"));
  };

  const unlockAudio = () => { audioRef.current ??= new AudioContext(); };
  const flipper = (side: Side, pressed: boolean) => { unlockAudio(); gameRef.current?.setFlipper(side, pressed); };
  const plunger = (pulling: boolean) => { unlockAudio(); gameRef.current?.setPlunger(pulling); };

  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    setBest(readBest());
    import("matter-js").then(module => {
      if (cancelled) return;
      matterRef.current = (module.default ?? module) as typeof MatterJS;
      newGame();
      setReady(true);
      let last = performance.now();
      let pending = 0;
      const loop = (now: number) => {
        const game = gameRef.current;
        const canvas = canvasRef.current;
        pending = Math.min(pending + now - last, 250);
        last = now;
        if (game && canvas) {
          while (pending >= STEP_MS) {
            game.step();
            pending -= STEP_MS;
          }
          draw(canvas, game, flashesRef.current);
          setScore(game.state.score);
          setBall(Math.min(BALLS_PER_GAME, BALLS_PER_GAME - game.state.ballsLeft + 1));
          setCharge(game.state.charge);
        }
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);
    });

    const canvas = canvasRef.current;
    const resize = () => {
      if (!canvas) return;
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.width * TABLE.height / TABLE.width;
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (canvas) observer.observe(canvas);

    // Keyboard play; these keys would otherwise scroll the page.
    const key = (pressed: boolean) => (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      const side: Side | null = LEFT_KEYS.has(event.code) ? "left" : RIGHT_KEYS.has(event.code) ? "right" : null;
      if (side) flipper(side, pressed);
      else if (PLUNGER_KEYS.has(event.code)) {
        if (event.repeat) { event.preventDefault(); return; }
        plunger(pressed);
      } else return;
      event.preventDefault();
    };
    const down = key(true), up = key(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      void audioRef.current?.close();
    };
  }, []);

  // Touch: the left or right half of the table works its flipper.
  const tableSide = (event: ReactPointerEvent<HTMLCanvasElement>): Side => {
    const rect = event.currentTarget.getBoundingClientRect();
    return event.clientX - rect.left < rect.width / 2 ? "left" : "right";
  };
  const hold = (onDown: () => void, onUp: () => void) => ({
    onPointerDown: (event: ReactPointerEvent) => { event.preventDefault(); (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId); onDown(); },
    onPointerUp: onUp,
    onPointerCancel: onUp,
    onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
  });

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <dl className={styles["score"]}>
        <div><dt>{t("score")}</dt><dd data-pinball="score">{score.toLocaleString()}</dd></div>
        <div><dt>{t("ball")}</dt><dd>{over ? "-" : `${ball} / ${BALLS_PER_GAME}`}</dd></div>
        <div><dt>{t("best")}</dt><dd>{best.toLocaleString()}</dd></div>
      </dl>
      <canvas
        ref={canvasRef}
        className={styles["table"]}
        role="img"
        aria-label={t("tableLabel")}
        onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); flipper(tableSide(event), true); }}
        onPointerUp={event => flipper(tableSide(event), false)}
        onPointerCancel={() => { flipper("left", false); flipper("right", false); }}
      />
      <p className={styles["message"]} aria-live="polite">{message}</p>
      {over ? (
        <button className="auth-link" type="button" onClick={newGame}>{t("again")}</button>
      ) : (
        <div className={styles["pad"]}>
          <button type="button" className={styles["flip"]} disabled={!ready} {...hold(() => flipper("left", true), () => flipper("left", false))}>{t("left")}</button>
          <button type="button" className={styles["launch"]} disabled={!ready} {...hold(() => plunger(true), () => plunger(false))}>
            <span>{t("launch")}</span>
            <span className={styles["meter"]} style={{ width: `${Math.round(charge * 100)}%` }} />
          </button>
          <button type="button" className={styles["flip"]} disabled={!ready} {...hold(() => flipper("right", true), () => flipper("right", false))}>{t("right")}</button>
        </div>
      )}
      <p className={controls.label}>{t("keys")}</p>
      <button className={styles["sound"]} type="button" aria-pressed={sound} onClick={() => setSound(on => !on)}>
        {sound ? t("soundOn") : t("soundOff")}
      </button>
    </ToolLayout>
  );
}
