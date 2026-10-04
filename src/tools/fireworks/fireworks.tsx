"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import styles from "./fireworks.module.css";
import { playBurst, playLaunch } from "./audio";
import {
  DIAMETER_M, KINDS, PALETTES, SHOW_LENGTH, SIZES, createScene, finale, fountain, launch, showSchedule, soundDelay, starmine, step,
  type Kind, type Palette, type Scene, type ShowItem, type Size,
} from "./engine";
import { drawFrame } from "./render";

const ASPECT = 0.62;
// After the finale the sparks fall and the smoke thins before the festival starts again.
const SHOW_PAUSE = 8;
const SWATCH: Record<Palette, string> = {
  auto: "conic-gradient(#e0483f, #f08a30, #f0c040, #3fb36b, #3f7fe0, #9a5fd0, #e0483f)",
  red: "hsl(2 90% 58%)", orange: "hsl(24 95% 56%)", gold: "hsl(44 95% 56%)", green: "hsl(130 65% 48%)", blue: "hsl(212 90% 60%)", purple: "hsl(285 70% 62%)", white: "hsl(210 20% 94%)",
};

type Timeline = { items: ShowItem[]; at: number; next: number };
type Settings = { kind: Kind | "random"; size: Size; palette: Palette; wind: number; distance: number; speed: number; reflect: boolean; sound: boolean };
const DEFAULTS: Settings = { kind: "random", size: 5, palette: "auto", wind: 0, distance: 600, speed: 1, reflect: true, sound: false };

