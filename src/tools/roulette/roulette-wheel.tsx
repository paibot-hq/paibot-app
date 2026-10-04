"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import form from "../../components/tool-form.module.css";
import styles from "./roulette-wheel.module.css";
import { colour, ease, parseItems, pick, segmentAt, stopAngle } from "./wheel";

const SPIN_MS = 4800;

function randomWord(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

// The wheel, with segment 0 starting at the top and going clockwise; `rotation` is how far it has turned clockwise.
function draw(canvas: HTMLCanvasElement, items: string[], rotation: number) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const size = canvas.width;
  const radius = size / 2 - size * 0.04;
  const centre = size / 2;
  context.clearRect(0, 0, size, size);
  const count = Math.max(1, items.length);
  const arc = (Math.PI * 2) / count;
  const start = -Math.PI / 2 + (rotation * Math.PI) / 180;
  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.25)";
  context.shadowBlur = size * 0.03;
  context.beginPath();
  context.arc(centre, centre, radius, 0, Math.PI * 2);
  context.fillStyle = "#fff";
  context.fill();
  context.restore();
  for (let i = 0; i < count; i++) {
    const from = start + i * arc;
    context.beginPath();
    context.moveTo(centre, centre);
    context.arc(centre, centre, radius, from, from + arc);
    context.closePath();
    context.fillStyle = items.length ? colour(i, count) : "#8a97a6";
    context.fill();
    context.strokeStyle = "rgba(255, 255, 255, 0.9)";
    context.lineWidth = Math.max(1.5, size * 0.004);
    context.stroke();
    if (!items[i]) continue;
    context.save();
    context.translate(centre, centre);
    context.rotate(from + arc / 2);
    context.textAlign = "right";
    context.textBaseline = "middle";
    context.fillStyle = "#0c1320";
    let font = Math.min(size * 0.06, (radius * arc) * 0.55);
    context.font = `600 ${font}px system-ui, sans-serif`;
    const room = radius * 0.78;
    let label = items[i];
    while (context.measureText(label).width > room && label.length > 1) label = label.slice(0, -1);
    if (label !== items[i]) label = `${label.slice(0, -1)}…`;
    font = Math.max(font, 9);
    context.fillText(label, radius * 0.93, 0);
    context.restore();
  }
  context.beginPath();
  context.arc(centre, centre, size * 0.05, 0, Math.PI * 2);
  context.fillStyle = "#fff";
  context.shadowColor = "rgba(0, 0, 0, 0.3)";
  context.shadowBlur = size * 0.015;
  context.fill();
  context.shadowBlur = 0;
  // The pointer, at the top, pointing at the wheel.
  context.beginPath();
  context.moveTo(centre, size * 0.085);
  context.lineTo(centre - size * 0.035, 0);
  context.lineTo(centre + size * 0.035, 0);
  context.closePath();
  context.fillStyle = "#e2453c";
  context.fill();
}

export default function RouletteWheel() {
  const t = useTranslations("App.roulette");
  const [text, setText] = useState(t("defaultItems"));
  const [removeWinner, setRemoveWinner] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rotation = useRef(0);
  const frame = useRef(0);
  const items = useMemo(() => parseItems(text), [text]);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fit = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const side = Math.round((canvas.clientWidth || 420) * ratio);
      if (canvas.width !== side) { canvas.width = side; canvas.height = side; }
      draw(canvas, itemsRef.current, rotation.current);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (canvasRef.current && !spinning) draw(canvasRef.current, items, rotation.current);
  }, [items, spinning]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  function spin() {
    if (spinning || items.length < 2) return;
    const index = pick(items.length, randomWord);
    const turns = 5 + (randomWord() % 3);
    const offset = randomWord() / 4294967296 - 0.5;
    const from = rotation.current;
    const target = stopAngle(index, items.length, 0, offset);
    const extra = turns * 360 + ((target - (from % 360)) % 360 + 360) % 360;
    const began = performance.now();
    const names = items;
    setSpinning(true);
    setResult("");
    const tick = (now: number) => {
      const progress = Math.min(1, (now - began) / SPIN_MS);
      rotation.current = from + extra * ease(progress);
      if (canvasRef.current) draw(canvasRef.current, names, rotation.current);
      if (progress < 1) { frame.current = requestAnimationFrame(tick); return; }
      const winner = names[segmentAt(rotation.current, names.length)];
      setResult(winner);
      setHistory(list => [winner, ...list].slice(0, 12));
      setSpinning(false);
      if (removeWinner) setText(names.filter(name => name !== winner).join("\n"));
    };
    frame.current = requestAnimationFrame(tick);
  }

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <canvas ref={canvasRef} className={styles.wheel} role="img" aria-label={t("wheelLabel", { items: items.join(", ") })} />
      <div className={styles.actions}>
        <button className="auth-link" type="button" onClick={spin} disabled={spinning || items.length < 2} data-roulette="spin">{spinning ? t("spinning") : t("spin")}</button>
      </div>
      <p className={styles.result} aria-live="polite" data-roulette="result">{items.length < 2 ? t("needTwo") : result ? t("winner", { name: result }) : " "}</p>
      <div className={form.panel}>
        <label className={form.row}>
          <span className={form.name}>{t("itemsLabel")}</span>
          <textarea className={`${form.input} ${styles.items}`} rows={6} value={text} onChange={event => setText(event.target.value)} aria-label={t("itemsLabel")} disabled={spinning} />
        </label>
        <label className={form.row}>
          <span className={form.name}>{t("removeLabel")}</span>
          <input type="checkbox" checked={removeWinner} onChange={event => setRemoveWinner(event.target.checked)} aria-label={t("removeLabel")} />
        </label>
      </div>
      {history.length > 0 && (
        <section className={form.summary} aria-label={t("historyLabel")}>
          <ol className={styles.history}>{history.map((name, index) => <li key={`${index}-${name}`}>{name}</li>)}</ol>
        </section>
      )}
      <p className={form.hint}>{t("note")}</p>
    </ToolLayout>
  );
}
