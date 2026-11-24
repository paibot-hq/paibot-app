import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useLocale, useTranslations } from "use-intl";
import type MatterJS from "matter-js";
import ShareButtons from "../../components/share-buttons";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import styles from "./fruit-merge.module.css";
import { BOX, DROP_Y, FRUITS, LAST, STEP_MS, createFruitMerge, type FruitEvent, type FruitMerge } from "./engine";

const BEST_KEY = "paibot.fruit-merge.best";
const LEFT_KEYS = new Set(["ArrowLeft", "KeyA"]);
const RIGHT_KEYS = new Set(["ArrowRight", "KeyD"]);
const DROP_KEYS = new Set(["Space", "ArrowDown", "Enter"]);
// How far the aim moves per step while an arrow key is held.
const KEY_SPEED = 5;

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

function playSound(audio: AudioContext, event: FruitEvent) {
  if (event.type === "drop") tone(audio, 220, 0.08, "triangle", 0.08);
  // Each bigger fruit sounds a step higher on a pentatonic scale.
  if (event.type === "merge") {
    const scale = [0, 2, 4, 7, 9];
    const semitones = scale[event.kind % 5] + 12 * Math.floor(event.kind / 5);
    tone(audio, 392 * 2 ** (semitones / 12), 0.14, "triangle", 0.12);
  }
  if (event.type === "vanish") [523, 659, 784, 1047, 1319].forEach((f, i) => tone(audio, f, 0.22, "triangle", 0.12, i * 0.08));
  if (event.type === "gameOver") [392, 330, 262, 196].forEach((f, i) => tone(audio, f, 0.3, "triangle", 0.1, i * 0.16));
}

// One fruit, centred on the origin of a context already moved and turned.
function drawFruit(context: CanvasRenderingContext2D, kind: number, r: number) {
  const { key, color } = FRUITS[kind];
  context.beginPath();
  context.arc(0, 0, r, 0, Math.PI * 2);
  context.fillStyle = color;
  context.fill();

  context.save();
  context.clip();
  if (key === "watermelon") {
    context.strokeStyle = "#14532d";
    context.lineWidth = r * 0.16;
    for (const x of [-0.62, -0.2, 0.2, 0.62]) {
      context.beginPath();
      context.moveTo(x * r, -r);
      context.bezierCurveTo((x + 0.12) * r, -r / 3, (x - 0.12) * r, r / 3, x * r, r);
      context.stroke();
    }
  }
  if (key === "melon") {
    context.strokeStyle = "rgba(255, 255, 255, 0.55)";
    context.lineWidth = 1.5;
    for (let i = -3; i <= 3; i++) {
      context.beginPath();
      context.moveTo(i * r * 0.32 - r, -r);
      context.lineTo(i * r * 0.32 + r, r);
      context.moveTo(i * r * 0.32 + r, -r);
      context.lineTo(i * r * 0.32 - r, r);
      context.stroke();
    }
  }
  if (key === "pineapple") {
    context.strokeStyle = "rgba(120, 72, 0, 0.55)";
    context.lineWidth = 2;
    for (let i = -3; i <= 3; i++) {
      context.beginPath();
      context.moveTo(i * r * 0.4 - r, -r);
      context.lineTo(i * r * 0.4 + r, r);
      context.moveTo(i * r * 0.4 + r, -r);
      context.lineTo(i * r * 0.4 - r, r);
      context.stroke();
    }
  }
  if (key === "strawberry") {
    context.fillStyle = "#ffe08a";
    for (const [x, y] of [[-0.4, -0.1], [0.1, -0.3], [0.45, 0.05], [-0.1, 0.3], [0.3, 0.5], [-0.45, 0.4]]) {
      context.beginPath();
      context.ellipse(x * r, y * r, r * 0.07, r * 0.1, 0, 0, Math.PI * 2);
      context.fill();
    }
  }
  if (key === "peach") {
    context.strokeStyle = "rgba(200, 70, 70, 0.4)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(0, -r);
    context.quadraticCurveTo(r * 0.3, 0, 0, r * 0.6);
    context.stroke();
  }
  context.restore();

  // Leaves and stems on top.
  const leaf = (x: number, y: number, angle: number, size: number) => {
    context.beginPath();
    context.ellipse(x, y, size, size * 0.45, angle, 0, Math.PI * 2);
    context.fillStyle = "#3f9b3a";
    context.fill();
  };
  if (key === "cherry" || key === "apple" || key === "pear") {
    context.strokeStyle = "#7a4a22";
    context.lineWidth = Math.max(1.5, r * 0.09);
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(0, -r * 0.85);
    context.quadraticCurveTo(r * 0.1, -r * 1.15, r * 0.3, -r * 1.3);
    context.stroke();
    leaf(r * 0.38, -r * 1.05, -0.5, r * 0.3);
  }
  if (key === "strawberry") for (const angle of [-0.9, -0.3, 0.3, 0.9]) leaf(Math.sin(angle) * r * 0.35, -r * 0.9, angle * 1.4, r * 0.32);
  if (key === "persimmon" || key === "dekopon") for (const angle of [0, Math.PI / 2]) leaf(0, -r * 0.9, angle, r * 0.3);
  if (key === "pineapple") for (const angle of [-0.5, 0, 0.5]) leaf(Math.sin(angle) * r * 0.5, -r * 1.05, Math.PI / 2 + angle, r * 0.4);

  // A shine, and a soft rim so touching fruits stay apart.
  context.beginPath();
  context.ellipse(-r * 0.38, -r * 0.38, r * 0.24, r * 0.15, -Math.PI / 4, 0, Math.PI * 2);
  context.fillStyle = "rgba(255, 255, 255, 0.45)";
  context.fill();
  context.beginPath();
  context.arc(0, 0, r - 0.75, 0, Math.PI * 2);
  context.strokeStyle = "rgba(0, 0, 0, 0.18)";
  context.lineWidth = 1.5;
  context.stroke();
}

