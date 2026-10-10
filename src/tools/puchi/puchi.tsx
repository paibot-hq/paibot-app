"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useLocale, useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import styles from "./puchi.module.css";
import { playClear, playCrack, playEnd, playFever, playGo, playMilestone, playPop, playTick, playTime } from "./audio";
import { begin, createScene, dailySeed, feverMult, indexAt, prepare, press, pressNext, rankFor, resize, step, type Mode, type Phase, type Scene, type Sound } from "./engine";
import { drawFrame } from "./render";

const MAX_SOUNDS_PER_FRAME = 6;
const STORAGE = "puchi:v2";
const MODES: Mode[] = ["free", "timed", "daily"];
const MODE_KEYS = { free: "modeFree", timed: "modeTimed", daily: "modeDaily" } as const;

type Saved = { best: number; sound: boolean; timed: number; daily: { date: string; score: number } };
const EMPTY: Saved = { best: 0, sound: true, timed: 0, daily: { date: "", score: 0 } };
function load(): Saved {
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE) ?? "null");
    return {
      best: Number.isFinite(raw?.best) ? raw.best : 0, sound: raw?.sound !== false, timed: Number.isFinite(raw?.timed) ? raw.timed : 0,
      daily: typeof raw?.daily?.date === "string" && Number.isFinite(raw.daily.score) ? raw.daily : EMPTY.daily,
    };
  } catch { return EMPTY; }
}
function save(value: Saved) {
  try { window.localStorage.setItem(STORAGE, JSON.stringify(value)); } catch { /* private window or blocked storage */ }
}
function vibrate(pattern: number | number[]) {
  try { navigator.vibrate?.(pattern); } catch { /* not supported */ }
}

type Result = { mode: Mode; score: number; pops: number; combo: number; rank: string; newBest: boolean; best: number };
type View = { score: number; pops: number; combo: number; best: number; remaining: number; milestone: number; phase: Phase; countdown: number; timeLeft: number; fever: number; feverLeft: number };
const START_VIEW: View = { score: 0, pops: 0, combo: 0, best: 0, remaining: 0, milestone: 0, phase: "playing", countdown: 3, timeLeft: 0, fever: 1, feverLeft: 0 };

