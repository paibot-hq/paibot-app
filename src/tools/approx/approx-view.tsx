"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import styles from "./approx-view.module.css";
import { METHODS, TARGETS, TARGET_IDS, createNet, fourierBest, fourierEval, hiddenFor, lesson, mulberry32, netEval, netSize, rms, taylorEval, taylorTerms, train, winner, type Coefficient, type Method, type Net, type Term, type TargetId } from "./approx";

const COLORS: Record<Method, string> = { taylor: "#f5a623", fourier: "#3b82f6", network: "#22c55e" };
const STEPS_PER_FRAME = 12;

type Errors = Record<Method, number | null>;
type Model = { terms: Term[] | null; coefficients: Coefficient[]; net: Net; lessonData: ReturnType<typeof lesson> };

export default function Approx() {
  const t = useTranslations("App.approx");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const model = useRef<Model | null>(null);
  const [target, setTarget] = useState<TargetId>("runge");
  const [budget, setBudget] = useState(16);
  const [shown, setShown] = useState<Record<Method, boolean>>({ taylor: true, fourier: true, network: true });
  const [running, setRunning] = useState(true);
  const [generation, setGeneration] = useState(0);
  const [steps, setSteps] = useState(0);
  const [errors, setErrors] = useState<Errors>({ taylor: null, fourier: null, network: null });
  const live = useRef({ target, budget, shown, running });
  live.current = { target, budget, shown, running };

  // Each method is built again when the target or the budget changes (or the network's training is restarted).
  useEffect(() => {
    const spec = TARGETS[target];
    model.current = {
      terms: taylorTerms(spec, budget),
      coefficients: fourierBest(spec.f, spec.half, budget),
      net: createNet(hiddenFor(budget), mulberry32(1 + generation)),
      lessonData: lesson(spec),
    };
    setSteps(0);
  }, [target, budget, generation]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let frame = 0, lastStats = 0;
    const loop = (now: number) => {
      const m = model.current;
      const { target: id, shown: visible, running: training } = live.current;
      const spec = TARGETS[id];
      if (m) {
        if (training) for (let i = 0; i < STEPS_PER_FRAME; i++) train(m.net, m.lessonData.xs, m.lessonData.ts);
        const functions: Record<Method, ((x: number) => number) | null> = {
          taylor: m.terms ? (x => taylorEval(m.terms as Term[], x)) : null,
          fourier: x => fourierEval(m.coefficients, spec.half, x),
          network: x => netEval(m.net, x / spec.half) * m.lessonData.scale,
        };
        draw(canvas, spec, functions, visible);
        if (now - lastStats > 200) {
          lastStats = now;
          setSteps(m.net.steps);
          setErrors({ taylor: functions.taylor ? rms(spec.f, functions.taylor, spec.half) : null, fourier: rms(spec.f, functions.fourier as (x: number) => number, spec.half), network: rms(spec.f, functions.network as (x: number) => number, spec.half) });
        }
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  const best = winner(errors);
  const taylorCount = model.current?.terms?.length ?? 0;
  const fourierCount = model.current?.coefficients.length ?? 0;
  const format = (e: number | null) => (e === null ? "—" : !Number.isFinite(e) ? "∞" : e >= 1000 ? e.toExponential(1).replace("e+", "e") : e < 0.0001 ? e.toExponential(1).replace("e-", "e−") : e.toFixed(4));
  // A bar on a log scale: 0.001 is nothing, 10 is the whole width.
  const bar = (e: number | null) => (e === null || !Number.isFinite(e) ? 100 : Math.max(1.5, Math.min(100, ((Math.log10(Math.max(e, 1e-12)) + 3) / 4) * 100)));
  const hidden = hiddenFor(budget);

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <div className={styles.targets} role="group" aria-label={t("target")}>
        {TARGET_IDS.map(id => <button key={id} type="button" className={styles.choice} aria-pressed={target === id} onClick={() => setTarget(id)}>{t(`targets.${id}`)}</button>)}
      </div>
      <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label={t("canvasLabel", { name: t(`targets.${target}`) })} />
      <div className={styles.legend} role="group" aria-label={t("curves")}>
        <span className={styles.original}>{t("original")}</span>
        {METHODS.map(m => (
          <button key={m} type="button" className={styles.toggle} aria-pressed={shown[m]} onClick={() => setShown(s => ({ ...s, [m]: !s[m] }))} style={{ ["--color" as string]: COLORS[m] }}>
            {t(`methods.${m}`)}
          </button>
        ))}
      </div>
      <label className={styles.slider}>
        <span>{t("budget")}</span>
        <input type="range" min={4} max={61} step={1} value={budget} aria-label={t("budget")} onChange={event => setBudget(Number(event.target.value))} />
        <span className={styles.value}>{budget}</span>
      </label>
      <p className={styles.budgetNote}>{t("budgetNote", { taylor: taylorCount, fourier: fourierCount, hidden, params: netSize(hidden) })}</p>
      <div className={styles.controls}>
        <button className="auth-link" type="button" aria-pressed={running} onClick={() => setRunning(on => !on)} data-approx="train">{running ? t("training") : t("paused")}</button>
        <button type="button" className={styles.button} onClick={() => setGeneration(g => g + 1)} data-approx="restart">{t("restart")}</button>
        <span className={styles.steps} data-approx="steps">{t("steps", { n: steps })}</span>
      </div>
      <table className={styles.table} data-approx="table" data-winner={best ?? ""}>
        <thead><tr><th>{t("method")}</th><th>{t("numbers")}</th><th>{t("error")}</th><th aria-hidden="true" /></tr></thead>
        <tbody>
          {METHODS.map(m => {
            const count = m === "taylor" ? taylorCount : m === "fourier" ? fourierCount : netSize(hidden);
            return (
              <tr key={m} data-method={m} data-best={best === m}>
                <th scope="row"><span className={styles.swatch} style={{ background: COLORS[m] }} />{t(`methods.${m}`)}{best === m && <span className={styles.crown}>{t("winner")}</span>}</th>
                <td>{m === "taylor" && taylorCount === 0 ? "—" : count}</td>
                <td className={styles.errorCell} data-error={m}>{m === "taylor" && errors.taylor === null ? t("noTaylor") : format(errors[m])}</td>
                <td className={styles.barCell}><span className={styles.bar} style={{ width: `${bar(errors[m])}%`, background: COLORS[m], opacity: errors[m] === null ? 0.2 : 1 }} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className={styles.note}>{t(`notes.${target}`)}</p>
      <details className={styles.how}>
        <summary>{t("howTitle")}</summary>
        <p>{t("howTaylor")}</p>
        <p>{t("howFourier")}</p>
        <p>{t("howNetwork")}</p>
      </details>
    </ToolLayout>
  );
}

function draw(canvas: HTMLCanvasElement, spec: (typeof TARGETS)[TargetId], functions: Record<Method, ((x: number) => number) | null>, shown: Record<Method, boolean>) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) { canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr); }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = rect.width, H = rect.height;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const dark = document.documentElement.dataset.theme === "dark";
  const palette = dark ? { bg: "#0b1020", grid: "rgba(255,255,255,0.08)", axis: "rgba(255,255,255,0.5)", text: "rgba(255,255,255,0.7)", target: "#ffffff" } : { bg: "#ffffff", grid: "rgba(0,0,0,0.08)", axis: "rgba(0,0,0,0.55)", text: "rgba(0,0,0,0.65)", target: "#111111" };
  const { half, view } = spec;
  const sx = (x: number) => ((x + half) / (2 * half)) * W;
  const sy = (y: number) => H - ((y - view.yMin) / (view.yMax - view.yMin)) * H;
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.font = "12px system-ui, sans-serif";
  const step = half > 5 ? 2 : 1;
  ctx.lineWidth = 1;
  for (let x = Math.ceil(-half / step) * step; x <= half + 1e-9; x += step) {
    ctx.strokeStyle = palette.grid; ctx.beginPath(); ctx.moveTo(Math.round(sx(x)) + 0.5, 0); ctx.lineTo(Math.round(sx(x)) + 0.5, H); ctx.stroke();
    if (Math.abs(x) > 1e-9) { ctx.fillStyle = palette.text; ctx.textAlign = "center"; ctx.fillText(String(x), sx(x), Math.min(H - 4, sy(0) + 14)); }
  }
  const ystep = (view.yMax - view.yMin) > 10 ? 5 : 1;
  for (let y = Math.ceil(view.yMin / ystep) * ystep; y <= view.yMax; y += ystep) {
    ctx.strokeStyle = palette.grid; ctx.beginPath(); ctx.moveTo(0, Math.round(sy(y)) + 0.5); ctx.lineTo(W, Math.round(sy(y)) + 0.5); ctx.stroke();
    if (Math.abs(y) > 1e-9) { ctx.fillStyle = palette.text; ctx.textAlign = "left"; ctx.fillText(String(y), sx(0) + 4, sy(y) - 3); }
  }
  ctx.strokeStyle = palette.axis; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(0, Math.round(sy(0)) + 0.5); ctx.lineTo(W, Math.round(sy(0)) + 0.5); ctx.moveTo(Math.round(sx(0)) + 0.5, 0); ctx.lineTo(Math.round(sx(0)) + 0.5, H); ctx.stroke();
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  ctx.lineJoin = "round";
  const curve = (f: (x: number) => number, color: string, width: number, jumps: boolean) => {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
    let previous: number | null = null;
    for (let px = 0; px <= W; px += 1) {
      const x = -half + (2 * half * px) / W;
      const y = f(x);
      const py = sy(y);
      if (!Number.isFinite(y) || Math.abs(py) > H * 30) { previous = null; continue; }
      if (previous === null || (jumps && Math.abs(py - previous) > H * 0.4)) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      previous = py;
    }
    ctx.stroke();
  };
  curve(spec.f, palette.target, 3, true);
  for (const m of METHODS) { const f = functions[m]; if (f && shown[m]) curve(f, COLORS[m], 2.4, false); }
  ctx.restore();
}
