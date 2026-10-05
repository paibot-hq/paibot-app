"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import styles from "./kaleidoscope-view.module.css";
import { COLOR_MODES, autoPoint, copies, hueFor, lightnessFor, saturationFor, type ColorMode, type Point } from "./kaleidoscope";
import { createWorld, spawn, step, type Ball, type Options, type World } from "./balls";

const BACKGROUND = "#0b1020";
const SIZE = 640;
// The circle the balls fly in (the canvas is clipped to a circle too), and how many may be there at once.
const ARENA: Options = { cx: SIZE / 2, cy: SIZE / 2, radius: SIZE / 2 - 2, maxBalls: 48, minRadius: 5, split: true };
const START_BALLS = 2;
type Flash = { x: number; y: number; hue: number; age: number };

type Settings = { segments: number; mirror: boolean; size: number; color: ColorMode; fade: boolean; balls: boolean; split: boolean };
const DEFAULTS: Settings = { segments: 8, mirror: true, size: 6, color: "rainbow", fade: false, balls: false, split: true };

export default function Kaleidoscope() {
  const t = useTranslations("App.kaleidoscope");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<World>(createWorld());
  const lastPlaces = useRef(new WeakMap<Ball, Point>());
  const flashes = useRef<Flash[]>([]);
  const [count, setCount] = useState(0);
  const settingsRef = useRef<Settings>(DEFAULTS);
  const lastRef = useRef<Point | null>(null);
  const travelled = useRef(0);
  const autoRef = useRef(false);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [auto, setAuto] = useState(false);
  settingsRef.current = settings;
  autoRef.current = auto;
  const change = (patch: Partial<Settings>) => setSettings(current => ({ ...current, ...patch }));

  const context = () => canvasRef.current?.getContext("2d") ?? null;

  function clear() {
    const ctx = context();
    if (!ctx) return;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, SIZE, SIZE);
  }

  // A stroke from the last point to this one, drawn once for every copy round the centre.
  function stroke(from: Point, to: Point, look?: { hue: number; width: number }) {
    const ctx = context();
    if (!ctx) return;
    const now = settingsRef.current;
    travelled.current += Math.hypot(to.x - from.x, to.y - from.y);
    const centre = { x: SIZE / 2, y: SIZE / 2 };
    const a = copies(from, centre, now.segments, now.mirror);
    const b = copies(to, centre, now.segments, now.mirror);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = look?.width ?? now.size;
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = look ? `hsla(${look.hue}, 90%, 58%, 0.4)` : `hsla(${hueFor(now.color, travelled.current)}, ${saturationFor(now.color)}%, ${lightnessFor(now.color)}%, 0.85)`;
    ctx.beginPath();
    for (let i = 0; i < a.length; i++) { ctx.moveTo(a[i].x, a[i].y); ctx.lineTo(b[i].x, b[i].y); }
    ctx.stroke();
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = SIZE;
    canvas.height = SIZE;
    clear();
    let frame = 0;
    let began = performance.now();
    let previous: Point | null = null;
    let before = performance.now();
    let wasBalls = false;
    const overlay = overlayRef.current;
    if (overlay) { overlay.width = SIZE; overlay.height = SIZE; }
    const loop = (now: number) => {
      const dt = (now - before) / 1000;
      before = now;
      const on = settingsRef.current.balls;
      if (on && !wasBalls) {
        worldRef.current = createWorld();
        for (let i = 0; i < START_BALLS; i++) worldRef.current.balls.push(spawn(ARENA, Math.random));
      }
      if (!on && wasBalls) { worldRef.current = createWorld(); flashes.current = []; setCount(0); }
      wasBalls = on;
      if (on) flyBalls(dt);
      else drawOverlay(false);
      const ctx = canvas.getContext("2d");
      if (ctx && (settingsRef.current.fade || settingsRef.current.balls)) {
        // Everything slowly melts into the background, so the pattern keeps changing (and the balls' many strokes never add up to white).
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "rgba(11, 16, 32, 0.045)";
        ctx.fillRect(0, 0, SIZE, SIZE);
      }
      if (autoRef.current) {
        const point = autoPoint((now - began) / 1000, SIZE);
        if (previous) stroke(previous, point);
        previous = point;
      } else {
        previous = null;
        began = now - (travelled.current / 60) * 1000;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
    // The loop reads everything through refs and `stroke`/`clear` only touch refs and the canvas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The balls leave a stroke behind them, copied round the centre like any other; they are drawn on the layer above.
  function flyBalls(dt: number) {
    const world = worldRef.current;
    const options = { ...ARENA, split: settingsRef.current.split };
    const places = lastPlaces.current;
    for (const ball of world.balls) places.set(ball, { x: ball.x, y: ball.y });
    for (const found of step(world, dt, options, Math.random)) flashes.current.push({ ...found, age: 0 });
    for (const ball of world.balls) {
      const from = places.get(ball) ?? { x: ball.x, y: ball.y };
      stroke(from, { x: ball.x, y: ball.y }, { hue: ball.hue, width: Math.max(1.5, ball.r * 0.22) });
    }
    drawOverlay(true, dt);
    setCount(current => (current === world.balls.length ? current : world.balls.length));
  }

  function drawOverlay(show: boolean, dt = 0) {
    const ctx = overlayRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    if (!show) return;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
    ctx.beginPath();
    ctx.arc(ARENA.cx, ARENA.cy, ARENA.radius, 0, Math.PI * 2);
    ctx.stroke();
    for (const ball of worldRef.current.balls) {
      const glow = ctx.createRadialGradient(ball.x - ball.r * 0.3, ball.y - ball.r * 0.3, ball.r * 0.1, ball.x, ball.y, ball.r);
      glow.addColorStop(0, `hsl(${ball.hue}, 95%, 82%)`);
      glow.addColorStop(1, `hsl(${ball.hue}, 85%, 50%)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();
    }
    // A ring spreads from where balls split and fades.
    flashes.current = flashes.current.filter(flash => (flash.age += dt) < 0.45);
    for (const flash of flashes.current) {
      ctx.strokeStyle = `hsla(${flash.hue}, 95%, 75%, ${1 - flash.age / 0.45})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(flash.x, flash.y, 8 + flash.age * 90, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function addBall() {
    const world = worldRef.current;
    if (world.balls.length < ARENA.maxBalls) world.balls.push(spawn(ARENA, Math.random));
  }

  const at = (event: ReactPointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * SIZE, y: ((event.clientY - rect.top) / rect.height) * SIZE };
  };

  function down(event: ReactPointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = at(event);
    lastRef.current = point;
    stroke(point, point);
  }
  function move(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!lastRef.current) return;
    const point = at(event);
    stroke(lastRef.current, point);
    lastRef.current = point;
  }
  function up() { lastRef.current = null; }

  function save() {
    canvasRef.current?.toBlob(blob => {
      if (!blob) return;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "kaleidoscope.png";
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    });
  }

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <div className={styles.stage}>
        <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label={t("canvasLabel")} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
        <canvas ref={overlayRef} className={styles.overlay} aria-hidden="true" />
      </div>
      {settings.balls && <p className={styles.count} role="status" data-kaleidoscope="count">{t("count", { count, splits: worldRef.current.splits })}</p>}
      <div className={styles.buttons}>
        <button className="auth-link" type="button" aria-pressed={auto} onClick={() => setAuto(on => !on)} data-kaleidoscope="auto">{auto ? t("autoOn") : t("autoOff")}</button>
        <button className="auth-link" type="button" aria-pressed={settings.balls} onClick={() => change({ balls: !settings.balls })} data-kaleidoscope="balls">{settings.balls ? t("ballsOn") : t("ballsOff")}</button>
        {settings.balls && <button className={styles.button} type="button" onClick={addBall} data-kaleidoscope="add">{t("addBall")}</button>}
        <button className={styles.button} type="button" onClick={clear} data-kaleidoscope="clear">{t("clear")}</button>
        <button className={styles.button} type="button" onClick={save}>{t("save")}</button>
      </div>
      <div className={styles.panel}>
        <label className={styles.row}>
          <span className={styles.name}>{t("segments")}</span>
          <input type="range" min={3} max={24} step={1} value={settings.segments} onChange={event => change({ segments: Number(event.target.value) })} />
          <span className={styles.value}>{settings.segments}</span>
        </label>
        <label className={styles.row}>
          <span className={styles.name}>{t("size")}</span>
          <input type="range" min={1} max={24} step={1} value={settings.size} onChange={event => change({ size: Number(event.target.value) })} />
          <span className={styles.value}>{settings.size}</span>
        </label>
        <div className={styles.row} role="group" aria-label={t("color")}>
          <span className={styles.name}>{t("color")}</span>
          <span className={styles.group}>
            {COLOR_MODES.map(mode => <button key={mode} type="button" className={styles.choice} aria-pressed={settings.color === mode} onClick={() => change({ color: mode })}>{t(`colors.${mode}`)}</button>)}
          </span>
        </div>
        <div className={styles.row}>
          <span className={styles.name}>{t("options")}</span>
          <span className={styles.group}>
            <button type="button" className={styles.choice} aria-pressed={settings.mirror} onClick={() => change({ mirror: !settings.mirror })}>{t("mirror")}</button>
            <button type="button" className={styles.choice} aria-pressed={settings.fade} onClick={() => change({ fade: !settings.fade })}>{t("fade")}</button>
            <button type="button" className={styles.choice} aria-pressed={settings.split} onClick={() => change({ split: !settings.split })}>{t("split")}</button>
          </span>
        </div>
      </div>
      <p className={controls.label}>{t("hint")}</p>
    </ToolLayout>
  );
}
