"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import styles from "./pendulum-view.module.css";
import { bobs, family, step, type State } from "./pendulum";

const SIZE = 640;
const PIVOT = { x: SIZE / 2, y: 190 };
const UNIT = 140;
const SUBSTEP = 1 / 240;
const TRAIL = 260;
const SPREADS = [0.01, 0.1, 1];
const SPEEDS = [1, 2, 4];
const rad = (degrees: number) => (degrees * Math.PI) / 180;

type Trail = { x: number; y: number }[];

export default function Pendulum() {
  const t = useTranslations("App.pendulum");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const states = useRef<State[]>([]);
  const trails = useRef<Trail[]>([]);
  const time = useRef(0);
  const [count, setCount] = useState(12);
  const [angle1, setAngle1] = useState(120);
  const [angle2, setAngle2] = useState(120);
  const [spread, setSpread] = useState(0.1);
  const [speed, setSpeed] = useState(1);
  const [running, setRunning] = useState(true);
  const [showTrails, setShowTrails] = useState(true);
  const [stats, setStats] = useState({ seconds: "0.0", distance: "0.00" });
  const live = useRef({ running, speed, showTrails });
  live.current = { running, speed, showTrails };

  // Every pendulum starts again whenever the start is changed.
  useEffect(() => {
    states.current = family(count, rad(angle1), rad(angle2), rad(spread));
    trails.current = states.current.map(() => []);
    time.current = 0;
  }, [count, angle1, angle2, spread]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = SIZE;
    canvas.height = SIZE;
    let frame = 0, before = performance.now(), shown = "";
    const loop = (now: number) => {
      const dt = Math.min((now - before) / 1000, 0.05) * live.current.speed;
      before = now;
      if (live.current.running) {
        let left = dt;
        while (left > 1e-9) {
          const h = Math.min(SUBSTEP, left);
          states.current = states.current.map(s => step(s, h));
          left -= h;
        }
        time.current += dt;
        states.current.forEach((s, i) => {
          const { x2, y2 } = bobs(s);
          const trail = trails.current[i];
          trail.push({ x: PIVOT.x + x2 * UNIT, y: PIVOT.y - y2 * UNIT });
          if (trail.length > TRAIL) trail.shift();
        });
      }
      draw(canvas, states.current, trails.current, live.current.showTrails);
      const first = states.current[0], last = states.current[states.current.length - 1];
      if (first && last) {
        const p = bobs(first), q = bobs(last);
        const next = { seconds: time.current.toFixed(1), distance: Math.hypot(p.x2 - q.x2, p.y2 - q.y2).toFixed(2) };
        const key = `${next.seconds}/${next.distance}`;
        if (key !== shown) { shown = key; setStats(next); }
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  function restart() {
    states.current = family(count, rad(angle1), rad(angle2), rad(spread));
    trails.current = states.current.map(() => []);
    time.current = 0;
  }

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label={t("canvasLabel")} />
      <p className={styles.stats} role="status" data-pendulum="stats">{t("stats", stats)}</p>
      <div className={styles.buttons}>
        <button className="auth-link" type="button" aria-pressed={running} onClick={() => setRunning(on => !on)} data-pendulum="run">{running ? t("running") : t("paused")}</button>
        <button className={styles.button} type="button" onClick={restart} data-pendulum="restart">{t("restart")}</button>
        <button type="button" className={styles.choice} aria-pressed={showTrails} onClick={() => setShowTrails(on => !on)}>{t("trails")}</button>
      </div>
      <div className={styles.panel}>
        <label className={styles.row}>
          <span className={styles.name}>{t("count")}</span>
          <input type="range" min={1} max={30} step={1} value={count} aria-label={t("count")} onChange={event => setCount(Number(event.target.value))} />
          <span className={styles.value}>{count}</span>
        </label>
        <label className={styles.row}>
          <span className={styles.name}>{t("angle1")}</span>
          <input type="range" min={-180} max={180} step={1} value={angle1} aria-label={t("angle1")} onChange={event => setAngle1(Number(event.target.value))} />
          <span className={styles.value}>{angle1}°</span>
        </label>
        <label className={styles.row}>
          <span className={styles.name}>{t("angle2")}</span>
          <input type="range" min={-180} max={180} step={1} value={angle2} aria-label={t("angle2")} onChange={event => setAngle2(Number(event.target.value))} />
          <span className={styles.value}>{angle2}°</span>
        </label>
        <div className={styles.row} role="group" aria-label={t("spread")}>
          <span className={styles.name}>{t("spread")}</span>
          <span className={styles.group}>
            {SPREADS.map(value => <button key={value} type="button" className={styles.choice} aria-pressed={spread === value} onClick={() => setSpread(value)}>{value}°</button>)}
          </span>
        </div>
        <div className={styles.row} role="group" aria-label={t("speed")}>
          <span className={styles.name}>{t("speed")}</span>
          <span className={styles.group}>
            {SPEEDS.map(value => <button key={value} type="button" className={styles.choice} aria-pressed={speed === value} onClick={() => setSpeed(value)}>×{value}</button>)}
          </span>
        </div>
      </div>
      <p className={controls.label}>{t("hint")}</p>
    </ToolLayout>
  );
}

function draw(canvas: HTMLCanvasElement, list: State[], trails: Trail[], showTrails: boolean) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#0b1020";
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  list.forEach((state, index) => {
    const hue = (index * 300) / Math.max(1, list.length);
    if (showTrails) {
      const trail = trails[index];
      ctx.strokeStyle = `hsla(${hue}, 90%, 62%, 0.55)`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      trail.forEach((p, k) => (k === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
    }
    const { x1, y1, x2, y2 } = bobs(state);
    const a = { x: PIVOT.x + x1 * UNIT, y: PIVOT.y - y1 * UNIT }, b = { x: PIVOT.x + x2 * UNIT, y: PIVOT.y - y2 * UNIT };
    ctx.strokeStyle = `hsla(${hue}, 80%, 75%, ${list.length > 1 ? 0.45 : 0.9})`;
    ctx.lineWidth = list.length > 1 ? 1.5 : 3;
    ctx.beginPath(); ctx.moveTo(PIVOT.x, PIVOT.y); ctx.lineTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.fillStyle = `hsl(${hue}, 90%, 62%)`;
    const radius = list.length > 1 ? 4.5 : 9;
    for (const p of [a, b]) { ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.fill(); }
  });
  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.arc(PIVOT.x, PIVOT.y, 5, 0, Math.PI * 2); ctx.fill();
}
