"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import { MathTex } from "../../components/math-tex";
import styles from "./series-view.module.css";
import { FOURIER_KINDS, TAYLOR_KINDS, VIEWS, approximate, isFourier, peak, rmsError, sumTex, target, type Kind } from "./series";

const TARGET_TEX: Record<Kind, string> = {
  sin: "\\sin x", cos: "\\cos x", exp: "e^{x}", log: "\\ln(1+x)", geometric: "\\frac{1}{1-x}", atan: "\\arctan x",
  square: "\\text{square}", sawtooth: "\\text{sawtooth}", triangle: "\\text{triangle}",
};
const TAYLOR_LABEL: Record<string, string> = { sin: "sin x", cos: "cos x", exp: "eˣ", log: "ln(1+x)", geometric: "1/(1−x)", atan: "arctan x" };
type Wave = "square" | "sawtooth" | "triangle";
const maxTerms = (kind: Kind) => (isFourier(kind) ? 100 : kind === "exp" || kind === "sin" || kind === "cos" ? 25 : 40);

export default function SeriesView() {
  const t = useTranslations("App.series");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frame = useRef(0);
  const [kind, setKind] = useState<Kind>("sin");
  const [n, setN] = useState(3);
  const [playing, setPlaying] = useState(false);
  const [ghost, setGhost] = useState(true);
  const live = useRef({ kind, n, ghost });
  live.current = { kind, n, ghost };

  const limit = maxTerms(kind);
  const error = useMemo(() => rmsError(kind, n), [kind, n]);
  const top = useMemo(() => (kind === "square" || kind === "sawtooth" ? peak(kind, n) : null), [kind, n]);

  // Adding terms by itself, from one to the most, and round again.
  useEffect(() => {
    if (!playing) return;
    const every = isFourier(kind) ? 140 : 650;
    const timer = setInterval(() => setN(current => (current >= maxTerms(kind) ? 1 : current + 1)), every);
    return () => clearInterval(timer);
  }, [playing, kind]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const paint = () => {
      frame.current = 0;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
      }
      draw(canvas, rect.width, rect.height, dpr, live.current.kind, live.current.n, live.current.ghost);
    };
    const schedule = () => { if (!frame.current) frame.current = requestAnimationFrame(paint); };
    schedule();
    const observer = new ResizeObserver(schedule);
    observer.observe(canvas);
    const theme = new MutationObserver(schedule);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    (canvas as HTMLCanvasElement & { redraw?: () => void }).redraw = schedule;
    return () => { observer.disconnect(); theme.disconnect(); cancelAnimationFrame(frame.current); };
  }, []);
  useEffect(() => { (canvasRef.current as (HTMLCanvasElement & { redraw?: () => void }) | null)?.redraw?.(); }, [kind, n, ghost]);

  function pick(next: Kind) { setKind(next); setN(current => Math.min(current, maxTerms(next))); }

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <div className={styles.family}>
        <span className={styles.familyName}>{t("taylor")}</span>
        <span className={styles.group} role="group" aria-label={t("taylor")}>
          {TAYLOR_KINDS.map(name => <button key={name} type="button" className={styles.choice} aria-pressed={kind === name} onClick={() => pick(name)}>{TAYLOR_LABEL[name]}</button>)}
        </span>
      </div>
      <div className={styles.family}>
        <span className={styles.familyName}>{t("fourier")}</span>
        <span className={styles.group} role="group" aria-label={t("fourier")}>
          {FOURIER_KINDS.map(name => <button key={name} type="button" className={styles.choice} aria-pressed={kind === name} onClick={() => pick(name)}>{t(`waves.${name as Wave}`)}</button>)}
        </span>
      </div>
      <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label={t("canvasLabel", { name: isFourier(kind) ? t(`waves.${kind as Wave}`) : TAYLOR_LABEL[kind], n })} />
      <div className={styles.legend}>
        <span className={styles.target}>{t("target")}</span>
        <span className={styles.sum}>{t("sum")}</span>
        {ghost && <span className={styles.previous}>{t("previous")}</span>}
      </div>
      <div className={styles.formula} data-series="tex">
        <MathTex tex={`${isFourier(kind) ? "f(x)" : TARGET_TEX[kind]} \\approx ${sumTex(kind, n)}`} />
      </div>
      <p className={styles.stats} role="status" data-series="stats">
        {t("stats", { n, error: !Number.isFinite(error) ? "—" : error >= 1000 ? error.toExponential(1).replace("e+", "e") : error.toFixed(4) })}{top !== null ? t("peak", { value: top.toFixed(3) }) : ""}
      </p>
      <div className={styles.controls}>
        <label className={styles.slider}>
          <span>{t("terms")}</span>
          <input type="range" min={1} max={limit} step={1} value={n} aria-label={t("terms")} onChange={event => { setPlaying(false); setN(Number(event.target.value)); }} />
          <span className={styles.value}>{n}</span>
        </label>
        <div className={styles.group}>
          <button className="auth-link" type="button" aria-pressed={playing} onClick={() => setPlaying(on => !on)} data-series="play">{playing ? t("playing") : t("play")}</button>
          <button type="button" className={styles.choice} aria-pressed={ghost} onClick={() => setGhost(on => !on)}>{t("previous")}</button>
        </div>
      </div>
      <p className={controls.label}>{t(`notes.${kind}`)}</p>
    </ToolLayout>
  );
}

