"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import styles from "./glitch-view.module.css";
import { GLITCHES, MODES, drawCells, invert, nextSegment, planGlitches, scanLines, slipRows, soften, splitColours, type Glitch, type Intensity, type Mode, type Segment } from "./glitch";
import { GlitchSound } from "./glitch-sound";

const WIDTH = 640;
const HEIGHT = 480;
// The scenes are drawn on a coarse grid of cells, blown up without smoothing, as in the video.
const CELL = 8;
const FPS = 24;

type Settings = { mode: Mode | null; intensity: Intensity; glitches: ReadonlySet<Glitch> };
const DEFAULTS: Settings = { mode: null, intensity: "mild", glitches: new Set(GLITCHES) };

const FACES = ["normal", "wow", "think", "happy"] as const;

// The PAIBOT robot, as in the site's icon: a blue rounded square with two white eyes.
function drawRobot(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, face: (typeof FACES)[number], look: number) {
  ctx.fillStyle = "#4f86b6";
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, size * 0.25);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = size * 0.042;
  for (const side of [-1, 1]) {
    const cx = x + size / 2 + side * size * 0.125 + look * size * 0.03;
    const cy = y + size / 2;
    const r = size * 0.081;
    ctx.beginPath();
    if (face === "happy") ctx.arc(cx, cy + r * 0.6, r * 1.1, Math.PI * 1.15, Math.PI * 1.85);
    else if (face === "wow") ctx.ellipse(cx, cy, r * 1.3, r * 1.38, 0, 0, Math.PI * 2);
    else if (face === "think") ctx.ellipse(cx, cy, r, side < 0 ? r : r * 0.72, 0, 0, Math.PI * 2);
    else ctx.arc(cx, cy, r, 0, Math.PI * 2);
    if (face === "happy") ctx.stroke(); else ctx.fill();
  }
}

