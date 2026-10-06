"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import styles from "./fourier-view.module.css";
import { PRESETS, PRESET_NAMES, chain, dft, fit, resample, trace, type Point, type PresetName, type Term } from "./fourier";

const SIZE = 640;
const MID = SIZE / 2;
const TERMS = 256;
const SAMPLES = 500;
const SPEEDS = [0.5, 1, 2];
const LOOP = 12; // seconds for one loop at normal speed

type Source = PresetName | "drawn";

export default function Fourier() {
  const t = useTranslations("App.fourier");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const termsRef = useRef<Term[]>([]);
  const originalRef = useRef<Point[]>([]);
  const pathRef = useRef<Point[]>([]);
  const strokeRef = useRef<Point[] | null>(null);
  const time = useRef(0);
  const [source, setSource] = useState<Source>("heart");
  const [count, setCount] = useState(30);
  const [circles, setCircles] = useState(true);
  const [original, setOriginal] = useState(false);
  const [speed, setSpeed] = useState(1);
  const live = useRef({ count, circles, original, speed });
  live.current = { count, circles, original, speed };

  // The picture to be drawn, relative to the middle of the canvas: cut into 256 equal steps and turned into circles.
  function load(points: Point[]) {
    const cut = resample(points, TERMS).map(p => ({ x: p.x - MID, y: p.y - MID }));
    originalRef.current = cut;
    termsRef.current = dft(cut);
    pathRef.current = trace(termsRef.current, live.current.count, SAMPLES);
    time.current = 0;
  }

  useEffect(() => {
    if (source !== "drawn") load(fit(PRESETS[source](), SIZE, 250));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);
  useEffect(() => { pathRef.current = trace(termsRef.current, count, SAMPLES); }, [count, source]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = SIZE;
    canvas.height = SIZE;
    let frame = 0, before = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - before) / 1000, 0.05);
      before = now;
      if (!strokeRef.current) time.current += (dt * live.current.speed) / LOOP;
      draw(canvas, termsRef.current, originalRef.current, pathRef.current, strokeRef.current, time.current % 1, live.current);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  const at = (event: ReactPointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * SIZE, y: ((event.clientY - rect.top) / rect.height) * SIZE };
  };
  function down(event: ReactPointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    strokeRef.current = [at(event)];
  }
  function move(event: ReactPointerEvent<HTMLCanvasElement>) {
    const stroke = strokeRef.current;
    if (!stroke) return;
    const p = at(event), last = stroke[stroke.length - 1];
    if (Math.hypot(p.x - last.x, p.y - last.y) > 2) stroke.push(p);
  }
  function up() {
    const stroke = strokeRef.current;
    strokeRef.current = null;
    if (stroke && stroke.length >= 8) { load(stroke); setSource("drawn"); }
  }

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label={t("canvasLabel")} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
      <p className={styles.stats} role="status" data-fourier="stats">{t("stats", { count, total: TERMS, source: source === "drawn" ? t("drawn") : t(`presets.${source}`) })}</p>
      <label className={styles.slider}>
        <span>{t("circles")}</span>
        <input type="range" min={1} max={TERMS} step={1} value={count} aria-label={t("circles")} onChange={event => setCount(Number(event.target.value))} />
        <span className={styles.value}>{count}</span>
      </label>
      <div className={styles.buttons} role="group" aria-label={t("examples")}>
        {PRESET_NAMES.map(name => <button key={name} type="button" className={styles.choice} aria-pressed={source === name} onClick={() => setSource(name)}>{t(`presets.${name}`)}</button>)}
      </div>
      <div className={styles.buttons}>
        <button type="button" className={styles.choice} aria-pressed={circles} onClick={() => setCircles(on => !on)}>{t("showCircles")}</button>
        <button type="button" className={styles.choice} aria-pressed={original} onClick={() => setOriginal(on => !on)}>{t("showOriginal")}</button>
        {SPEEDS.map(value => <button key={value} type="button" className={styles.choice} aria-pressed={speed === value} aria-label={t("speedOf", { n: value })} onClick={() => setSpeed(value)}>×{value}</button>)}
      </div>
      <p className={controls.label}>{t("hint")}</p>
    </ToolLayout>
  );
}

type Look = { count: number; circles: boolean; original: boolean };

function draw(canvas: HTMLCanvasElement, terms: Term[], original: Point[], path: Point[], stroke: Point[] | null, t: number, look: Look) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#0b1020";
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const line = (points: Point[], upTo = points.length) => {
    ctx.beginPath();
    for (let i = 0; i < upTo; i++) (i === 0 ? ctx.moveTo(MID + points[i].x, MID + points[i].y) : ctx.lineTo(MID + points[i].x, MID + points[i].y));
  };
  if (stroke) {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    stroke.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    return;
  }
  if (look.original && original.length > 0) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
    ctx.setLineDash([4, 6]);
    ctx.lineWidth = 1.5;
    line(original);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (path.length > 0) {
    ctx.strokeStyle = "rgba(255, 120, 150, 0.2)";
    ctx.lineWidth = 2;
    line(path);
    ctx.closePath();
    ctx.stroke();
    // What has been drawn so far in this loop, brighter.
    ctx.strokeStyle = "#ff6f91";
    ctx.lineWidth = 3.2;
    line(path, Math.max(2, Math.floor(t * path.length) + 1));
    ctx.stroke();
  }
  const links = chain(terms, t, look.count);
  if (look.circles) {
    for (let k = 0; k < links.length - 1; k++) {
      const radius = terms[k].amplitude;
      if (radius > 0.6) {
        ctx.strokeStyle = "rgba(160, 200, 255, 0.28)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(MID + links[k].x, MID + links[k].y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    links.forEach((p, i) => (i === 0 ? ctx.moveTo(MID + p.x, MID + p.y) : ctx.lineTo(MID + p.x, MID + p.y)));
    ctx.stroke();
  }
  const tip = links[links.length - 1];
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(MID + tip.x, MID + tip.y, 5, 0, Math.PI * 2);
  ctx.fill();
}