function draw(canvas: HTMLCanvasElement, W: number, H: number, dpr: number, kind: Kind, n: number, ghost: boolean) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const dark = document.documentElement.dataset.theme === "dark";
  const palette = dark
    ? { bg: "#0b1020", grid: "rgba(255,255,255,0.08)", axis: "rgba(255,255,255,0.5)", text: "rgba(255,255,255,0.7)", target: "rgba(255,255,255,0.9)", sum: "#ff6f91", previous: "rgba(120,180,255,0.45)" }
    : { bg: "#ffffff", grid: "rgba(0,0,0,0.08)", axis: "rgba(0,0,0,0.55)", text: "rgba(0,0,0,0.65)", target: "rgba(0,0,0,0.85)", sum: "#e5456d", previous: "rgba(40,110,230,0.4)" };
  const view = VIEWS[kind];
  const sx = (x: number) => ((x - view.xMin) / (view.xMax - view.xMin)) * W;
  const sy = (y: number) => H - ((y - view.yMin) / (view.yMax - view.yMin)) * H;
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.font = "13px system-ui, sans-serif";
  ctx.lineWidth = 1;
  const label = (x: number) => (Math.abs(x) < 1e-9 ? "" : isFourier(kind) ? `${Math.round(x / Math.PI)}π` : String(Number(x.toFixed(3))));
  for (let x = Math.ceil(view.xMin / view.xStep - 1e-9) * view.xStep; x <= view.xMax + 1e-9; x += view.xStep) {
    ctx.strokeStyle = palette.grid;
    ctx.beginPath(); ctx.moveTo(Math.round(sx(x)) + 0.5, 0); ctx.lineTo(Math.round(sx(x)) + 0.5, H); ctx.stroke();
    ctx.fillStyle = palette.text; ctx.textAlign = sx(x) < 24 ? "left" : sx(x) > W - 24 ? "right" : "center";
    ctx.fillText(label(x), sx(x), Math.min(H - 4, sy(0) + 16));
  }
  for (let y = Math.ceil(view.yMin / view.yStep - 1e-9) * view.yStep; y <= view.yMax + 1e-9; y += view.yStep) {
    ctx.strokeStyle = palette.grid;
    ctx.beginPath(); ctx.moveTo(0, Math.round(sy(y)) + 0.5); ctx.lineTo(W, Math.round(sy(y)) + 0.5); ctx.stroke();
    if (Math.abs(y) > 1e-9) { ctx.fillStyle = palette.text; ctx.textAlign = "left"; ctx.fillText(String(Number(y.toFixed(3))), sx(0) + 5, sy(y) - 3); }
  }
  ctx.strokeStyle = palette.axis;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, Math.round(sy(0)) + 0.5); ctx.lineTo(W, Math.round(sy(0)) + 0.5); ctx.moveTo(Math.round(sx(0)) + 0.5, 0); ctx.lineTo(Math.round(sx(0)) + 0.5, H); ctx.stroke();

  // A curve, one point every half pixel, broken where it is not a number, runs far off the picture or (for the wave itself) jumps.
  const curve = (f: (x: number) => number, style: string, width: number, breakOnJump: boolean) => {
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    ctx.lineJoin = "round";
    ctx.beginPath();
    let previous: number | null = null;
    for (let px = 0; px <= W; px += 0.5) {
      const x = view.xMin + ((view.xMax - view.xMin) * px) / W;
      const y = f(x);
      const py = sy(y);
      if (!Number.isFinite(y) || Math.abs(py) > H * 20) { previous = null; continue; }
      if (previous === null || (breakOnJump && Math.abs(py - previous) > H * 0.5)) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      previous = py;
    }
    ctx.stroke();
  };
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  curve(x => target(kind, x), palette.target, 2.5, true);
  if (ghost && n > 1) curve(x => approximate(kind, n - 1, x), palette.previous, 2, false);
  curve(x => approximate(kind, n, x), palette.sum, 3.2, false);
  ctx.restore();
}
