import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import styles from "./koma.module.css";
import type { Scene3D } from "./render3d";
import { DISH, START_SPIN, STEP, createKoma, type Koma, type Level, type Result, type Top } from "./engine";
import ShapeEditor from "./shape-editor";
import { PRESETS, PRESET_NAMES, parseProfile, type PresetName, type Profile } from "./shape";

const BEST_KEY = "paibot.koma.best";
const SHAPE_KEY = "paibot.koma.shape";
const LEVELS: Level[] = ["easy", "normal", "hard"];
// The shapes the computer may bring: the weakest of them when it is easy, the strongest when it is hard (see the matrix in engine.test.mjs).
const OPPONENTS: Record<Level, PresetName[]> = { easy: ["sharp", "standard"], normal: PRESET_NAMES, hard: ["heavy", "flat", "standard"] };
const KEYS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0],
  ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1],
};
const DASH_KEYS = new Set(["Space", "ShiftLeft", "ShiftRight"]);
// Dragging this far from your top (in dish units) steers at full strength.
const FULL_DRAG = 36;
const VIEW = DISH + 8;

function readBest(): number {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}
function saveBest(value: number) {
  try { localStorage.setItem(BEST_KEY, String(value)); } catch { /* storage unavailable */ }
}

function readShape(): Profile | null {
  try { return parseProfile(JSON.parse(localStorage.getItem(SHAPE_KEY) ?? "null")); } catch { return null; }
}
function saveShape(profile: Profile) {
  try { localStorage.setItem(SHAPE_KEY, JSON.stringify(profile.map(value => Math.round(value * 100) / 100))); } catch { /* storage unavailable */ }
}

function drawTop(context: CanvasRenderingContext2D, top: Top, body: string, mark: string) {
  const wobble = top.spin < 30 ? (1 - top.spin / 30) * 3 : 0;
  const x = top.x + Math.cos(top.angle * 0.7) * wobble;
  const y = top.y + Math.sin(top.angle * 0.9) * wobble;
  const radius = top.spec.radius;
  context.save();
  context.globalAlpha = top.out ? 0.3 : 1;
  context.translate(x, y);
  context.fillStyle = body;
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.fill();
  // Alternating wedges turn with the top, so its spin can be seen.
  context.fillStyle = mark;
  for (let i = 0; i < 4; i++) {
    context.beginPath();
    context.moveTo(0, 0);
    context.arc(0, 0, radius * 0.8, top.angle + i * Math.PI / 2, top.angle + i * Math.PI / 2 + Math.PI / 4);
    context.closePath();
    context.fill();
  }
  context.beginPath();
  context.arc(0, 0, radius * 0.18, 0, Math.PI * 2);
  context.fillStyle = body;
  context.fill();
  context.restore();
}

function draw(canvas: HTMLCanvasElement, game: Koma) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const css = getComputedStyle(canvas);
  const color = (name: string) => css.getPropertyValue(name).trim();
  const scale = canvas.width / (VIEW * 2);
  context.setTransform(scale, 0, 0, scale, canvas.width / 2, canvas.height / 2);
  context.clearRect(-VIEW, -VIEW, VIEW * 2, VIEW * 2);
  context.beginPath();
  context.arc(0, 0, DISH, 0, Math.PI * 2);
  context.fillStyle = color("--surface-strong");
  context.fill();
  context.lineWidth = 3;
  context.strokeStyle = color("--line");
  context.stroke();
  context.lineWidth = 1;
  for (const r of [DISH * 0.66, DISH * 0.33]) {
    context.beginPath();
    context.arc(0, 0, r, 0, Math.PI * 2);
    context.stroke();
  }
  const [player, computer] = game.tops;
  drawTop(context, computer, color("--error"), color("--surface-strong"));
  drawTop(context, player, color("--accent"), color("--surface-strong"));
}

