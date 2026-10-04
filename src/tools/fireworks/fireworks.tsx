"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import styles from "./fireworks.module.css";
import { BURSTS, SHOW_LENGTH, createScene, launch, showSchedule, step, type Burst, type BurstEvent, type Scene, type ShowShot } from "./engine";

type Kind = "random" | Burst;
const ASPECT = 0.62;
// After the finale, the sparks fall for a while and the sky rests before the show starts again.
const SHOW_PAUSE = 6;

// A short, dull thud for the launch and a pop that is louder for a bigger burst: noise with a falling low-pass filter.
function playBurst(audio: AudioContext, event: BurstEvent) {
  const length = Math.floor(audio.sampleRate * 0.6);
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
  const source = audio.createBufferSource();
  source.buffer = buffer;
  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1800, audio.currentTime);
  filter.frequency.exponentialRampToValueAtTime(160, audio.currentTime + 0.5);
  const gain = audio.createGain();
  gain.gain.value = Math.min(0.5, 0.15 + event.count / 400);
  source.connect(filter).connect(gain).connect(audio.destination);
  source.start();
}

function playLaunch(audio: AudioContext) {
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(220, audio.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(900, audio.currentTime + 0.5);
  gain.gain.setValueAtTime(0.025, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.55);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + 0.6);
}

// The night sky is always dark, whatever the page's theme; the town below it is a silhouette.
function drawTown(context: CanvasRenderingContext2D, width: number, height: number) {
  context.fillStyle = "#03050d";
  context.beginPath();
  context.moveTo(0, height);
  const blocks = 14;
  for (let i = 0; i <= blocks; i++) {
    const x = (i / blocks) * width;
    const roof = height - 12 - ((i * 37) % 5) * 7 - (i % 3) * 4;
    context.lineTo(x, roof);
    context.lineTo(x + width / blocks, roof);
  }
  context.lineTo(width, height);
  context.closePath();
  context.fill();
}

function draw(context: CanvasRenderingContext2D, scene: Scene) {
  const { width, height } = scene;
  // Fading rather than clearing leaves each spark a short tail.
  context.globalCompositeOperation = "destination-out";
  context.fillStyle = "rgba(0, 0, 0, 0.24)";
  context.fillRect(0, 0, width, height);
  context.globalCompositeOperation = "lighter";
  for (const rocket of scene.rockets) {
    context.strokeStyle = `hsla(${rocket.hue}, 100%, 85%, 0.9)`;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(rocket.x - rocket.vx * 0.05, rocket.y - rocket.vy * 0.05);
    context.lineTo(rocket.x, rocket.y);
    context.stroke();
  }
  for (const spark of scene.sparks) {
    const fade = Math.min(1, spark.life / (spark.maxLife * 0.5));
    const alpha = spark.twinkle && Math.random() < 0.18 ? fade * 0.3 : fade;
    context.fillStyle = `hsla(${spark.hue}, 100%, ${62 + 18 * fade}%, ${alpha})`;
    context.beginPath();
    context.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
    context.fill();
  }
  context.globalCompositeOperation = "source-over";
  drawTown(context, width, height);
}

export default function Fireworks() {
  const t = useTranslations("App.fireworks");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<Scene>(createScene(800, 800 * ASPECT));
  const audioRef = useRef<AudioContext | null>(null);
  const showRef = useRef<{ shots: ShowShot[]; at: number; next: number }>({ shots: [], at: 0, next: 0 });
  const kindRef = useRef<Kind>("random");
  const autoRef = useRef(false);
  const soundRef = useRef(false);
  const [launched, setLaunched] = useState(0);
  const [kind, setKind] = useState<Kind>("random");
  const [auto, setAuto] = useState(false);
  const [sound, setSound] = useState(false);
  const [calm, setCalm] = useState(false);

  kindRef.current = kind;
  autoRef.current = auto;
  soundRef.current = sound;

  function fire(x: number, y: number) {
    const scene = sceneRef.current;
    launch(scene, Math.random, x, y, kindRef.current === "random" ? undefined : kindRef.current);
    setLaunched(scene.launched);
    if (soundRef.current && audioRef.current) playLaunch(audioRef.current);
  }

  function fireAnywhere() {
    const { width, height } = sceneRef.current;
    fire(width * (0.15 + 0.7 * Math.random()), height * (0.16 + 0.34 * Math.random()));
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
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const scene = sceneRef.current;
      if (autoRef.current) {
        const show = showRef.current;
        if (!show.shots.length) showRef.current = { shots: showSchedule(Math.random, scene.width, scene.height), at: 0, next: 0 };
        show.at += Math.min(dt, 0.1);
        while (show.next < show.shots.length && show.shots[show.next].at <= show.at) {
          const shot = show.shots[show.next++];
          launch(scene, Math.random, shot.x, shot.y, shot.burst);
          if (soundRef.current && audioRef.current) playLaunch(audioRef.current);
        }
        if (show.at > SHOW_LENGTH + SHOW_PAUSE) showRef.current = { shots: [], at: 0, next: 0 };
        setLaunched(scene.launched);
      }
      const events = step(scene, dt, Math.random);
      if (soundRef.current && audioRef.current) for (const event of events) playBurst(audioRef.current, event);
      draw(context, scene);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);

  useEffect(() => () => { void audioRef.current?.close(); }, []);

  function toggleSound() {
    // The audio context is made on this tap: browsers only allow sound after a gesture.
    if (!sound && !audioRef.current) audioRef.current = new AudioContext();
    if (!sound) void audioRef.current?.resume();
    setSound(on => !on);
  }

  function toggleAuto() {
    showRef.current = { shots: [], at: 0, next: 0 };
    setAuto(on => !on);
  }

  function aim(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    fire(event.clientX - rect.left, event.clientY - rect.top);
  }

  function key(event: ReactKeyboardEvent<HTMLCanvasElement>) {
    if (event.key === " " || event.key === "Enter") { event.preventDefault(); fireAnywhere(); }
  }

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <div className={styles.sky}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          role="img"
          tabIndex={0}
          aria-label={t("canvasLabel")}
          onPointerDown={aim}
          onKeyDown={key}
        />
      </div>
      <dl className={styles.count}>
        <div><dt>{t("launched")}</dt><dd data-fireworks="launched">{launched.toLocaleString()}</dd></div>
      </dl>
      <div className={styles.controls}>
        <button className="auth-link" type="button" onClick={fireAnywhere}>{t("launch")}</button>
        <button className={styles.toggle} type="button" aria-pressed={auto} onClick={toggleAuto}>{auto ? t("showOn") : t("showOff")}</button>
        <button className={styles.toggle} type="button" aria-pressed={sound} onClick={toggleSound}>{sound ? t("soundOn") : t("soundOff")}</button>
        <label className={styles.kind}>
          <span>{t("kindLabel")}</span>
          <select value={kind} onChange={event => setKind(event.target.value as Kind)}>
            <option value="random">{t("kinds.random")}</option>
            {BURSTS.map(burst => <option key={burst} value={burst}>{t(`kinds.${burst}`)}</option>)}
          </select>
        </label>
      </div>
      {calm && <p className={controls.label}>{t("calm")}</p>}
      <p className={controls.label}>{t("keys")}</p>
    </ToolLayout>
  );
}
