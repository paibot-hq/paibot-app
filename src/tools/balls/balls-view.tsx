"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import styles from "./balls-view.module.css";
import { createWorld, spawn, step, type Options, type World } from "./balls";

const SIZE = 640;
const BACKGROUND = "#0b1020";
const ARENA: Options = { cx: SIZE / 2, cy: SIZE / 2, radius: SIZE / 2 - 2, maxBalls: 400, minRadius: 3, split: true, gravity: 0 };
const GRAVITY = 700;
type Flash = { x: number; y: number; hue: number; age: number };

export default function Balls() {
  const t = useTranslations("App.balls");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<World>(createWorld());
  const flashes = useRef<Flash[]>([]);
  const splitRef = useRef(true);
  const runningRef = useRef(true);
  const trailsRef = useRef(true);
  const gravityRef = useRef(false);
  const [split, setSplit] = useState(true);
  const [running, setRunning] = useState(true);
  const [trails, setTrails] = useState(true);
  const [gravity, setGravity] = useState(false);
  const [stats, setStats] = useState({ count: 0, splits: 0 });
  splitRef.current = split;
  runningRef.current = running;
  trailsRef.current = trails;
  gravityRef.current = gravity;

  function reset() {
    const world = createWorld();
    for (let i = 0; i < 2; i++) world.balls.push(spawn(ARENA, Math.random));
    worldRef.current = world;
    flashes.current = [];
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) { ctx.fillStyle = BACKGROUND; ctx.fillRect(0, 0, SIZE, SIZE); }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = SIZE;
    canvas.height = SIZE;
    reset();
    let frame = 0;
    let before = performance.now();
    let shown = "";
    const loop = (now: number) => {
      const dt = (now - before) / 1000;
      before = now;
      const ctx = canvas.getContext("2d");
      const world = worldRef.current;
      if (ctx) {
        if (runningRef.current) {
          for (const found of step(world, dt, { ...ARENA, split: splitRef.current, gravity: gravityRef.current ? GRAVITY : 0 }, Math.random)) flashes.current.push({ ...found, age: 0 });
        }
        // The past slowly melts away; with trails off it is gone at once.
        ctx.fillStyle = trailsRef.current ? "rgba(11, 16, 32, 0.16)" : BACKGROUND;
        ctx.fillRect(0, 0, SIZE, SIZE);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.beginPath();
        ctx.arc(ARENA.cx, ARENA.cy, ARENA.radius, 0, Math.PI * 2);
        ctx.stroke();
        for (const ball of world.balls) {
          if (ball.r < 6) {
            ctx.fillStyle = `hsl(${ball.hue}, 90%, 62%)`;
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
            ctx.fill();
            continue;
          }
          const glow = ctx.createRadialGradient(ball.x - ball.r * 0.3, ball.y - ball.r * 0.3, ball.r * 0.1, ball.x, ball.y, ball.r);
          glow.addColorStop(0, `hsl(${ball.hue}, 95%, 82%)`);
          glow.addColorStop(1, `hsl(${ball.hue}, 85%, 50%)`);
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
          ctx.fill();
        }
        flashes.current = flashes.current.filter(flash => (flash.age += runningRef.current ? dt : 0) < 0.45);
        for (const flash of flashes.current) {
          ctx.strokeStyle = `hsla(${flash.hue}, 95%, 75%, ${1 - flash.age / 0.45})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(flash.x, flash.y, 8 + flash.age * 90, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      const next = `${world.balls.length}/${world.splits}`;
      if (next !== shown) { shown = next; setStats({ count: world.balls.length, splits: world.splits }); }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
    // The loop reads everything through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A tap puts a ball where it was tapped, going in a random direction.
  function add(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * SIZE;
    const y = ((event.clientY - rect.top) / rect.height) * SIZE;
    const world = worldRef.current;
    if (world.balls.length >= ARENA.maxBalls) return;
    const ball = spawn(ARENA, Math.random);
    if (Math.hypot(x - ARENA.cx, y - ARENA.cy) < ARENA.radius - ball.r) { ball.x = x; ball.y = y; }
    world.balls.push(ball);
  }

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label={t("canvasLabel")} onPointerDown={add} />
      <p className={styles.count} role="status" data-balls="count">{t("count", stats)}</p>
      <div className={styles.buttons}>
        <button className="auth-link" type="button" aria-pressed={running} onClick={() => setRunning(on => !on)} data-balls="run">{running ? t("pause") : t("resume")}</button>
        <button className={styles.button} type="button" onClick={reset} data-balls="reset">{t("reset")}</button>
      </div>
      <div className={styles.buttons}>
        <button type="button" className={styles.choice} aria-pressed={split} onClick={() => setSplit(on => !on)}>{t("split")}</button>
        <button type="button" className={styles.choice} aria-pressed={gravity} onClick={() => setGravity(on => !on)} data-balls="gravity">{t("gravity")}</button>
        <button type="button" className={styles.choice} aria-pressed={trails} onClick={() => setTrails(on => !on)}>{t("trails")}</button>
      </div>
      <p className={controls.label}>{t("hint")}</p>
    </ToolLayout>
  );
}
