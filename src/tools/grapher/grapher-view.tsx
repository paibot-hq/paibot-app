"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import { MathTex } from "../../components/math-tex";
import styles from "./grapher-view.module.css";
import { compile } from "./expression";
import { formatTick, fromScreen, niceStep, polylines, ticks, toScreen, zoomAt, type View } from "./graph";
import { HEIGHT, buildSurface, faceNormal, project, rotate, type Surface, type Vec } from "./surface";

const MAX_ROWS = 6;
const COLORS = ["#4f8cff", "#ff6b6b", "#2fbf71", "#f5a623", "#b36bff", "#18b6c9"];
const EXAMPLES = ["x^2", "x^3 - 3x", "sin(x)", "1/x", "sqrt(x)", "abs(x)", "tan(x)", "e^x", "ln(x)", "sin(x)/x"];
// The picture starts showing x from -8 to 8, whatever the width of the screen.
const START_SPAN = 16;
const EXAMPLES_3D = ["x^2 + y^2", "x^2 - y^2", "sin(x)cos(y)", "sin(sqrt(x^2 + y^2))", "e^-(x^2 + y^2)", "abs(x) + abs(y)", "x*y", "1/(x^2 + y^2)"];
const START_TURN = { yaw: -0.7, pitch: -0.55, zoom: 1 };
const LIGHT: Vec = (() => { const v = { x: -0.4, y: 0.7, z: -0.6 }; const n = Math.hypot(v.x, v.y, v.z); return { x: v.x / n, y: v.y / n, z: v.z / n }; })();
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
type Palette = { bg: string; grid: string; axis: string; text: string };

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
  const turn = useRef({ ...START_TURN });
  const [mode, setMode] = useState<"2d" | "3d">("2d");
  const [surfaceText, setSurfaceText] = useState("sin(x)cos(y)");
  const [half, setHalf] = useState(5);
  const [wire, setWire] = useState(false);
  const [rows, setRows] = useState<Row[]>([{ id: 1, text: "x^2 - 2", visible: true }, { id: 2, text: "2sin(x)", visible: true }]);
  const [readout, setReadout] = useState("");
  const compiled = useMemo(() => rows.map(row => compile(row.text)), [rows]);
  const compiledSurface = useMemo(() => compile(surfaceText, ["x", "y"]), [surfaceText]);
  const surface = useMemo(() => (compiledSurface.ok ? buildSurface((x, y) => compiledSurface.evaluate(x, y), half) : null), [compiledSurface, half]);
  const dataRef = useRef({ rows, compiled, mode, surface, wire, half });
  dataRef.current = { rows, compiled, mode, surface, wire, half };

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
    if (dataRef.current.mode === "3d") {
      ctx.font = "14px system-ui, sans-serif";
      drawSurface(ctx, W, H, palette, dataRef.current.surface, turn.current, dataRef.current.wire);
      return;
    }
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
    if (dataRef.current.mode === "3d") {
      const { surface: built, half: range } = dataRef.current;
      const round = (v: number) => String(Number(v.toPrecision(3)));
      setReadout(built && built.quads.length > 0 ? t("readout3d", { half: range, min: round(built.zMin), max: round(built.zMax) }) : "");
      return;
    }
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
      if (dataRef.current.mode === "3d") { turn.current.zoom = clamp(turn.current.zoom * Math.exp(-event.deltaY * 0.0015), 0.3, 5); schedule(); return; }
      viewRef.current = zoomAt(viewRef.current, W, H, event.clientX - rect.left, event.clientY - rect.top, Math.exp(-event.deltaY * 0.0015));
      schedule(); updateReadout();
    };
    canvas.addEventListener("wheel", wheel, { passive: false });
    const theme = new MutationObserver(schedule);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => { canvas.removeEventListener("wheel", wheel); observer.disconnect(); theme.disconnect(); cancelAnimationFrame(frame.current); };
  }, [schedule, updateReadout]);

  useEffect(() => { schedule(); updateReadout(); }, [rows, mode, surface, wire, schedule, updateReadout]);

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
      if (dataRef.current.mode === "3d") {
        if (pointers.current.size === 1) {
          turn.current.yaw += (at.x - before.x) * 0.01;
          turn.current.pitch = clamp(turn.current.pitch + (at.y - before.y) * 0.01, -1.5, 1.5);
        } else if (pointers.current.size === 2) {
          const [a, b] = [...pointers.current.values()];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (pinch.current) turn.current.zoom = clamp((turn.current.zoom * distance) / pinch.current, 0.3, 5);
          pinch.current = distance;
        }
        schedule();
        return;
      }
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
  function zoomBy(factor: number) {
    if (mode === "3d") { turn.current.zoom = clamp(turn.current.zoom * factor, 0.3, 5); schedule(); return; }
    const { w: W, h: H } = sizeRef.current; viewRef.current = zoomAt(viewRef.current, W, H, W / 2, H / 2, factor); schedule(); updateReadout();
  }
  function reset() {
    if (mode === "3d") { turn.current = { ...START_TURN }; schedule(); return; }
    viewRef.current = { cx: 0, cy: 0, scale: sizeRef.current.w / START_SPAN }; schedule(); updateReadout(); }
  function key(event: ReactKeyboardEvent<HTMLCanvasElement>) {
    if (mode === "3d") {
      const turns: Record<string, [number, number]> = { ArrowLeft: [-0.1, 0], ArrowRight: [0.1, 0], ArrowUp: [0, -0.1], ArrowDown: [0, 0.1] };
      if (turns[event.key]) { turn.current.yaw += turns[event.key][0]; turn.current.pitch = clamp(turn.current.pitch + turns[event.key][1], -1.5, 1.5); }
      else if (event.key === "+" || event.key === "=") zoomBy(1.25);
      else if (event.key === "-") zoomBy(0.8);
      else if (event.key === "0") reset();
      else return;
      event.preventDefault();
      schedule();
      return;
    }
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
      <div className={styles.modes} role="group" aria-label={t("mode")}>
        <button type="button" className={styles.choice} aria-pressed={mode === "2d"} onClick={() => setMode("2d")} data-grapher="mode-2d">{t("mode2d")}</button>
        <button type="button" className={styles.choice} aria-pressed={mode === "3d"} onClick={() => setMode("3d")} data-grapher="mode-3d">{t("mode3d")}</button>
      </div>
      {mode === "3d" ? (
        <ul className={styles.rows}>
          <li className={styles.row3d}>
            <span className={styles.prefix} aria-hidden="true">z =</span>
            <input className={styles.input} value={surfaceText} spellCheck={false} autoComplete="off" autoCapitalize="off" aria-label={t("surfaceExpression")} aria-invalid={!compiledSurface.ok && surfaceText.trim() !== ""} placeholder={t("placeholder3d")} onChange={event => setSurfaceText(event.target.value)} />
            {compiledSurface.ok && <div className={styles.preview} data-grapher="tex"><MathTex tex={`z = ${compiledSurface.tex}`} /></div>}
            {!compiledSurface.ok && surfaceText.trim() !== "" && <p className={styles.error} role="alert">{t(`errors.${compiledSurface.error}`)}</p>}
          </li>
        </ul>
      ) : (
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
      )}
      <div className={styles.actions}>
        {mode === "3d" ? (
          <>
            <button type="button" className={styles.choice} aria-pressed={wire} onClick={() => setWire(on => !on)} data-grapher="wire">{t("wire")}</button>
            <label className={styles.range}>
              <span>{t("range")}</span>
              <input type="range" min={1} max={10} step={1} value={half} aria-label={t("range")} onChange={event => setHalf(Number(event.target.value))} />
              <span className={styles.rangeValue}>±{half}</span>
            </label>
          </>
        ) : (
          <button type="button" className={styles.button} onClick={() => add()} data-grapher="add">{t("add")}</button>
        )}
        <button type="button" className={styles.button} onClick={() => zoomBy(1.25)} aria-label={t("zoomIn")}>＋</button>
        <button type="button" className={styles.button} onClick={() => zoomBy(0.8)} aria-label={t("zoomOut")}>－</button>
        <button type="button" className={styles.button} onClick={reset} data-grapher="reset">{t("reset")}</button>
      </div>
      <canvas ref={canvasRef} className={styles.canvas} tabIndex={0} role="img" aria-label={t(mode === "3d" ? "canvasLabel3d" : "canvasLabel")} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={leave} onKeyDown={key} />
      <p className={styles.readout} role="status" data-grapher="readout">{readout || t(mode === "3d" ? "readoutEmpty3d" : "readoutEmpty")}</p>
      <div className={styles.examples} role="group" aria-label={t("examples")}>
        <span className={styles.examplesLabel}>{t("examples")}</span>
        {mode === "3d"
          ? EXAMPLES_3D.map(example => <button key={example} type="button" className={styles.choice} onClick={() => setSurfaceText(example)}>{example}</button>)
          : EXAMPLES.map(example => <button key={example} type="button" className={styles.choice} onClick={() => add(example)}>{example}</button>)}
      </div>
      <p className={controls.label}>{t(mode === "3d" ? "hint3d" : "hint")}</p>
    </ToolLayout>
  );
}