function fit(canvas: HTMLCanvasElement, width: number, height: number) {
  const context = canvas.getContext("2d");
  if (!context) return null;
  const ratio = window.devicePixelRatio || 1;
  const w = Math.round(canvas.clientWidth * ratio);
  if (canvas.width !== w) {
    canvas.width = w;
    canvas.height = Math.round(w * height / width);
  }
  const scale = canvas.width / width;
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.clearRect(0, 0, width, height);
  return context;
}

function draw(canvas: HTMLCanvasElement, game: FruitMerge) {
  const context = fit(canvas, BOX.width, BOX.height);
  if (!context) return;
  const css = getComputedStyle(canvas);
  const color = (name: string, fallback = "") => css.getPropertyValue(name).trim() || fallback;
  const { state } = game;

  // The line: dashed, red while a fruit is above it.
  context.setLineDash([8, 6]);
  context.lineWidth = 2;
  context.strokeStyle = state.danger || state.over ? color("--error", "#d93025") : color("--line");
  context.beginPath();
  context.moveTo(0, BOX.line);
  context.lineTo(BOX.width, BOX.line);
  context.stroke();

  // The fruit in hand and a guide down from it.
  if (game.ready()) {
    const r = FRUITS[state.current].radius;
    context.strokeStyle = color("--muted");
    context.globalAlpha = 0.5;
    context.setLineDash([2, 6]);
    context.beginPath();
    context.moveTo(state.aim, DROP_Y + r);
    context.lineTo(state.aim, BOX.height);
    context.stroke();
    context.globalAlpha = 1;
    context.save();
    context.translate(state.aim, DROP_Y);
    drawFruit(context, state.current, r);
    context.restore();
  }
  context.setLineDash([]);

  for (const fruit of game.fruits()) {
    context.save();
    context.translate(fruit.body.position.x, fruit.body.position.y);
    context.rotate(fruit.body.angle);
    drawFruit(context, fruit.kind, game.radiusOf(fruit));
    context.restore();
  }
}

// The next fruit, at the size it will have in the box (up to the persimmon).
function drawNext(canvas: HTMLCanvasElement, kind: number) {
  const size = 80;
  const context = fit(canvas, size, size);
  if (!context) return;
  context.translate(size / 2, size / 2 + 4);
  drawFruit(context, kind, FRUITS[kind].radius);
}

// All eleven kinds in a row, the ones made so far in full colour.
function drawChain(canvas: HTMLCanvasElement, maxKind: number) {
  const width = 400, height = 44;
  const context = fit(canvas, width, height);
  if (!context) return;
  const step = width / FRUITS.length;
  FRUITS.forEach((_, kind) => {
    context.save();
    context.globalAlpha = kind <= maxKind ? 1 : 0.25;
    context.translate(step * (kind + 0.5), height / 2 + 3);
    drawFruit(context, kind, 6 + kind * 1.15);
    context.restore();
  });
}

