"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import styles from "./puchi.module.css";
import { playClear, playMilestone, playPop } from "./audio";
import { createScene, indexAt, press, pressNext, resize, step, type Scene, type Sound } from "./engine";
import { drawFrame } from "./render";

const ASPECT = 1.05;
const MAX_HEIGHT = 640;
const MAX_SOUNDS_PER_FRAME = 6;
const STORAGE = "puchi:v1";

type Saved = { best: number; sound: boolean };
function load(): Saved {
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE) ?? "null");
    return { best: Number.isFinite(raw?.best) ? raw.best : 0, sound: raw?.sound !== false };
  } catch { return { best: 0, sound: true }; }
}
function save(value: Saved) {
  try { window.localStorage.setItem(STORAGE, JSON.stringify(value)); } catch { /* private window or blocked storage */ }
}
function vibrate(pattern: number | number[]) {
  try { navigator.vibrate?.(pattern); } catch { /* not supported */ }
}

type View = { score: number; pops: number; combo: number; best: number; remaining: number; sheets: number; milestone: number };

export default function Puchi() {
  const t = useTranslations("App.puchi");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<Scene>(createScene(360, 380, Math.random));
  const audioRef = useRef<AudioContext | null>(null);
  const soundRef = useRef(true);
  const lastPoint = useRef(new Map<number, { x: number; y: number }>());
  const lastBuzz = useRef(0);
  const [sound, setSound] = useState(true);
  const [view, setView] = useState<View>({ score: 0, pops: 0, combo: 0, best: 0, remaining: 0, sheets: 1, milestone: 0 });
  soundRef.current = sound;

  useEffect(() => {
    const saved = load();
    sceneRef.current.combo.best = saved.best;
    soundRef.current = saved.sound;
    setSound(saved.sound);
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { sceneRef.current.calm = query.matches; };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    let width = 0;
    const fit = () => {
      const next = Math.round(canvas.clientWidth || 360);
      if (next === width) return;
      width = next;
      const height = Math.round(Math.min(width * ASPECT, MAX_HEIGHT));
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      resize(sceneRef.current, width, height, Math.random);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);

    let frame = 0, last = performance.now(), shown = "", savedBest = sceneRef.current.combo.best, savedAt = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const scene = sceneRef.current;
      const sounds = step(scene, dt, Math.random);
      const context2 = audioRef.current;
      if (context2 && soundRef.current) {
        // Many pops can come in one frame (a rainbow bubble): the first few sound, and a milestone or a clear always does.
        let played = 0;
        for (const item of sounds as Sound[]) {
          if (item.type === "pop") { if (played++ < MAX_SOUNDS_PER_FRAME) playPop(context2, item.combo, item.chain, item.kind); }
          else if (item.type === "milestone") playMilestone(context2, item.value);
          else playClear(context2);
        }
      }
      if (sounds.length && now - lastBuzz.current > 45) {
        lastBuzz.current = now;
        vibrate(sounds.some(s => s.type === "milestone") ? [15, 30, 15] : 7);
      }
      drawFrame(context, scene);
      const next: View = { score: scene.score, pops: scene.pops, combo: scene.combo.count, best: scene.combo.best, remaining: scene.sheet.remaining, sheets: scene.sheets, milestone: scene.milestone?.value ?? 0 };
      const key = `${next.score}|${next.pops}|${next.combo}|${next.best}|${next.remaining}|${next.sheets}|${next.milestone}`;
      if (key !== shown) { shown = key; setView(next); }
      if (next.best > savedBest && now - savedAt > 800) { savedBest = next.best; savedAt = now; save({ best: next.best, sound: soundRef.current }); }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      save({ best: sceneRef.current.combo.best, sound: soundRef.current });
    };
  }, []);

  useEffect(() => () => { void audioRef.current?.close(); }, []);

  // The audio context is made on a tap: browsers allow sound only after a gesture.
  function wake() {
    if (!soundRef.current) return;
    if (!audioRef.current) audioRef.current = new AudioContext();
    if (audioRef.current.state === "suspended") void audioRef.current.resume();
  }

  function at(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * sceneRef.current.width, y: ((event.clientY - rect.top) / rect.height) * sceneRef.current.height };
  }

  // Pops every bubble on the way from the last point to this one, so that a quick swipe does not skip any.
  function sweep(from: { x: number; y: number }, to: { x: number; y: number }) {
    const scene = sceneRef.current;
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const stepsCount = Math.max(1, Math.ceil(distance / (scene.sheet.layout.cell / 3)));
    for (let i = 1; i <= stepsCount; i++) {
      const x = from.x + ((to.x - from.x) * i) / stepsCount, y = from.y + ((to.y - from.y) * i) / stepsCount;
      const index = indexAt(scene.sheet.layout, x, y);
      if (index >= 0) press(scene, index);
    }
  }

  function down(event: ReactPointerEvent<HTMLCanvasElement>) {
    wake();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = at(event);
    lastPoint.current.set(event.pointerId, point);
    sweep(point, point);
  }
  function move(event: ReactPointerEvent<HTMLCanvasElement>) {
    const from = lastPoint.current.get(event.pointerId);
    if (!from) return;
    const point = at(event);
    lastPoint.current.set(event.pointerId, point);
    sweep(from, point);
  }
  function up(event: ReactPointerEvent<HTMLCanvasElement>) { lastPoint.current.delete(event.pointerId); }

  function key(event: ReactKeyboardEvent<HTMLCanvasElement>) {
    if (event.key === " " || event.key === "Enter") { event.preventDefault(); wake(); pressNext(sceneRef.current); }
  }

  function toggleSound() {
    const next = !sound;
    soundRef.current = next;
    setSound(next);
    if (next) wake();
    save({ best: sceneRef.current.combo.best, sound: next });
  }

  function newSheet() {
    const scene = sceneRef.current;
    resize(scene, scene.width, scene.height, Math.random);
  }

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <dl className={styles.hud}>
        <div><dt>{t("score")}</dt><dd data-puchi="score">{view.score.toLocaleString()}</dd></div>
        <div><dt>{t("pops")}</dt><dd data-puchi="pops">{view.pops.toLocaleString()}</dd></div>
        <div><dt>{t("remaining")}</dt><dd data-puchi="remaining">{view.remaining}</dd></div>
        <div><dt>{t("best")}</dt><dd data-puchi="best">{view.best}</dd></div>
      </dl>
      <div className={styles.stage}>
        <div className={styles.combo} aria-hidden="true">
          {view.combo >= 2 && <span key={view.combo} data-puchi="combo" className={styles.comboNumber}>{view.combo}<small>{t("combo")}</small></span>}
        </div>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          tabIndex={0}
          role="img"
          aria-label={t("canvasLabel")}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onKeyDown={key}
        />
        <p className={styles.visuallyHidden} role="status" aria-live="polite">{view.milestone ? t("milestone", { count: view.milestone }) : ""}</p>
      </div>
      <div className={styles.buttons}>
        <button type="button" className="auth-link" aria-pressed={sound} onClick={toggleSound} data-puchi="sound">{t("sound")}: {sound ? t("on") : t("off")}</button>
        <button type="button" className="auth-link" onClick={newSheet} data-puchi="new">{t("newSheet")}</button>
      </div>
      <p className={styles.hint}>{t("hint")}</p>
    </ToolLayout>
  );
}
