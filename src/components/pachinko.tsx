import { useEffect, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import type MatterJS from "matter-js";
import ToolLayout from "./tool-layout";
import controls from "./tool-controls.module.css";
import styles from "./pachinko.module.css";
import { BOARD, STEP_MS, createGame, type Game, type GameEvent } from "../lib/pachinko";

// One ball every 30 steps (0.5 s) while firing, like holding a real handle.
const FIRE_EVERY = 30;
const BEST_KEY = "paibot.pachinko.best";

function readBest(): number {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}
function saveBest(value: number) {
  try { localStorage.setItem(BEST_KEY, String(value)); } catch { /* private mode etc. */ }
}

function tone(audio: AudioContext, frequency: number, duration: number, delay = 0, volume = 0.15) {
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  const at = audio.currentTime + delay;
  oscillator.type = "triangle";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, at);
  gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(at);
  oscillator.stop(at + duration);
}

function playSound(audio: AudioContext, event: GameEvent) {
  if (event.type === "pocket" && event.pocket === "chucker") tone(audio, 880, 0.12);
  if (event.type === "pocket" && event.pocket === "side") tone(audio, 660, 0.1, 0, 0.1);
  if (event.type === "pocket" && event.pocket === "attacker") tone(audio, 1320, 0.15, 0, 0.12);
  if (event.type === "result" && event.hit) [523, 659, 784, 1047].forEach((f, i) => tone(audio, f, 0.3, i * 0.12, 0.18));
}

function draw(canvas: HTMLCanvasElement, game: Game) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const css = getComputedStyle(canvas);
  const color = (name: string) => css.getPropertyValue(name).trim();
  const { state } = game;
  const scale = canvas.width / BOARD.width;
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.clearRect(0, 0, BOARD.width, BOARD.height);

  // Reels and pending lottery spins, drawn behind the balls.
  context.fillStyle = color("--surface-strong") || color("--line");
  context.beginPath();
  context.roundRect(174, 82, 132, 46, 8);
  context.fill();
  const hit = state.spinning === 0 && state.reels[0] === state.reels[1] && state.reels[1] === state.reels[2] && (state.open || state.spinHit);
  context.fillStyle = hit ? color("--success") : color("--text");
  context.font = "bold 32px ui-monospace, monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  state.reels.forEach((digit, i) => context.fillText(String(digit), 204 + i * 36, 106));
  for (let i = 0; i < 4; i++) {
    context.beginPath();
    context.arc(222 + i * 12, 140, 4, 0, Math.PI * 2);
    context.fillStyle = i < state.pending ? color("--accent") : color("--line");
    context.fill();
  }
  if (state.open) {
    context.fillStyle = color("--success");
    context.font = "bold 16px system-ui, sans-serif";
    context.fillText(`OPEN ${state.jackpotBalls}`, 240, 700);
  }

  for (const body of game.engine.world.bodies) {
    const part = game.partOf(body);
    const fill: Record<string, string> = {
      frame: color("--muted"), nail: color("--muted"), lid: color("--accent"),
      chucker: color("--accent"), side: color("--accent"), attacker: state.open ? color("--success") : color("--line"),
      ball: color("--accent-dark"),
    };
    if (body.isSensor && part === "frame") continue;
    context.beginPath();
    if (body.circleRadius) context.arc(body.position.x, body.position.y, body.circleRadius, 0, Math.PI * 2);
    else {
      body.vertices.forEach((v, i) => (i ? context.lineTo(v.x, v.y) : context.moveTo(v.x, v.y)));
      context.closePath();
    }
    context.fillStyle = fill[part];
    context.fill();
    if (part === "ball") {
      // A small highlight so balls read as metal.
      context.beginPath();
      context.arc(body.position.x - 2, body.position.y - 2, 2, 0, Math.PI * 2);
      context.fillStyle = color("--surface");
      context.fill();
    }
  }
}

export default function Pachinko() {
  const t = useTranslations("App.pachinko");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const matterRef = useRef<typeof MatterJS | null>(null);
  const gameRef = useRef<Game | null>(null);
  const frameRef = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);
  const firingRef = useRef(false);
  const powerRef = useRef(0.5);
  const soundRef = useRef(true);
  const [ready, setReady] = useState(false);
  const [firing, setFiring] = useState(false);
  const [power, setPower] = useState(50);
  const [balls, setBalls] = useState(0);
  const [best, setBest] = useState(0);
  const [status, setStatus] = useState("");
  const [over, setOver] = useState(false);
  const [sound, setSound] = useState(true);
  firingRef.current = firing;
  powerRef.current = power / 100;
  soundRef.current = sound;

  const newGame = () => {
    const Matter = matterRef.current;
    if (!Matter) return;
    const game = createGame(Matter);
    game.onEvent(event => {
      if (soundRef.current && audioRef.current) playSound(audioRef.current, event);
      if (event.type === "result" && event.hit) setStatus(t("jackpot"));
      if (event.type === "jackpotEnd") setStatus(t("jackpotEnd"));
    });
    gameRef.current = game;
    setBalls(game.state.balls);
    setFiring(false);
    setOver(false);
    setStatus("");
  };

  useEffect(() => {
    let cancelled = false;
    setBest(readBest());
    // Loaded only on this page, and only in the browser.
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
            if (firingRef.current && game.state.steps % FIRE_EVERY === 0 && !game.launch(powerRef.current)) setFiring(false);
            game.step();
            pending -= STEP_MS;
          }
          draw(canvas, game);
          setBalls(game.state.balls);
          setBest(previous => {
            if (game.state.balls <= previous) return previous;
            saveBest(game.state.balls);
            return game.state.balls;
          });
          if (game.over()) setOver(true);
        }
        frameRef.current = requestAnimationFrame(loop);
      };
      frameRef.current = requestAnimationFrame(loop);
    });
    const canvas = canvasRef.current;
    const resize = () => {
      if (!canvas) return;
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.width * BOARD.height / BOARD.width;
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (canvas) observer.observe(canvas);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frameRef.current);
      observer.disconnect();
      void audioRef.current?.close();
    };
  }, []);

  const toggleFiring = () => {
    audioRef.current ??= new AudioContext();
    setFiring(on => !on);
  };

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <dl className={styles["score"]}>
        <div><dt>{t("balls")}</dt><dd data-pachinko="balls">{balls}</dd></div>
        <div><dt>{t("best")}</dt><dd>{best}</dd></div>
      </dl>
      <canvas ref={canvasRef} className={styles["board"]} role="img" aria-label={t("boardLabel")} />
      <p className={styles["status"]} aria-live="polite">{over ? t("over") : status}</p>
      <div className={styles["controls"]}>
        <label className={styles["power"]}>
          <span>{t("power")}</span>
          <input type="range" min={0} max={100} value={power} onChange={event => setPower(Number(event.target.value))} />
        </label>
        <div className={styles["buttons"]}>
          {over
            ? <button className="auth-link" type="button" onClick={newGame}>{t("restart")}</button>
            : <button className="auth-link" type="button" onClick={toggleFiring} disabled={!ready} aria-pressed={firing}>{firing ? t("stop") : t("fire")}</button>}
          {!over && <button className={styles["secondary"]} type="button" onClick={newGame} disabled={!ready}>{t("restart")}</button>}
          <button className={styles["secondary"]} type="button" aria-pressed={sound} onClick={() => setSound(on => !on)}>
            {sound ? t("soundOn") : t("soundOff")}
          </button>
        </div>
      </div>
      <p className={controls.label}>{t("note")}</p>
    </ToolLayout>
  );
}
