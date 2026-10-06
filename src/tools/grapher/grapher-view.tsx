"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import { MathTex } from "../../components/math-tex";
import styles from "./grapher-view.module.css";
import { compile } from "./expression";
import { formatTick, fromScreen, niceStep, polylines, ticks, toScreen, zoomAt, type View } from "./graph";

const MAX_ROWS = 6;
const COLORS = ["#4f8cff", "#ff6b6b", "#2fbf71", "#f5a623", "#b36bff", "#18b6c9"];
const EXAMPLES = ["x^2", "x^3 - 3x", "sin(x)", "1/x", "sqrt(x)", "abs(x)", "tan(x)", "e^x", "ln(x)", "sin(x)/x"];
// The picture starts showing x from -8 to 8, whatever the width of the screen.
const START_SPAN = 16;

type Row = { id: number; text: string; visible: boolean };
let nextId = 3;

export default function Grapher() {
  const t = useTranslations("App.grapher");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sizeRef = useRef({ w: 960, h: 640, dpr: 1 });
  const viewRef = useRef<View>({ cx: 0, cy: 0, scale: 960 / START_SPAN });
  const hoverRef = useRef<number | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);
  const frame = useRef(0);
  const [rows, setRows] = useState<Row[]>([{ id: 1, text: "x^2 - 2", visible: true }, { id: 2, text: "2sin(x)", visible: true }]);
  const [readout, setReadout] = useState("");
  const compiled = useMemo(() => rows.map(row => compile(row.text)), [rows]);
  const dataRef = useRef({ rows, compiled });
  dataRef.current = { rows, compiled };

  const draw = useCallback(() => {
    frame.current = 0;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { w: W, h: H, dpr } = sizeRef.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const dark = document.documentElement.dataset.theme === "dark";
    const palette = dark
      ? { bg: "#0b1020", grid: "rgba(255,255,255,0.08)", axis: "rgba(255,255,255,0.55)", text: "rgba(255,255,255,0.7)" }
      : { bg: "#ffffff", grid: "rgba(0,0,0,0.08)", axis: "rgba(0,0,0,0.6)", text: "rgba(0,0,0,0.65)" };
    const view = viewRef.current;
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, W, H);
    const left = fromScreen(view, W, H, 0, 0), right = fromScreen(view, W, H, W, H);
    const step = niceStep((right.x - left.x));
    const stepY = niceStep(left.y - right.y);
    // Grid and labels.
    ctx.lineWidth = 1;
    ctx.font = "14px system-ui, sans-serif";
    const origin = toScreen(view, W, H, 0, 0);
    const axisX = Math.min(H - 6, Math.max(18, origin.y));
    const axisY = Math.min(W - 6, Math.max(6, origin.x));
    ctx.fillStyle = palette.text;
    for (const x of ticks(left.x, right.x, step)) {
      const sx = Math.round(toScreen(view, W, H, x, 0).x) + 0.5;
      ctx.strokeStyle = palette.grid;
      ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, H); ctx.stroke();
      if (Math.abs(x) > step * 1e-9) { ctx.textAlign = "center"; ctx.fillText(formatTick(x, step), sx, Math.min(H - 6, axisX + 18)); }
    }
    for (const y of ticks(right.y, left.y, stepY)) {
      const sy = Math.round(toScreen(view, W, H, 0, y).y) + 0.5;
      ctx.strokeStyle = palette.grid;
      ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(W, sy); ctx.stroke();
      if (Math.abs(y) > stepY * 1e-9) { ctx.textAlign = axisY > W - 60 ? "right" : "left"; ctx.fillText(formatTick(y, stepY), axisY > W - 60 ? axisY - 6 : axisY + 6, sy - 4); }
    }
    ctx.strokeStyle = palette.axis;
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(0, Math.round(origin.y) + 0.5); ctx.lineTo(W, Math.round(origin.y) + 0.5); ctx.moveTo(Math.round(origin.x) + 0.5, 0); ctx.lineTo(Math.round(origin.x) + 0.5, H); ctx.stroke();
    // Curves.
    ctx.lineJoin = "round";
    ctx.lineWidth = 3;
    const { rows: current, compiled: fns } = dataRef.current;
    current.forEach((row, index) => {
      const fn = fns[index];
      if (!row.visible || !fn.ok) return;
      ctx.strokeStyle = COLORS[index % COLORS.length];
      for (const line of polylines(x => fn.evaluate(x), view, W, H)) {
        ctx.beginPath();
        line.forEach((p, k) => (k === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.stroke();
      }
    });
    // The pointer: a line at its x with a dot on every curve.
    const hover = hoverRef.current;
    if (hover !== null) {
      const x = fromScreen(view, W, H, hover, 0).x;
      ctx.strokeStyle = palette.axis;
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(hover, 0); ctx.lineTo(hover, H); ctx.stroke();
      ctx.setLineDash([]);
      current.forEach((row, index) => {
        const fn = fns[index];
        if (!row.visible || !fn.ok) return;
        const y = fn.evaluate(x);
        if (!Number.isFinite(y)) return;
        const p = toScreen(view, W, H, x, y);
        if (p.y < -10 || p.y > H + 10) return;
        ctx.fillStyle = COLORS[index % COLORS.length];
        ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill();
      });
    }
  }, []);

  const schedule = useCallback(() => { if (!frame.current) frame.current = requestAnimationFrame(draw); }, [draw]);

  // What is read out under the picture: x at the pointer and the value of each curve there.
  const updateReadout = useCallback(() => {
    const hover = hoverRef.current;
    if (hover === null) { setReadout(""); return; }
    const { w: W, h: H } = sizeRef.current;
    const x = fromScreen(viewRef.current, W, H, hover, 0).x;
    const step = niceStep(W / viewRef.current.scale) / 100;
    const show = (v: number) => (Number.isFinite(v) ? formatTick(Number(v.toPrecision(6)), Math.min(step, Math.abs(v) / 1e6 || step)).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "") : "—");
    const parts = [`x = ${show(x)}`];
    dataRef.current.rows.forEach((row, index) => {
      const fn = dataRef.current.compiled[index];
      if (row.visible && fn.ok) parts.push(`${t("expression", { n: index + 1 })} = ${show(fn.evaluate(x))}`);
    });
    setReadout(parts.join(" · "));
  }, [t]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let sized = false;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      sizeRef.current = { w: rect.width, h: rect.height, dpr };
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      if (!sized) { sized = true; viewRef.current = { cx: 0, cy: 0, scale: rect.width / START_SPAN }; }
      schedule();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    // The wheel must not scroll the page while it zooms the picture.
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const { w: W, h: H } = sizeRef.current;
      viewRef.current = zoomAt(viewRef.current, W, H, event.clientX - rect.left, event.clientY - rect.top, Math.exp(-event.deltaY * 0.0015));
      schedule(); updateReadout();
    };
    canvas.addEventListener("wheel", wheel, { passive: false });
    const theme = new MutationObserver(schedule);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => { canvas.removeEventListener("wheel", wheel); observer.disconnect(); theme.disconnect(); cancelAnimationFrame(frame.current); };
  }, [schedule, updateReadout]);

  useEffect(() => { schedule(); updateReadout(); }, [rows, schedule, updateReadout]);

  const local = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  function down(event: ReactPointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, local(event));
    pinch.current = null;
  }
  function move(event: ReactPointerEvent<HTMLCanvasElement>) {
    const at = local(event);
    const before = pointers.current.get(event.pointerId);
    if (before) {
      pointers.current.set(event.pointerId, at);
      if (pointers.current.size === 1) {
        const view = viewRef.current;
        viewRef.current = { ...view, cx: view.cx - (at.x - before.x) / view.scale, cy: view.cy + (at.y - before.y) / view.scale };
      } else if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        const { w: W, h: H } = sizeRef.current;
        if (pinch.current) viewRef.current = zoomAt(viewRef.current, W, H, (a.x + b.x) / 2, (a.y + b.y) / 2, distance / pinch.current);
        pinch.current = distance;
      }
    }
    hoverRef.current = at.x;
    schedule(); updateReadout();
  }
  function up(event: ReactPointerEvent<HTMLCanvasElement>) {
    pointers.current.delete(event.pointerId);
    pinch.current = null;
    if (event.pointerType !== "mouse") { hoverRef.current = null; schedule(); updateReadout(); }
  }
  function leave() { hoverRef.current = null; schedule(); updateReadout(); }
  function zoomBy(factor: number) { const { w: W, h: H } = sizeRef.current; viewRef.current = zoomAt(viewRef.current, W, H, W / 2, H / 2, factor); schedule(); updateReadout(); }
  function reset() { viewRef.current = { cx: 0, cy: 0, scale: sizeRef.current.w / START_SPAN }; schedule(); updateReadout(); }
  function key(event: ReactKeyboardEvent<HTMLCanvasElement>) {
    const view = viewRef.current;
    const move = 60 / view.scale;
    const arrows: Record<string, [number, number]> = { ArrowLeft: [-move, 0], ArrowRight: [move, 0], ArrowUp: [0, move], ArrowDown: [0, -move] };
    if (arrows[event.key]) { viewRef.current = { ...view, cx: view.cx + arrows[event.key][0], cy: view.cy + arrows[event.key][1] }; }
    else if (event.key === "+" || event.key === "=") zoomBy(1.25);
    else if (event.key === "-") zoomBy(0.8);
    else if (event.key === "0") reset();
    else return;
    event.preventDefault();
    schedule(); updateReadout();
  }

  const change = (id: number, patch: Partial<Row>) => setRows(list => list.map(row => (row.id === id ? { ...row, ...patch } : row)));
  const add = (text = "") => setRows(list => (list.length >= MAX_ROWS ? [...list.slice(0, -1), { id: nextId++, text, visible: true }] : [...list, { id: nextId++, text, visible: true }]));

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <ul className={styles.rows}>
        {rows.map((row, index) => {
          const result = compiled[index];
          return (
            <li key={row.id} className={styles.row}>
              <button type="button" className={styles.swatch} style={{ background: row.visible ? COLORS[index % COLORS.length] : "transparent", borderColor: COLORS[index % COLORS.length] }} aria-pressed={row.visible} aria-label={t("toggle", { n: index + 1 })} onClick={() => change(row.id, { visible: !row.visible })} />
              <span className={styles.prefix} aria-hidden="true">y =</span>
              <input className={styles.input} value={row.text} spellCheck={false} autoComplete="off" autoCapitalize="off" inputMode="text" aria-label={t("expression", { n: index + 1 })} aria-invalid={!result.ok && row.text.trim() !== ""} placeholder={t("placeholder")} onChange={event => change(row.id, { text: event.target.value })} />
              <button type="button" className={styles.remove} aria-label={t("remove", { n: index + 1 })} onClick={() => setRows(list => list.filter(item => item.id !== row.id))}>×</button>
              {result.ok && <div className={styles.preview} data-grapher="tex"><MathTex tex={`y = ${result.tex}`} /></div>}
              {!result.ok && row.text.trim() !== "" && <p className={styles.error} role="alert">{t(`errors.${result.error}`)}</p>}
            </li>
          );
        })}
      </ul>
      <div className={styles.actions}>
        <button type="button" className={styles.button} onClick={() => add()} data-grapher="add">{t("add")}</button>
        <button type="button" className={styles.button} onClick={() => zoomBy(1.25)} aria-label={t("zoomIn")}>＋</button>
        <button type="button" className={styles.button} onClick={() => zoomBy(0.8)} aria-label={t("zoomOut")}>－</button>
        <button type="button" className={styles.button} onClick={reset} data-grapher="reset">{t("reset")}</button>
      </div>
      <canvas ref={canvasRef} className={styles.canvas} tabIndex={0} role="img" aria-label={t("canvasLabel")} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={leave} onKeyDown={key} />
      <p className={styles.readout} role="status" data-grapher="readout">{readout || t("readoutEmpty")}</p>
      <div className={styles.examples} role="group" aria-label={t("examples")}>
        <span className={styles.examplesLabel}>{t("examples")}</span>
        {EXAMPLES.map(example => <button key={example} type="button" className={styles.choice} onClick={() => add(example)}>{example}</button>)}
      </div>
      <p className={controls.label}>{t("hint")}</p>
    </ToolLayout>
  );
}
