import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "use-intl";
import ShareButtons from "../../components/share-buttons";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import styles from "./goldfish-escape.module.css";
import { FISH_X, POI_RADIUS, STEP_MS, TANK, createGoldfishEscape, fishRadius, type EscapeEvent, type GoldfishEscape, type Poi } from "./engine";

const BEST_KEY = "paibot.goldfish-escape.best";
const KIND_KEY = "paibot.goldfish-escape.kind";
const STROKE_KEYS = new Set(["Space", "ArrowUp", "Enter", "KeyW"]);
const KINDS = ["wakin", "ryukin", "demekin"] as const;
type Kind = (typeof KINDS)[number];

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function save(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
}

function tone(audio: AudioContext, frequency: number, duration: number, type: OscillatorType, volume: number, delay = 0, slideTo?: number) {
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  const at = audio.currentTime + delay;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, at);
  if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, at + duration);
  gain.gain.setValueAtTime(volume, at);
  gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(at);
  oscillator.stop(at + duration);
}

function playSound(audio: AudioContext, event: EscapeEvent) {
  // A stroke is a small bubble: a quick rising blip.
  if (event.type === "stroke") tone(audio, 300, 0.09, "sine", 0.07, 0, 620);
  if (event.type === "eat") tone(audio, event.grew ? 784 : 660, 0.1, "triangle", 0.1);
  if (event.type === "eat" && event.grew) tone(audio, 1047, 0.16, "triangle", 0.1, 0.08);
  if (event.type === "pass") tone(audio, 523, 0.07, "triangle", 0.06);
  if (event.type === "tear") tone(audio, 1400, 0.12, "sawtooth", 0.03, 0, 300);
  if (event.type === "caught") [523, 415, 330, 262].forEach((f, i) => tone(audio, f, 0.28, "triangle", 0.1, i * 0.14));
}

function fit(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) return null;
  const ratio = window.devicePixelRatio || 1;
  const w = Math.round(canvas.clientWidth * ratio);
  if (canvas.width !== w) {
    canvas.width = w;
    canvas.height = Math.round(w * TANK.height / TANK.width);
  }
  const scale = canvas.width / TANK.width;
  context.setTransform(scale, 0, 0, scale, 0, 0);
  return context;
}

// The colours of each kind: body, belly or pattern, fins.
const LOOKS: Record<Kind, { body: string; pattern: string; fin: string }> = {
  wakin: { body: "#f0562e", pattern: "#ffb08a", fin: "rgba(240, 86, 46, 0.75)" },
  ryukin: { body: "#ffffff", pattern: "#e8402a", fin: "rgba(255, 236, 228, 0.8)" },
  demekin: { body: "#2a2730", pattern: "#4b4553", fin: "rgba(42, 39, 48, 0.78)" },
};