export default function Fireworks() {
  const t = useTranslations("App.fireworks");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<Scene>(createScene(800, 800 * ASPECT));
  const audioRef = useRef<AudioContext | null>(null);
  const festivalRef = useRef<Timeline | null>(null);
  const extrasRef = useRef<Timeline[]>([]);
  const settingsRef = useRef<Settings>(DEFAULTS);
  const festivalOnRef = useRef(false);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [festival, setFestival] = useState(false);
  const [launched, setLaunched] = useState(0);
  const [calm, setCalm] = useState(false);

  settingsRef.current = settings;
  festivalOnRef.current = festival;
  const change = (patch: Partial<Settings>) => setSettings(current => ({ ...current, ...patch }));

  function shoot(x: number, y: number, kind?: Kind, size?: Size) {
    const scene = sceneRef.current;
    const now = settingsRef.current;
    launch(scene, Math.random, x, y, { kind: kind ?? now.kind, size: size ?? now.size, palette: now.palette });
    if (now.sound && audioRef.current) playLaunch(audioRef.current);
  }

  function shootAnywhere() {
    const { width, height } = sceneRef.current;
    shoot(width * (0.15 + 0.7 * Math.random()), height * (0.2 + 0.28 * Math.random()));
  }

  function run(items: ShowItem[]) {
    extrasRef.current.push({ items, at: 0, next: 0 });
  }

  function startStarmine() {
    const { width, height } = sceneRef.current;
    run(starmine(Math.random, width, height, 0, 9));
  }
  function startNiagara() {
    const { width, height } = sceneRef.current;
    run([{ type: "fountain", at: 0, x0: width * 0.2, x1: width * 0.8, y: height * 0.5, seconds: 12 }]);
  }
  function startFinale() {
    const { width, height } = sceneRef.current;
    run(finale(Math.random, width, height, 0));
  }

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { sceneRef.current.calm = query.matches; setCalm(query.matches); };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const fit = () => {
      const width = canvas.clientWidth || 800;
      const height = Math.round(width * ASPECT);
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      sceneRef.current.width = width;
      sceneRef.current.height = height;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    // Plays a timeline's items that are due; returns whether it has more.
    const play = (line: Timeline, dt: number): boolean => {
      const scene = sceneRef.current;
      const now = settingsRef.current;
      line.at += dt;
      while (line.next < line.items.length && line.items[line.next].at <= line.at) {
        const item = line.items[line.next++];
        if (item.type === "shell") {
          launch(scene, Math.random, item.x, item.y, { kind: item.kind, size: item.size, palette: now.palette });
          if (now.sound && audioRef.current) playLaunch(audioRef.current);
        } else {
          fountain(scene, item.x0, item.x1, item.y, item.seconds);
        }
      }
      return line.next < line.items.length;
    };
    let frame = 0;
    let last = performance.now();
    let shown = -1;
    const loop = (now: number) => {
      const real = (now - last) / 1000;
      last = now;
      const scene = sceneRef.current;
      const live = settingsRef.current;
      const dt = Math.min(real, 0.1) * live.speed;
      scene.wind = live.wind;
      if (festivalOnRef.current) {
        if (!festivalRef.current) festivalRef.current = { items: showSchedule(Math.random, scene.width, scene.height), at: 0, next: 0 };
        play(festivalRef.current, dt);
        if (festivalRef.current.at > SHOW_LENGTH + SHOW_PAUSE) festivalRef.current = null;
      }
      extrasRef.current = extrasRef.current.filter(line => play(line, dt));
      const events = step(scene, dt, Math.random);
      if (live.sound && audioRef.current) for (const event of events) playBurst(audioRef.current, event, live.distance);
      drawFrame(context, scene, { reflect: live.reflect });
      if (scene.launched !== shown) { shown = scene.launched; setLaunched(shown); }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);

  useEffect(() => () => { void audioRef.current?.close(); }, []);

  function toggleSound() {
    // The audio context is made on this tap: browsers only allow sound after a gesture.
    if (!settings.sound && !audioRef.current) audioRef.current = new AudioContext();
    if (!settings.sound) void audioRef.current?.resume();
    change({ sound: !settings.sound });
  }

  function toggleFestival() {
    festivalRef.current = null;
    setFestival(on => !on);
  }

  function aim(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    shoot(event.clientX - rect.left, event.clientY - rect.top);
  }

  function key(event: ReactKeyboardEvent<HTMLCanvasElement>) {
    if (event.key === " " || event.key === "Enter") { event.preventDefault(); shootAnywhere(); }
  }

  function save() {
    canvasRef.current?.toBlob(blob => {
      if (!blob) return;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "fireworks.png";
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    });
  }

  const delay = soundDelay(settings.distance);
  const windSteps = Math.round(settings.wind * 10);
  const windText = windSteps === 0 ? t("windNone") : windSteps < 0 ? t("windLeft", { n: -windSteps }) : t("windRight", { n: windSteps });
  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <div className={styles.sky}>
        <canvas ref={canvasRef} className={styles.canvas} role="img" tabIndex={0} aria-label={t("canvasLabel")} onPointerDown={aim} onKeyDown={key} />
      </div>
      <dl className={styles.count}>
        <div><dt>{t("launched")}</dt><dd data-fireworks="launched">{launched.toLocaleString()}</dd></div>
      </dl>

      <div className={styles.controls}>
        <button className="auth-link" type="button" onClick={shootAnywhere}>{t("launch")}</button>
        <button className={styles.toggle} type="button" aria-pressed={festival} onClick={toggleFestival}>{festival ? t("festivalOn") : t("festivalOff")}</button>
        <button className={styles.toggle} type="button" onClick={startStarmine}>{t("starmine")}</button>
        <button className={styles.toggle} type="button" onClick={startNiagara}>{t("niagara")}</button>
        <button className={styles.toggle} type="button" onClick={startFinale}>{t("finale")}</button>
      </div>

      <div className={styles.panel}>
        <div className={styles.row}>
          <span className={styles.name}>{t("kindLabel")}</span>
          <select aria-label={t("kindLabel")} value={settings.kind} onChange={event => change({ kind: event.target.value as Kind | "random" })}>
            <option value="random">{t("kinds.random")}</option>
            {KINDS.map(kind => <option key={kind} value={kind}>{t(`kinds.${kind}`)}</option>)}
          </select>
        </div>
        <div className={styles.row} role="radiogroup" aria-label={t("sizeLabel")}>
          <span className={styles.name}>{t("sizeLabel")}</span>
          <span className={styles.group}>
            {SIZES.map(size => (
              <button key={size} type="button" role="radio" aria-checked={settings.size === size} className={styles.choice} onClick={() => change({ size })}>{t("size", { n: size })}</button>
            ))}
          </span>
          <span className={styles.note}>{t("sizeNote", { meters: DIAMETER_M[settings.size] })}</span>
        </div>
        <div className={styles.row} role="radiogroup" aria-label={t("paletteLabel")}>
          <span className={styles.name}>{t("paletteLabel")}</span>
          <span className={styles.group}>
            {PALETTES.map(palette => (
              <button key={palette} type="button" role="radio" aria-checked={settings.palette === palette} aria-label={t(`palettes.${palette}`)} title={t(`palettes.${palette}`)} className={styles.swatch} style={{ background: SWATCH[palette] }} onClick={() => change({ palette })} />
            ))}
          </span>
        </div>
        <label className={styles.row}>
          <span className={styles.name}>{t("windLabel")}</span>
          <input type="range" min={-10} max={10} step={1} value={Math.round(settings.wind * 10)} aria-valuetext={windText} onChange={event => change({ wind: Number(event.target.value) / 10 })} />
          <span className={styles.note}>{windText}</span>
        </label>
        <label className={styles.row}>
          <span className={styles.name}>{t("distanceLabel")}</span>
          <input type="range" min={200} max={1500} step={100} value={settings.distance} aria-valuetext={t("distanceValue", { m: settings.distance })} onChange={event => change({ distance: Number(event.target.value) })} />
          <span className={styles.note}>{t("distanceValue", { m: settings.distance })} · {t("delay", { seconds: delay.toFixed(1) })}</span>
        </label>
        <div className={styles.row}>
          <span className={styles.name}>{t("speedLabel")}</span>
          <select aria-label={t("speedLabel")} value={settings.speed} onChange={event => change({ speed: Number(event.target.value) })}>
            <option value={1}>1×</option>
            <option value={0.5}>0.5×</option>
            <option value={0.25}>0.25×</option>
          </select>
          <button className={styles.toggle} type="button" aria-pressed={settings.reflect} onClick={() => change({ reflect: !settings.reflect })}>{settings.reflect ? t("waterOn") : t("waterOff")}</button>
          <button className={styles.toggle} type="button" aria-pressed={settings.sound} onClick={toggleSound}>{settings.sound ? t("soundOn") : t("soundOff")}</button>
          <button className={styles.toggle} type="button" onClick={save}>{t("save")}</button>
        </div>
      </div>
      {calm && <p className={controls.label}>{t("calm")}</p>}
      <p className={controls.label}>{t("keys")}</p>
    </ToolLayout>
  );
}