export default function Puchi() {
  const t = useTranslations("App.puchi");
  const locale = useLocale();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<Scene>(createScene(360, 360, Math.random));
  const audioRef = useRef<AudioContext | null>(null);
  const soundRef = useRef(true);
  const savedRef = useRef<Saved>(EMPTY);
  const lastPoint = useRef(new Map<number, { x: number; y: number }>());
  const lastBuzz = useRef(0);
  const [sound, setSound] = useState(true);
  const [mode, setMode] = useState<Mode>("free");
  const [view, setView] = useState<View>(START_VIEW);
  const [result, setResult] = useState<Result | null>(null);
  const [shared, setShared] = useState("");
  soundRef.current = sound;
  const modeRef = useRef<Mode>("free");
  modeRef.current = mode;

  useEffect(() => {
    const saved = load();
    savedRef.current = saved;
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
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(width * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      resize(sceneRef.current, width, width, Math.random);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);

    let frame = 0, last = performance.now(), shown = "", savedAt = 0, phaseBefore: Phase = "playing";
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const scene = sceneRef.current;
      const sounds = step(scene, dt, Math.random);
      const audio = audioRef.current;
      if (audio && soundRef.current) {
        // Many pops can come in one frame (a rainbow bubble): the first few sound, and every other sound always does.
        let played = 0;
        for (const item of sounds as Sound[]) {
          switch (item.type) {
            case "pop": if (played++ < MAX_SOUNDS_PER_FRAME) playPop(audio, item.combo, item.chain, item.kind); break;
            case "crack": playCrack(audio); break;
            case "time": playTime(audio); break;
            case "fever": playFever(audio); break;
            case "milestone": playMilestone(audio, item.value); break;
            case "clear": playClear(audio); break;
            case "tick": playTick(audio, item.n); break;
            case "go": playGo(audio); break;
            case "end": playEnd(audio); break;
          }
        }
      }
      if (sounds.length && now - lastBuzz.current > 45) {
        lastBuzz.current = now;
        vibrate(sounds.some(s => s.type === "milestone" || s.type === "end") ? [15, 30, 15] : 7);
      }
      drawFrame(context, scene);

      // The run ended: the result, and the best score if it is one.
      if (scene.phase === "over" && phaseBefore !== "over") {
        const saved = savedRef.current;
        const today = dailySeed(new Date());
        const previous = scene.mode === "daily" ? (saved.daily.date === today ? saved.daily.score : 0) : saved.timed;
        const newBest = scene.score > previous;
        if (newBest) { if (scene.mode === "daily") saved.daily = { date: today, score: scene.score }; else saved.timed = scene.score; }
        save({ ...saved, best: scene.combo.best, sound: soundRef.current });
        setResult({ mode: scene.mode, score: scene.score, pops: scene.pops, combo: scene.runBest, rank: rankFor(scene.score), newBest, best: Math.max(previous, scene.score) });
      }
      phaseBefore = scene.phase;

      const saved = savedRef.current;
      const today = dailySeed(new Date());
      const bestScore = scene.mode === "daily" ? (saved.daily.date === today ? saved.daily.score : 0) : saved.timed;
      const next: View = {
        score: scene.score, pops: scene.pops, combo: scene.combo.count, best: scene.mode === "free" ? scene.combo.best : bestScore, remaining: scene.sheet.remaining,
        milestone: scene.milestone?.value ?? 0, phase: scene.phase, countdown: Math.max(1, Math.ceil(scene.countdown)), timeLeft: Math.floor(scene.timeLeft * 10) / 10,
        fever: feverMult(scene), feverLeft: scene.fever ? Math.max(0, Math.ceil((scene.fever.until - scene.time) * 10) / 10) : 0,
      };
      const key = JSON.stringify(next);
      if (key !== shown) { shown = key; setView(next); }
      if (scene.combo.best !== saved.best && now - savedAt > 800) { savedAt = now; saved.best = scene.combo.best; save({ ...saved, sound: soundRef.current }); }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      save({ ...savedRef.current, best: sceneRef.current.combo.best, sound: soundRef.current });
    };
  }, []);

  useEffect(() => () => { void audioRef.current?.close(); }, []);

  // The audio context is made on a tap: browsers allow sound only after a gesture.
  function wake() {
    if (!soundRef.current) return;
    if (!audioRef.current) audioRef.current = new AudioContext();
    if (audioRef.current.state === "suspended") void audioRef.current.resume();
  }

  function choose(next: Mode) {
    setMode(next); setResult(null); setShared("");
    prepare(sceneRef.current, next, Math.random, dailySeed(new Date()));
  }
  function start() {
    wake();
    setResult(null); setShared("");
    if (sceneRef.current.phase === "over") prepare(sceneRef.current, modeRef.current, Math.random, dailySeed(new Date()));
    begin(sceneRef.current);
  }

  function at(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * sceneRef.current.width, y: ((event.clientY - rect.top) / rect.height) * sceneRef.current.height };
  }

  // Pops every bubble on the way from the last point to this one, so that a quick swipe does not skip any.
  function sweep(from: { x: number; y: number }, to: { x: number; y: number }) {
    const scene = sceneRef.current;
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const count = Math.max(1, Math.ceil(distance / (scene.sheet.layout.cell / 3)));
    let previous = -1;
    for (let i = 1; i <= count; i++) {
      const x = from.x + ((to.x - from.x) * i) / count, y = from.y + ((to.y - from.y) * i) / count;
      const index = indexAt(scene.sheet.layout, x, y);
      // Ice takes two taps, so a swipe that stays in one bubble for several samples must not count as two.
      if (index >= 0 && index !== previous) press(scene, index);
      previous = index;
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
    save({ ...savedRef.current, best: sceneRef.current.combo.best, sound: next });
  }

  async function share() {
    if (!result) return;
    const text = `${t("shareText", { mode: t(MODE_KEYS[result.mode]), score: result.score.toLocaleString(), rank: result.rank, combo: result.combo })}\n${window.location.origin}/${locale}/puchi`;
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); setShared(t("copied")); }
    } catch { /* the share sheet was closed */ }
  }

  const timed = mode !== "free";
  const overlay = timed && view.phase !== "playing";

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <div className={styles.modes} role="radiogroup" aria-label={t("mode")}>
        {MODES.map(m => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} className={styles.mode} onClick={() => choose(m)} data-puchi-mode={m}>{t(MODE_KEYS[m])}</button>
        ))}
      </div>
      <dl className={styles.hud}>
        <div><dt>{t("score")}</dt><dd data-puchi="score">{view.score.toLocaleString()}</dd></div>
        {timed
          ? <div data-low={view.phase === "playing" && view.timeLeft <= 5 ? "" : undefined}><dt>{t("timeLeft")}</dt><dd data-puchi="time">{view.phase === "playing" || view.phase === "over" ? view.timeLeft.toFixed(1) : "30.0"}</dd></div>
          : <div><dt>{t("pops")}</dt><dd data-puchi="pops">{view.pops.toLocaleString()}</dd></div>}
        <div><dt>{t("remaining")}</dt><dd data-puchi="remaining">{view.remaining}</dd></div>
        <div><dt>{timed ? t("bestScore") : t("best")}</dt><dd data-puchi="best">{view.best.toLocaleString()}</dd></div>
      </dl>
      <p className={styles.fever} data-on={view.fever > 1 ? "" : undefined} aria-live="off">
        {view.fever > 1 ? <span data-puchi="fever">{t("fever", { n: view.fever })} · {view.feverLeft.toFixed(1)}s</span> : " "}
      </p>
      <div className={styles.stage}>
        <div className={styles.combo} aria-hidden="true">
          {view.combo >= 2 && <span key={view.combo} data-puchi="combo" className={styles.comboNumber}>{view.combo}<small>{t("combo")}</small></span>}
        </div>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          tabIndex={overlay ? -1 : 0}
          role="img"
          aria-label={t("canvasLabel")}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onKeyDown={key}
        />
        {overlay && view.phase === "ready" && (
          <div className={styles.overlay} data-puchi="ready">
            <p>{mode === "daily" ? t("readyDaily", { date: dailySeed(new Date()) }) : t("readyTimed")}</p>
            <button type="button" className={`auth-link ${styles.big}`} onClick={start} data-puchi="start" autoFocus>{t("start")}</button>
          </div>
        )}
        {overlay && view.phase === "countdown" && (
          <div className={styles.overlay} data-puchi="countdown" aria-hidden="true"><span key={view.countdown} className={styles.count}>{view.countdown}</span></div>
        )}
        {overlay && view.phase === "over" && result && (
          <div className={styles.overlay} role="dialog" aria-label={t("result")} data-puchi="result">
            <p className={styles.rank} data-rank={result.rank}>{result.rank}</p>
            <p className={styles.final}>{result.score.toLocaleString()}<small>{t("points")}</small></p>
            {result.newBest && <p className={styles.newBest}>{t("newBest")}</p>}
            <p className={styles.detail}>{t("pops")} {result.pops} · {t("maxCombo")} {result.combo} · {t("bestScore")} {result.best.toLocaleString()}</p>
            <div className={styles.buttons}>
              <button type="button" className={`auth-link ${styles.big}`} onClick={start} data-puchi="retry" autoFocus>{t("retry")}</button>
              <button type="button" className="auth-link" onClick={share} data-puchi="share">{t("share")}</button>
            </div>
            <p className={styles.detail} role="status">{shared}</p>
          </div>
        )}
        <p className={styles.visuallyHidden} role="status" aria-live="polite">{view.milestone ? t("milestone", { count: view.milestone }) : ""}</p>
      </div>
      <ul className={styles.legend}>
        <li><span className={styles.swatch} data-kind="gold" aria-hidden="true" />{t("legendGold")}</li>
        <li><span className={styles.swatch} data-kind="rainbow" aria-hidden="true" />{t("legendRainbow")}</li>
        <li><span className={styles.swatch} data-kind="ice" aria-hidden="true" />{t("legendIce")}</li>
        <li><span className={styles.swatch} data-kind="time" aria-hidden="true" />{t("legendTime")}</li>
      </ul>
      <div className={styles.buttons}>
        <button type="button" className="auth-link" aria-pressed={sound} onClick={toggleSound} data-puchi="sound">{t("sound")}: {sound ? t("on") : t("off")}</button>
        <button type="button" className="auth-link" onClick={() => choose(mode)} data-puchi="new">{t("newSheet")}</button>
      </div>
      <p className={styles.hint}>{t("hint")}</p>
    </ToolLayout>
  );
}