export default function GlitchNoise() {
  const t = useTranslations("App.glitch");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [running, setRunning] = useState(false);
  const [sound, setSound] = useState(false);
  const settingsRef = useRef(settings);
  const runningRef = useRef(running);
  const soundRef = useRef<GlitchSound | null>(null);
  // A change of scene or intensity starts a new scene at once.
  const restartRef = useRef(false);
  settingsRef.current = settings;
  runningRef.current = running;
  const change = (patch: Partial<Settings>) => { restartRef.current = true; setSettings(current => ({ ...current, ...patch })); };

  // Moves by itself unless the visitor has asked for less motion.
  useEffect(() => { setRunning(!matchMedia("(prefers-reduced-motion: reduce)").matches); }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx) return;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const gw = WIDTH / CELL, gh = HEIGHT / CELL;
    const grid = document.createElement("canvas");
    grid.width = gw;
    grid.height = gh;
    const gridCtx = grid.getContext("2d")!;
    const cells = gridCtx.createImageData(gw, gh);
    let segment: Segment | null = null;
    let clock = 0, last = 0, drawn = -Infinity, frame = 0, lastInvert = -Infinity;
    let previous: Uint8ClampedArray | null = null;
    let request = 0;

    const draw = () => {
      const now = settingsRef.current;
      if (!segment || clock >= segment.end || restartRef.current) {
        restartRef.current = false;
        segment = nextSegment(Math.random, clock, now.intensity, now.mode);
        canvas.dataset.mode = segment.mode;
        soundRef.current?.scene(segment, now.intensity);
      }
      const rgb = drawCells(segment, now.intensity, clock - segment.start, frame++, gw, gh);
      for (let i = 0, j = 0; i < rgb.length; i += 3, j += 4) {
        cells.data[j] = rgb[i]; cells.data[j + 1] = rgb[i + 1]; cells.data[j + 2] = rgb[i + 2]; cells.data[j + 3] = 255;
      }
      gridCtx.putImageData(cells, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(grid, 0, 0, WIDTH, HEIGHT);
      const plan = planGlitches(Math.random, now.glitches, now.intensity, WIDTH, HEIGHT, clock, lastInvert);
      // The robot fills the static of the signal scene, and now and then slips into the others.
      if (segment.mode === "signal" || plan.robot) {
        const [low, high] = segment.mode === "signal" ? [0.25, 0.7] : [0.2, 0.5];
        const size = WIDTH * (low + Math.random() * (high - low));
        drawRobot(ctx, (Math.random() * 1.1 - 0.1) * (WIDTH - size * 0.5), Math.random() * (HEIGHT - size), size, FACES[Math.floor(Math.random() * 4)], Math.random() * 2 - 1);
      }
      const image = ctx.getImageData(0, 0, WIDTH, HEIGHT);
      const data = image.data;
      for (const slip of plan.slips) slipRows(data, WIDTH, slip.y, slip.rows, slip.dx);
      if (plan.split) splitColours(data, WIDTH, plan.split);
      if (plan.invert) { invert(data); lastInvert = clock; }
      if (plan.scan) scanLines(data, WIDTH);
      if (now.intensity === "mild") {
        soften(data);
        // Blended with the frame before, so it flickers less.
        if (previous) for (let i = 0; i < data.length; i++) data[i] = data[i] * 0.55 + previous[i] * 0.45;
        previous = data.slice();
      } else previous = null;
      ctx.putImageData(image, 0, 0);
    };

    const loop = (time: number) => {
      request = requestAnimationFrame(loop);
      const dt = last ? Math.min(0.1, (time - last) / 1000) : 0;
      last = time;
      if (!runningRef.current) return;
      clock += dt;
      if (time - drawn < 1000 / FPS - 2) return;
      drawn = time;
      draw();
    };
    draw();
    request = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(request);
  }, []);

  function toggleSound() {
    if (soundRef.current) { soundRef.current.close(); soundRef.current = null; setSound(false); return; }
    soundRef.current = new GlitchSound();
    setSound(true);
  }
  // No sound while stopped, and none after the page is left.
  useEffect(() => { if (!running && soundRef.current) { soundRef.current.close(); soundRef.current = null; setSound(false); } }, [running]);
  useEffect(() => () => soundRef.current?.close(), []);

  const toggleGlitch = (glitch: Glitch) => {
    const next = new Set(settings.glitches);
    if (next.has(glitch)) next.delete(glitch); else next.add(glitch);
    setSettings(current => ({ ...current, glitches: next }));
  };
  const wild = settings.intensity === "wild";

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label={t("canvasLabel")} />
      <div className={styles.buttons}>
        <button className="auth-link" type="button" aria-pressed={running} onClick={() => setRunning(on => !on)} data-glitch="run">{running ? t("stop") : t("start")}</button>
        <button className={styles.button} type="button" aria-pressed={sound} onClick={toggleSound} disabled={!running} data-glitch="sound">{sound ? t("soundOff") : t("soundOn")}</button>
      </div>
      <div className={styles.panel}>
        <div className={styles.row} role="group" aria-label={t("scene")}>
          <span className={styles.name}>{t("scene")}</span>
          <span className={styles.group}>
            <button type="button" className={styles.choice} aria-pressed={settings.mode === null} onClick={() => change({ mode: null })} data-glitch-mode="auto">{t("modes.auto")}</button>
            {MODES.map(mode => <button key={mode} type="button" className={styles.choice} aria-pressed={settings.mode === mode} onClick={() => change({ mode })} data-glitch-mode={mode}>{t(`modes.${mode}`)}</button>)}
          </span>
        </div>
        <div className={styles.row} role="group" aria-label={t("glitch")}>
          <span className={styles.name}>{t("glitch")}</span>
          <span className={styles.group}>
            {GLITCHES.map(glitch => <button key={glitch} type="button" className={styles.choice} aria-pressed={settings.glitches.has(glitch)} disabled={!wild && (glitch === "invert" || glitch === "scan")} onClick={() => toggleGlitch(glitch)}>{t(`glitches.${glitch}`)}</button>)}
          </span>
        </div>
        <div className={styles.row} role="group" aria-label={t("intensity")}>
          <span className={styles.name}>{t("intensity")}</span>
          <span className={styles.group}>
            {(["mild", "wild"] as const).map(intensity => <button key={intensity} type="button" className={styles.choice} aria-pressed={settings.intensity === intensity} onClick={() => change({ intensity })} data-glitch-intensity={intensity}>{t(`intensities.${intensity}`)}</button>)}
          </span>
        </div>
      </div>
      {wild && <p className={styles.warning} role="note">{t("warning")}</p>}
      <p className={styles.hint}>{t("hint")}</p>
    </ToolLayout>
  );
}