// The fish at (x, y), r its size, tilted by how it moves, its tail waving with the time.
function drawFish(context: CanvasRenderingContext2D, kind: Kind, x: number, y: number, r: number, tilt: number, time: number) {
  const look = LOOKS[kind];
  const wave = Math.sin(time * 0.25) * 0.35;
  const round = kind === "ryukin" ? 0.95 : kind === "demekin" ? 0.85 : 0.68;
  context.save();
  context.translate(x, y);
  context.rotate(tilt);

  // The tail, behind the body: one fan for the wakin, long double fans for the others.
  context.fillStyle = look.fin;
  const tails = kind === "wakin" ? [0] : [-0.32, 0.32];
  const length = kind === "wakin" ? 1.1 : 1.6;
  for (const spread of tails) {
    context.save();
    context.translate(-r * 1.05, 0);
    context.rotate(wave + spread);
    context.beginPath();
    context.moveTo(0, 0);
    context.quadraticCurveTo(-r * length * 0.6, -r * 0.9, -r * length, -r * 0.55);
    context.quadraticCurveTo(-r * length * 0.75, 0, -r * length, r * 0.55);
    context.quadraticCurveTo(-r * length * 0.6, r * 0.9, 0, 0);
    context.fill();
    context.restore();
  }

  // Body, with its pattern, then a fin on top.
  context.beginPath();
  context.ellipse(0, 0, r * 1.2, r * round, 0, 0, Math.PI * 2);
  context.fillStyle = look.body;
  context.fill();
  context.save();
  context.clip();
  context.fillStyle = look.pattern;
  if (kind === "ryukin") {
    context.beginPath();
    context.ellipse(-r * 0.2, -r * 0.35, r * 0.75, r * 0.5, 0.3, 0, Math.PI * 2);
    context.fill();
  } else {
    context.beginPath();
    context.ellipse(r * 0.1, r * 0.55, r * 1.1, r * 0.45, 0, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
  context.fillStyle = look.fin;
  context.beginPath();
  context.moveTo(-r * 0.4, -r * round * 0.85);
  context.quadraticCurveTo(-r * 0.1, -r * round * 1.6, r * 0.35, -r * round * 0.9);
  context.fill();

  // Eyes: the demekin's stand out from its head.
  const eyeX = r * 0.72, eyeY = -r * 0.18;
  const eyeR = kind === "demekin" ? r * 0.32 : r * 0.17;
  if (kind === "demekin") {
    context.beginPath();
    context.arc(eyeX + r * 0.12, eyeY - r * 0.1, eyeR, 0, Math.PI * 2);
    context.fillStyle = "#3a3540";
    context.fill();
  }
  context.beginPath();
  context.arc(eyeX + (kind === "demekin" ? r * 0.16 : 0), eyeY - (kind === "demekin" ? r * 0.12 : 0), eyeR * 0.62, 0, Math.PI * 2);
  context.fillStyle = "#111";
  context.fill();
  context.beginPath();
  context.arc(eyeX + (kind === "demekin" ? r * 0.2 : r * 0.04), eyeY - (kind === "demekin" ? r * 0.18 : r * 0.05), eyeR * 0.22, 0, Math.PI * 2);
  context.fillStyle = "#fff";
  context.fill();
  context.restore();
}

// A scoop: the handle up out of the water, the plastic ring, and the paper; a torn one with a ragged hole.
function drawPoi(context: CanvasRenderingContext2D, poi: Poi) {
  const ring = poi.id % 2 ? "#e8609a" : "#3f8fe0";
  context.save();
  context.strokeStyle = ring;
  context.lineCap = "round";
  context.lineWidth = 7;
  context.beginPath();
  context.moveTo(poi.x + POI_RADIUS * 0.6, poi.y - POI_RADIUS * 0.8);
  context.lineTo(poi.x + POI_RADIUS * 1.5, poi.y - POI_RADIUS * 3);
  context.stroke();

  const paper = new Path2D();
  paper.arc(poi.x, poi.y, POI_RADIUS, 0, Math.PI * 2);
  if (poi.torn) {
    // The same ragged hole for a scoop each time it is drawn: its corners come from its id.
    const points = 11;
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const jag = 0.55 + 0.3 * Math.abs(Math.sin(poi.id * 12.9898 + i * 78.233));
      const px = poi.x + Math.cos(angle) * POI_RADIUS * jag;
      const py = poi.y + Math.sin(angle) * POI_RADIUS * jag;
      if (i === 0) paper.moveTo(px, py); else paper.lineTo(px, py);
    }
  }
  context.fillStyle = "rgba(255, 255, 255, 0.62)";
  context.fill(paper, "evenodd");
  context.lineWidth = 5;
  context.beginPath();
  context.arc(poi.x, poi.y, POI_RADIUS, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function draw(canvas: HTMLCanvasElement, game: GoldfishEscape, kind: Kind) {
  const context = fit(canvas);
  if (!context) return;
  const { state } = game;
  const time = state.steps;
  // How far the tank has moved, for the gravel and the weeds.
  const scroll = state.started ? time * state.speed : 0;

  // Air, then the water darkening with depth.
  context.fillStyle = getComputedStyle(canvas).getPropertyValue("--surface").trim() || "#f4f7fa";
  context.fillRect(0, 0, TANK.width, TANK.height);
  const water = context.createLinearGradient(0, TANK.surface, 0, TANK.height);
  water.addColorStop(0, "#bfe8f7");
  water.addColorStop(1, "#2f7fae");
  context.fillStyle = water;
  context.beginPath();
  context.moveTo(0, TANK.height);
  for (let x = 0; x <= TANK.width; x += 10) context.lineTo(x, TANK.surface + Math.sin((x + time * 1.5) * 0.04) * 2.5);
  context.lineTo(TANK.width, TANK.height);
  context.fill();

  // Weeds and gravel, going by.
  context.strokeStyle = "rgba(46, 125, 70, 0.55)";
  context.lineWidth = 6;
  context.lineCap = "round";
  for (let i = -1; i < 4; i++) {
    const x = ((i * 150 - scroll * 0.6) % 600 + 600) % 600 - 50;
    context.beginPath();
    context.moveTo(x, TANK.floor + 6);
    context.quadraticCurveTo(x + Math.sin(time * 0.03 + i) * 14, TANK.floor - 60, x + 6, TANK.floor - 120 - (i % 2) * 30);
    context.stroke();
  }
  context.fillStyle = "#c9b18a";
  context.fillRect(0, TANK.floor, TANK.width, TANK.height - TANK.floor);
  context.fillStyle = "#a88d63";
  for (let i = 0; i < 30; i++) {
    const x = ((i * 23 - scroll) % 690 + 690) % 690 - 10;
    context.beginPath();
    context.ellipse(x, TANK.floor + 8 + (i % 3) * 7, 6 + (i % 4), 4, 0, 0, Math.PI * 2);
    context.fill();
  }

  // Bubbles from the fish now and then.
  const r = fishRadius(state.size);
  context.strokeStyle = "rgba(255, 255, 255, 0.7)";
  context.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    const age = (time + i * 40) % 160;
    const by = state.fishY - r - age * 1.4;
    if (by < TANK.surface + 4) continue;
    context.beginPath();
    context.arc(FISH_X + r * 1.1 - (state.started ? age * state.speed * 0.6 : 0) + Math.sin(age * 0.2) * 4, by, 2 + i, 0, Math.PI * 2);
    context.stroke();
  }

  context.fillStyle = "#8a5a2b";
  for (const food of game.foods()) {
    context.beginPath();
    context.arc(food.x, food.y, 4, 0, Math.PI * 2);
    context.fill();
  }

  // Before the first stroke the fish bobs gently; while playing it tilts with its speed; caught, it lies still.
  const bob = state.started ? 0 : Math.sin(time * 0.06) * 6;
  const tilt = state.over ? 0 : Math.max(-0.5, Math.min(0.5, state.vy * 0.09));
  drawFish(context, kind, FISH_X, state.fishY + bob, r, tilt, state.over ? 0 : time);
  for (const poi of game.pois()) drawPoi(context, poi);
}

export default function GoldfishEscapeGame() {
  const t = useTranslations("App.goldfishEscape");
  const locale = useLocale();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GoldfishEscape | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const soundRef = useRef(true);
  const kindRef = useRef<Kind>("wakin");
  const [kind, setKind] = useState<Kind>("wakin");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [passed, setPassed] = useState(0);
  const [strokes, setStrokes] = useState(0);
  const [phase, setPhase] = useState<"ready" | "playing" | "over">("ready");
  const [message, setMessage] = useState("");
  const [sound, setSound] = useState(true);
  soundRef.current = sound;
  kindRef.current = kind;

  const newGame = () => {
    const game = createGoldfishEscape();
    game.onEvent(event => {
      if (soundRef.current && audioRef.current) playSound(audioRef.current, event);
      if (event.type === "eat" && event.grew) setMessage(t("grew"));
      if (event.type === "tear") setMessage(t("tore"));
      if (event.type === "caught") {
        setPhase("over");
        setMessage(t("caught"));
        setBest(previous => {
          if (game.state.score <= previous) return previous;
          save(BEST_KEY, String(game.state.score));
          return game.state.score;
        });
      }
    });
    gameRef.current = game;
    setScore(0);
    setPassed(0);
    setStrokes(0);
    setPhase("ready");
    setMessage(t("start"));
  };

  const stroke = () => {
    audioRef.current ??= new AudioContext();
    const game = gameRef.current;
    if (!game || game.state.over) return;
    if (game.stroke()) setPhase("playing");
  };

  useEffect(() => {
    let frame = 0;
    setBest(Number(read(BEST_KEY)) || 0);
    const stored = read(KIND_KEY);
    if (stored && (KINDS as readonly string[]).includes(stored)) setKind(stored as Kind);
    newGame();
    let last = performance.now();
    let pending = 0;
    const loop = (now: number) => {
      const game = gameRef.current;
      const canvas = canvasRef.current;
      pending = Math.min(pending + now - last, 250);
      last = now;
      if (game && canvas) {
        while (pending >= STEP_MS) { game.step(); pending -= STEP_MS; }
        draw(canvas, game, kindRef.current);
        setScore(game.state.score);
        setPassed(game.state.passed);
        setStrokes(game.state.strokes);
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    // Keyboard play; these keys would otherwise scroll the page.
    const down = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, button, a, [contenteditable]")) return;
      if (!STROKE_KEYS.has(event.code)) return;
      event.preventDefault();
      if (!event.repeat) stroke();
    };
    window.addEventListener("keydown", down);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", down);
      void audioRef.current?.close();
    };
    // Set up once; the game and the kind are read through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The button lets go of the focus, so that Space swims rather than pressing it again.
  const choose = (next: Kind, button: HTMLButtonElement) => { setKind(next); save(KIND_KEY, next); button.blur(); };

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <div className={styles["hud"]}>
        <dl className={styles["score"]}>
          <div><dt>{t("score")}</dt><dd data-escape="score">{score.toLocaleString()}</dd></div>
          <div><dt>{t("passed")}</dt><dd>{passed.toLocaleString()}</dd></div>
          <div><dt>{t("best")}</dt><dd>{Math.max(best, score).toLocaleString()}</dd></div>
        </dl>
      </div>
      <canvas
        ref={canvasRef}
        className={styles["tank"]}
        role="img"
        aria-label={t("tankLabel")}
        data-escape="tank"
        data-state={phase}
        data-strokes={strokes}
        onPointerDown={event => { event.preventDefault(); stroke(); }}
      />
      <p className={styles["message"]} aria-live="polite" data-escape="message">{message}</p>
      {phase === "over" && (
        <>
          <button className="auth-link" type="button" onClick={newGame} data-escape="again">{t("again")}</button>
          <ShareButtons path={`/${locale}/goldfish-escape`} text={t("shareText", { score, passed })} />
        </>
      )}
      <div className={styles["kinds"]} role="radiogroup" aria-label={t("kindLabel")}>
        {KINDS.map(option => (
          <button key={option} type="button" role="radio" aria-checked={kind === option} disabled={phase === "playing"} onClick={event => choose(option, event.currentTarget)} data-escape-kind={option}>
            {t(`kinds.${option}`)}
          </button>
        ))}
      </div>
      <p className={controls.label}>{t("keys")}</p>
      <button className={styles["sound"]} type="button" aria-pressed={sound} onClick={() => setSound(on => !on)}>
        {sound ? t("soundOn") : t("soundOff")}
      </button>
    </ToolLayout>
  );
}