export default function FruitMergeGame() {
  const t = useTranslations("App.fruitMerge");
  const locale = useLocale();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextRef = useRef<HTMLCanvasElement>(null);
  const chainRef = useRef<HTMLCanvasElement>(null);
  const matterRef = useRef<typeof MatterJS | null>(null);
  const gameRef = useRef<FruitMerge | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const soundRef = useRef(true);
  const keysRef = useRef({ left: false, right: false });
  const [ready, setReady] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [next, setNext] = useState(0);
  const [maxKind, setMaxKind] = useState(0);
  const [drops, setDrops] = useState(0);
  const [over, setOver] = useState(false);
  const [message, setMessage] = useState("");
  const [sound, setSound] = useState(true);
  soundRef.current = sound;
  const fruitName = (kind: number) => t(`fruits.${FRUITS[kind].key}`);

  const newGame = () => {
    const Matter = matterRef.current;
    if (!Matter) return;
    const game = createFruitMerge(Matter);
    game.onEvent(event => {
      if (soundRef.current && audioRef.current) playSound(audioRef.current, event);
      // Only the big ones are worth a word.
      if (event.type === "merge" && event.kind >= 6) setMessage(t("made", { fruit: fruitName(event.kind) }));
      if (event.type === "vanish") setMessage(t("vanished"));
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
    setDrops(0);
    setOver(false);
    setMessage("");
  };

  const unlockAudio = () => { audioRef.current ??= new AudioContext(); };
  const drop = () => { unlockAudio(); gameRef.current?.drop(); };

  useEffect(() => {
    if (import.meta.env.SSR) return;
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
            const { left, right } = keysRef.current;
            if (left !== right) game.setAim(game.state.aim + (right ? KEY_SPEED : -KEY_SPEED));
            game.step();
            pending -= STEP_MS;
          }
          draw(canvas, game);
          if (nextRef.current) drawNext(nextRef.current, game.state.next);
          if (chainRef.current) drawChain(chainRef.current, game.state.maxKind);
          setScore(game.state.score);
          setNext(game.state.next);
          setMaxKind(game.state.maxKind);
          setDrops(game.state.drops);
        }
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);
    });

    // Keyboard play; these keys would otherwise scroll the page.
    const key = (pressed: boolean) => (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, button, a, [contenteditable]")) return;
      if (LEFT_KEYS.has(event.code)) keysRef.current.left = pressed;
      else if (RIGHT_KEYS.has(event.code)) keysRef.current.right = pressed;
      else if (DROP_KEYS.has(event.code)) { if (pressed && !event.repeat) drop(); }
      else return;
      event.preventDefault();
    };
    const down = key(true), up = key(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      void audioRef.current?.close();
    };
  }, []);

  // Mouse or finger: the fruit follows across the box and drops on release.
  const aimAt = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    gameRef.current?.setAim((event.clientX - rect.left) / rect.width * BOX.width);
  };

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <div className={styles["hud"]}>
        <dl className={styles["score"]}>
          <div><dt>{t("score")}</dt><dd data-fruit="score">{score.toLocaleString()}</dd></div>
          <div><dt>{t("best")}</dt><dd>{Math.max(best, score).toLocaleString()}</dd></div>
        </dl>
        <figure className={styles["next"]}>
          <canvas ref={nextRef} role="img" aria-label={fruitName(next)} data-fruit="next" />
          <figcaption>{t("next")}</figcaption>
        </figure>
      </div>
      <canvas
        ref={canvasRef}
        className={styles["box"]}
        role="img"
        aria-label={t("boxLabel")}
        data-fruit="box"
        data-drops={drops}
        onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); unlockAudio(); aimAt(event); }}
        onPointerMove={aimAt}
        onPointerUp={event => { aimAt(event); drop(); }}
      />
      <canvas ref={chainRef} className={styles["chain"]} role="img" aria-label={t("chainLabel", { fruit: fruitName(maxKind), count: maxKind + 1, total: LAST + 1 })} />
      <p className={styles["message"]} aria-live="polite" data-fruit="message">{message}</p>
      {over && (
        <>
          <button className="auth-link" type="button" onClick={newGame} data-fruit="again">{t("again")}</button>
          <ShareButtons path={`/${locale}/fruit-merge`} text={t("shareText", { score, fruit: fruitName(maxKind) })} />
        </>
      )}
      <p className={controls.label}>{t("keys")}</p>
      <button className={styles["sound"]} type="button" aria-pressed={sound} disabled={!ready} onClick={() => setSound(on => !on)}>
        {sound ? t("soundOn") : t("soundOff")}
      </button>
    </ToolLayout>
  );
}