// The surface: the box and the axes first, then the faces from the far ones to the near ones, each lit by its angle to the light and
// coloured by its height (blue low, red high). With `wire` only the outlines are drawn.
function drawSurface(ctx: CanvasRenderingContext2D, W: number, H: number, palette: Palette, surface: Surface | null, turn: { yaw: number; pitch: number; zoom: number }, wire: boolean) {
  const at = (p: Vec) => project(rotate(p, turn.yaw, turn.pitch), W, H, turn.zoom);
  const line = (a: Vec, b: Vec, style: string, width: number) => {
    const p = at(a), q = at(b);
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
  };
  const zero = surface?.zero ?? 0;
  // The box.
  const corners: Vec[] = [];
  for (const x of [-1, 1]) for (const y of [-HEIGHT, HEIGHT]) for (const z of [-1, 1]) corners.push({ x, y, z });
  for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) {
    const same = (corners[i].x === corners[j].x ? 1 : 0) + (corners[i].y === corners[j].y ? 1 : 0) + (corners[i].z === corners[j].z ? 1 : 0);
    if (same === 2) line(corners[i], corners[j], palette.grid, 1.5);
  }
  // The axes through the origin, at the height where z = 0.
  line({ x: -1, y: zero, z: 0 }, { x: 1, y: zero, z: 0 }, palette.axis, 1.4);
  line({ x: 0, y: zero, z: -1 }, { x: 0, y: zero, z: 1 }, palette.axis, 1.4);
  line({ x: 0, y: -HEIGHT, z: 0 }, { x: 0, y: HEIGHT, z: 0 }, palette.axis, 1.4);
  ctx.fillStyle = palette.text;
  ctx.textAlign = "center";
  const label = (text: string, p: Vec) => { const q = at(p); ctx.fillText(text, q.x, q.y + 5); };
  label("x", { x: 1.12, y: zero, z: 0 });
  label("y", { x: 0, y: zero, z: 1.12 });
  label("z", { x: 0, y: HEIGHT + 0.12, z: 0 });
  if (!surface) return;
  const faces = surface.quads.map(quad => {
    const turned = quad.points.map(p => rotate(p, turn.yaw, turn.pitch));
    let normal = rotate(faceNormal(quad), turn.yaw, turn.pitch);
    // A face is lit from the side the eye is on.
    if (normal.z > 0) normal = { x: -normal.x, y: -normal.y, z: -normal.z };
    const light = 0.3 + 0.7 * Math.max(0, normal.x * LIGHT.x + normal.y * LIGHT.y + normal.z * LIGHT.z);
    return { quad, depth: turned.reduce((sum, p) => sum + p.z, 0) / 4, light };
  }).sort((a, b) => b.depth - a.depth);
  ctx.lineJoin = "round";
  for (const { quad, light } of faces) {
    const hue = 240 * (1 - Math.min(1, Math.max(0, quad.t)));
    const corner = quad.points.map(at);
    ctx.beginPath();
    corner.forEach((p, k) => (k === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    if (wire) {
      ctx.strokeStyle = `hsl(${hue}, 80%, 58%)`;
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      const color = `hsl(${hue}, 72%, ${Math.round(22 + 42 * light)}%)`;
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.8;
      ctx.fill();
      ctx.stroke();
    }
  }
}
