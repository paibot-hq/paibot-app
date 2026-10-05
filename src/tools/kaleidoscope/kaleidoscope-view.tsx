"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import styles from "./kaleidoscope-view.module.css";
import { COLOR_MODES, autoPoint, copies, hueFor, lightnessFor, saturationFor, type ColorMode, type Point } from "./kaleidoscope";

const BACKGROUND = "#0b1020";
const SIZE = 640;

type Settings = { segments: number; mirror: boolean; size: number; color: ColorMode; fade: boolean };
const DEFAULTS: Settings = { segments: 8, mirror: true, size: 6, color: "rainbow", fade: false };

export default function Kaleidoscope() {
  const t = useTranslations("App.kaleidoscope");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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
  function stroke(from: Point, to: Point) {
    const ctx = context();
    if (!ctx) return;
    const now = settingsRef.current;
    travelled.current += Math.hypot(to.x - from.x, to.y - from.y);
    const centre = { x: SIZE / 2, y: SIZE / 2 };
    const a = copies(from, centre, now.segments, now.mirror);
    const b = copies(to, centre, now.segments, now.mirror);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = now.size;
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `hsla(${hueFor(now.color, travelled.current)}, ${saturationFor(now.color)}%, ${lightnessFor(now.color)}%, 0.85)`;
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
    const loop = (now: number) => {
      const ctx = canvas.getContext("2d");
      if (ctx && settingsRef.current.fade) {
        // Everything slowly melts into the background, so the pattern keeps changing.
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
      <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label={t("canvasLabel")} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
      <div className={styles.buttons}>
        <button className="auth-link" type="button" aria-pressed={auto} onClick={() => setAuto(on => !on)} data-kaleidoscope="auto">{auto ? t("autoOn") : t("autoOff")}</button>
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
          </span>
        </div>
      </div>
      <p className={controls.label}>{t("hint")}</p>
    </ToolLayout>
  );
}
