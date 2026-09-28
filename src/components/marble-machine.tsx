import { useEffect, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import type MatterJS from "matter-js";
import ToolLayout from "./tool-layout";
import controls from "./tool-controls.module.css";
import styles from "./marble-machine.module.css";
import { buildCourse, STEP_MS, WORLD, type Course, type CourseEvent, type Part } from "../lib/marble-course";

type Phase = "loading" | "ready" | "running" | "done";

// Short synthesized sounds; created on the Start click, so browsers allow them.
function playTone(audio: AudioContext, frequency: number, duration: number, type: OscillatorType = "sine", volume = 0.2) {
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + duration);
}

const SOUNDS: Partial<Record<CourseEvent, (audio: AudioContext) => void>> = {
  spring: audio => playTone(audio, 520, 0.18, "triangle", 0.25),
  domino: audio => playTone(audio, 180, 0.08, "square", 0.08),
  ballB: audio => playTone(audio, 330, 0.12, "triangle", 0.15),
  goal: audio => { playTone(audio, 1568, 1.6, "sine", 0.2); playTone(audio, 2349, 1.2, "sine", 0.08); },
};

function draw(canvas: HTMLCanvasElement, course: Course, rang: boolean) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const css = getComputedStyle(canvas);
  const color = (name: string) => css.getPropertyValue(name).trim();
  const colors: Record<Part, string> = {
    wall: color("--line"), ramp: color("--muted"), spring: color("--accent"),
    domino: color("--text"), ball: color("--accent-dark"), cup: color("--text"), bell: rang ? color("--success") : color("--muted"),
  };
  const scale = canvas.width / WORLD.width;
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.clearRect(0, 0, WORLD.width, WORLD.height);
  for (const body of course.engine.world.bodies) {
    const part = course.partOf(body);
    if (body.isSensor && part !== "bell") continue;
    if (part === "bell") {
      // A string from the top edge, so the bell reads as hanging.
      context.strokeStyle = colors.ramp;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(body.position.x, 0);
      context.lineTo(body.position.x, body.position.y);
      context.stroke();
    }
    context.beginPath();
    if (part === "ball" || part === "bell") {
      context.arc(body.position.x, body.position.y, body.circleRadius ?? 10, 0, Math.PI * 2);
    } else {
      body.vertices.forEach((vertex, index) => index ? context.lineTo(vertex.x, vertex.y) : context.moveTo(vertex.x, vertex.y));
      context.closePath();
    }
    context.fillStyle = colors[part];
    context.fill();
  }
}

export default function MarbleMachine() {
  const t = useTranslations("App.marbleMachine");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const matterRef = useRef<typeof MatterJS | null>(null);
  const courseRef = useRef<Course | null>(null);
  const frameRef = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);
  const soundRef = useRef(true);
  const [phase, setPhase] = useState<Phase>("loading");
  const [lastEvent, setLastEvent] = useState<CourseEvent | null>(null);
  const [sound, setSound] = useState(true);
  soundRef.current = sound;

  const reset = () => {
    cancelAnimationFrame(frameRef.current);
    const Matter = matterRef.current;
    const canvas = canvasRef.current;
    if (!Matter || !canvas) return;
    const course = buildCourse(Matter);
    course.onEvent(event => {
      setLastEvent(event);
      if (soundRef.current && audioRef.current) SOUNDS[event]?.(audioRef.current);
      if (event === "goal") setPhase("done");
    });
    courseRef.current = course;
    setLastEvent(null);
    setPhase("ready");
    draw(canvas, course, false);
  };

  useEffect(() => {
    let cancelled = false;
    // Loaded only on this page, and only in the browser.
    import("matter-js").then(module => {
      if (cancelled) return;
      matterRef.current = (module.default ?? module) as typeof MatterJS;
      reset();
    });
    const canvas = canvasRef.current;
    // Keep the canvas sharp at any width and redraw on theme changes.
    const resize = () => {
      if (!canvas) return;
      const width = canvas.clientWidth * window.devicePixelRatio;
      canvas.width = width;
      canvas.height = width * WORLD.height / WORLD.width;
      if (courseRef.current) draw(canvas, courseRef.current, courseRef.current.events.includes("goal"));
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (canvas) observer.observe(canvas);
    const themeObserver = new MutationObserver(resize);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frameRef.current);
      observer.disconnect();
      themeObserver.disconnect();
      void audioRef.current?.close();
    };
  }, []);

  const start = () => {
    const course = courseRef.current;
    const canvas = canvasRef.current;
    if (!course || !canvas) return;
    audioRef.current ??= new AudioContext();
    setPhase("running");
    course.start();
    // Fixed physics steps, decoupled from the display's refresh rate.
    let last = performance.now();
    let pending = 0;
    let goalAt: number | null = null;
    const loop = (now: number) => {
      pending = Math.min(pending + now - last, 250);
      last = now;
      while (pending >= STEP_MS) {
        course.step();
        pending -= STEP_MS;
      }
      const rang = course.events.includes("goal");
      draw(canvas, course, rang);
      if (rang) goalAt ??= now;
      // Let the last ball settle in the cup before stopping.
      if (goalAt === null || now - goalAt < 1500) frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
  };

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <canvas ref={canvasRef} className={styles["canvas"]} role="img" aria-label={t("canvasLabel")} />
      <p className={styles["status"]} aria-live="polite">
        {phase === "loading" ? t("loading") : lastEvent && lastEvent !== "start" ? t(`events.${lastEvent}`) : phase === "running" ? t("events.start") : t("ready")}
      </p>
      <div className={styles["actions"]}>
        {phase === "done" || phase === "running"
          ? <button className="auth-link" type="button" onClick={reset}>{t("again")}</button>
          : <button className="auth-link" type="button" onClick={start} disabled={phase !== "ready"}>{t("start")}</button>}
        <button className={styles["sound"]} type="button" aria-pressed={sound} onClick={() => setSound(on => !on)}>
          {sound ? t("soundOn") : t("soundOff")}
        </button>
      </div>
    </ToolLayout>
  );
}