export default function KomaGame() {
  const t = useTranslations("App.koma");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Koma | null>(null);
  const phaseRef = useRef<"ready" | "playing" | "over">("ready");
  const keysRef = useRef(new Set<string>());
  // The 3D view loads on demand: "pending" until then, "flat" when WebGL is not there.
  const sceneRef = useRef<Scene3D | null>(null);
  const modeRef = useRef<"pending" | "3d" | "flat">("pending");
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const levelRef = useRef<Level>("normal");
  const profileRef = useRef<Profile>(PRESETS.standard);
  const opponentRef = useRef<PresetName>("standard");
  const shapesRef = useRef<[Profile, Profile]>([PRESETS.standard, PRESETS.standard]);
  const streakRef = useRef(0);
  const bestRef = useRef(0);
  const [level, setLevel] = useState<Level>("normal");
  const [phase, setPhase] = useState<"ready" | "playing" | "over">("ready");
  const [spins, setSpins] = useState<[number, number]>([START_SPIN, START_SPIN]);
  const [cooldown, setCooldown] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [profile, setProfile] = useState<Profile>(PRESETS.standard);
  const [opponent, setOpponent] = useState<PresetName>("standard");

  useEffect(() => {
    bestRef.current = readBest();
    setBest(bestRef.current);
    const saved = readShape();
    if (saved) { profileRef.current = saved; setProfile(saved); newGame(levelRef.current, true); }
  }, []);

  const setPhaseBoth = (next: "ready" | "playing" | "over") => { phaseRef.current = next; setPhase(next); };

  // The computer plays a different one of the preset shapes each match; editing your own top keeps the one you were going to face.
  const newGame = (nextLevel: Level, keepOpponent = false) => {
    if (!keepOpponent) {
      const pool = OPPONENTS[nextLevel];
      opponentRef.current = pool[Math.floor(Math.random() * pool.length)]!;
      setOpponent(opponentRef.current);
    }
    shapesRef.current = [profileRef.current, PRESETS[opponentRef.current]];
    gameRef.current = createKoma(nextLevel, Math.random, shapesRef.current);
    sceneRef.current?.setShapes(shapesRef.current);
    setSpins([START_SPIN, START_SPIN]);
    setCooldown(0);
    setResult(null);
    setPhaseBoth("ready");
  };

  useEffect(() => { levelRef.current = level; newGame(level); }, [level]);

  const finish = (outcome: Result) => {
    setResult(outcome);
    setPhaseBoth("over");
    if (outcome.winner === 0) {
      streakRef.current += 1;
      if (streakRef.current > bestRef.current) { bestRef.current = streakRef.current; saveBest(bestRef.current); setBest(bestRef.current); }
    } else if (outcome.winner === 1) streakRef.current = 0;
    setStreak(streakRef.current);
  };

  const start = () => {
    if (phaseRef.current === "playing") return;
    if (phaseRef.current === "over") newGame(levelRef.current);
    setPhaseBoth("playing");
  };

  const dash = () => { if (phaseRef.current === "playing") gameRef.current?.dash(0); };

  const updateSteer = () => {
    const game = gameRef.current;
    if (!game) return;
    let x = 0, y = 0;
    for (const code of keysRef.current) { const v = KEYS[code]; if (v) { x += v[0]; y += v[1]; } }
    const pointer = pointerRef.current;
    if (pointer && x === 0 && y === 0) {
      const me = game.tops[0];
      x = (pointer.x - me.x) / FULL_DRAG;
      y = (pointer.y - me.y) / FULL_DRAG;
      const length = Math.hypot(x, y);
      if (length < 0.15) { x = 0; y = 0; } else if (length > 1) { x /= length; y /= length; }
    }
    game.steer(x, y);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    let frame = 0;
    let last = performance.now();
    let pending = 0;
    const loop = (now: number) => {
      const game = gameRef.current;
      pending = Math.min(pending + (now - last) / 1000, 0.25);
      last = now;
      if (game && canvas) {
        if (phaseRef.current === "playing") {
          updateSteer();
          while (pending >= STEP && phaseRef.current === "playing") {
            for (const event of game.step()) {
              if (event.type === "end") finish(event.result);
              else if (event.type === "hit") sceneRef.current?.hit(game, event.speed);
            }
            pending -= STEP;
          }
          setSpins([game.tops[0].spin, game.tops[1].spin]);
          setCooldown(game.tops[0].dashCooldown);
        } else pending = 0;
        if (modeRef.current === "3d") sceneRef.current?.render(game);
        else if (modeRef.current === "flat") draw(canvas, game);
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    const resize = () => {
      if (!canvas) return;
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.width;
      sceneRef.current?.resize(canvas.width, canvas.height);
    };
    let cancelled = false;
    if (canvas) {
      import("./render3d").then(({ createScene }) => {
        if (cancelled) return;
        try {
          sceneRef.current = createScene(canvas);
          sceneRef.current.setShapes(shapesRef.current);
          modeRef.current = "3d";
          canvas.dataset["mode"] = "3d";
          resize();
        } catch {
          modeRef.current = "flat";
        }
      }, () => { modeRef.current = "flat"; });
    }
    resize();
    const observer = new ResizeObserver(resize);
    if (canvas) observer.observe(canvas);

    // These keys would otherwise scroll the page.
    const key = (pressed: boolean) => (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, button, [contenteditable]")) return;
      if (KEYS[event.code]) {
        if (pressed) keysRef.current.add(event.code); else keysRef.current.delete(event.code);
      } else if (DASH_KEYS.has(event.code)) {
        if (pressed && !event.repeat) { if (phaseRef.current === "playing") dash(); else start(); }
      } else return;
      event.preventDefault();
    };
    const down = key(true), up = key(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      cancelled = true;
      sceneRef.current?.dispose();
      sceneRef.current = null;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Steer toward the finger or pointer while it is down on the dish.
  const aim = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const scene = sceneRef.current;
    if (scene) {
      const point = scene.pick(event.clientX, event.clientY);
      if (point) pointerRef.current = point;
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    pointerRef.current = {
      x: ((event.clientX - rect.left) / rect.width - 0.5) * VIEW * 2,
      y: ((event.clientY - rect.top) / rect.height - 0.5) * VIEW * 2,
    };
  };
  const release = () => { pointerRef.current = null; gameRef.current?.steer(0, 0); };

  const editShape = (next: Profile) => {
    profileRef.current = next;
    setProfile(next);
    saveShape(next);
    if (phaseRef.current !== "playing") newGame(levelRef.current, true);
  };

  const message = result
    ? result.winner === "draw" ? t("draw")
      : t(`${result.winner === 0 ? "won" : "lost"}${result.reason === "fell" ? "Fell" : "Stopped"}`)
    : phase === "ready" ? t("howTo") : "";

  const bar = (value: number, side: "you" | "cpu") => (
    <div className={styles["spin"]} data-koma={`${side}-spin`} data-side={side}>
      <span>{t(side)}</span>
      <span className={styles["track"]}><span className={styles["fill"]} data-fill style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></span>
    </div>
  );

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <div className={controls.mode} role="group" aria-label={t("level")}>
        {LEVELS.map(option => (
          <button key={option} type="button" aria-pressed={level === option} disabled={phase === "playing"} onClick={() => setLevel(option)}>{t(option)}</button>
        ))}
      </div>
      <dl className={styles["score"]}>
        <div><dt>{t("streak")}</dt><dd data-koma="streak">{streak}</dd></div>
        <div><dt>{t("best")}</dt><dd>{best}</dd></div>
      </dl>
      <div className={styles["spins"]}>
        {bar(spins[0], "you")}
        {bar(spins[1], "cpu")}
        <p className={controls.label} data-koma="opponent">{t("opponent", { shape: t(`presets.${opponent}`) })}</p>
      </div>
      <canvas
        ref={canvasRef}
        className={styles["dish"]}
        data-koma="dish"
        role="img"
        aria-label={t("canvasLabel")}
        onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); aim(event); }}
        onPointerMove={event => { if (pointerRef.current) aim(event); }}
        onPointerUp={release}
        onPointerCancel={release}
      />
      <p className={styles["message"]} data-koma="message" aria-live="polite">{message}</p>
      {phase === "playing" ? (
        <button type="button" className={styles["dash"]} onClick={dash} disabled={cooldown > 0}>
          <span>{t("dash")}</span>
          <span className={styles["meter"]} style={{ width: `${Math.round((1 - cooldown / 1.1) * 100)}%` }} />
        </button>
      ) : (
        <button className="auth-link" type="button" data-koma="start" onClick={start}>{phase === "over" ? t("again") : t("start")}</button>
      )}
      <p className={controls.label}>{t("keys")}</p>
      <ShapeEditor profile={profile} disabled={phase === "playing"} onChange={editShape} />
    </ToolLayout>
  );
}
