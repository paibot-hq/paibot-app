"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useLocale, useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import ShareButtons from "../../components/share-buttons";
import styles from "./circle.module.css";
import { judge, type Judgement, type Point } from "./judge";

const STORAGE = "circle:v1";
// Points closer than this to the last one (in CSS pixels) are dropped: they add nothing but jitter.
const MIN_STEP = 2;

function loadBest(): number {
  try {
    const value = Number(window.localStorage.getItem(STORAGE));
    return Number.isFinite(value) ? value : 0;
  } catch { return 0; }
}
function saveBest(value: number) {
  try { window.localStorage.setItem(STORAGE, String(value)); } catch { /* private window or blocked storage */ }
}

// From the stroke's distance off the circle (a share of the radius) to its colour: green on the circle, through yellow to red at 10% off.
function colorFor(off: number): string {
  const t = Math.min(1, Math.abs(off) / 0.1);
  return `hsl(${Math.round(140 * (1 - t))} 75% 48%)`;
}

function draw(canvas: HTMLCanvasElement, points: Point[], result: Judgement | null) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const ratio = canvas.width / canvas.clientWidth || 1;
  const side = canvas.clientWidth;
  const css = getComputedStyle(canvas);
  const line = css.getPropertyValue("--line").trim() || "#d5e0ea";
  const muted = css.getPropertyValue("--muted").trim() || "#637487";
  const text = css.getPropertyValue("--text").trim() || "#162333";
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, side, side);
  // A faint cross at the middle, as a guide.
  ctx.strokeStyle = line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(side / 2 - 10, side / 2); ctx.lineTo(side / 2 + 10, side / 2);
  ctx.moveTo(side / 2, side / 2 - 10); ctx.lineTo(side / 2, side / 2 + 10);
  ctx.stroke();
  const fit = result?.fit;
  if (fit) {
    // The circle the stroke was judged against, dashed, and its centre.
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = muted;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(fit.cx, fit.cy, fit.r, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = muted;
    ctx.beginPath();
    ctx.arc(fit.cx, fit.cy, 3, 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const deviations = result?.ok ? result.deviations : null;
  for (let i = 1; i < points.length; i++) {
    ctx.strokeStyle = deviations && fit ? colorFor(deviations[i] / fit.r) : text;
    ctx.beginPath();
    ctx.moveTo(points[i - 1].x, points[i - 1].y);
    ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
  }
}

export default function Circle() {
  const t = useTranslations("App.circle");
  const locale = useLocale();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointsRef = useRef<Point[]>([]);
  const pointerRef = useRef<number | null>(null);
  const resultRef = useRef<Judgement | null>(null);
  const [result, setResult] = useState<Judgement | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [best, setBest] = useState(0);
  const [newBest, setNewBest] = useState(false);
  resultRef.current = result;

  useEffect(() => { setBest(loadBest()); }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let width = 0;
    const fit = () => {
      const next = canvas.clientWidth;
      if (!next) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(next * ratio);
      canvas.height = Math.round(next * ratio);
      // A stroke drawn at another size no longer lines up with the board; it is cleared rather than scaled.
      if (width && Math.abs(next - width) > 1) { pointsRef.current = []; setResult(null); }
      width = next;
      draw(canvas, pointsRef.current, resultRef.current);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    // The colours follow the theme, which the site sets on <html data-theme>.
    const theme = new MutationObserver(() => draw(canvas, pointsRef.current, resultRef.current));
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => { observer.disconnect(); theme.disconnect(); };
  }, []);

  function pointOf(event: ReactPointerEvent<HTMLCanvasElement>): Point {
    const box = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }

  function onDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (pointerRef.current !== null) return;
    event.preventDefault();
    pointerRef.current = event.pointerId;
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* the pointer is already gone */ }
    pointsRef.current = [pointOf(event)];
    setResult(null);
    setNewBest(false);
    setDrawing(true);
    draw(event.currentTarget, pointsRef.current, null);
  }

  function onMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (event.pointerId !== pointerRef.current) return;
    const points = pointsRef.current;
    // Every point the browser coalesced since the last event, so that a fast stroke keeps its shape.
    const events = event.nativeEvent.getCoalescedEvents?.() ?? [];
    const box = event.currentTarget.getBoundingClientRect();
    const fresh = events.length ? events.map(e => ({ x: e.clientX - box.left, y: e.clientY - box.top })) : [pointOf(event)];
    for (const p of fresh) {
      const last = points[points.length - 1];
      if (Math.hypot(p.x - last.x, p.y - last.y) >= MIN_STEP) points.push(p);
    }
    draw(event.currentTarget, points, null);
  }

  function onUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (event.pointerId !== pointerRef.current) return;
    pointerRef.current = null;
    setDrawing(false);
    const canvas = event.currentTarget;
    const judged = judge(pointsRef.current, canvas.clientWidth);
    setResult(judged);
    draw(canvas, pointsRef.current, judged);
    if (judged.ok && judged.score > best) {
      setBest(judged.score);
      setNewBest(best > 0);
      saveBest(judged.score);
    }
  }

  function clear() {
    pointsRef.current = [];
    setResult(null);
    setNewBest(false);
    if (canvasRef.current) draw(canvasRef.current, [], null);
  }

  return (
    <ToolLayout title={t("title")}>
      <p className={styles.intro}>{t("intro")}</p>
      <div className={styles.stage}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          aria-label={t("canvasLabel")}
          data-circle="board"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        />
        {!drawing && pointsRef.current.length === 0 && <p className={styles.prompt} aria-hidden="true">{t("prompt")}</p>}
      </div>
      <div className={styles.result} aria-live="polite" data-circle="result">
        {result?.ok && (
          <>
            <p className={styles.rank} data-rank={result.rank}>{result.rank}</p>
            <p className={styles.score}><span data-circle="score">{result.score.toFixed(1)}</span><small>{t("points")}</small></p>
            {newBest && <p className={controls.newRecord}>{t("newBest")}</p>}
            <p className={styles.comment}>{t(`comment${result.rank}`)}</p>
          </>
        )}
        {result && !result.ok && <p className={styles.problem} data-circle="problem">{t(`problem.${result.problem}`)}</p>}
      </div>
      {best > 0 && <p className={controls.best}>{t("best")}: <span data-circle="best">{best.toFixed(1)}</span>{t("points")}</p>}
      <div className={styles.buttons}>
        <button className="auth-link" type="button" onClick={clear} disabled={drawing}>{t("clear")}</button>
      </div>
      {result?.ok && <ShareButtons text={t("shareText", { score: result.score.toFixed(1), rank: result.rank })} path={`/${locale}/circle`} />}
      <p className={styles.hint}>{t("hint")}</p>
    </ToolLayout>
  );
}
