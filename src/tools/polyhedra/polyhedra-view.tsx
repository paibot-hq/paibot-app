"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import styles from "./polyhedra-view.module.css";
import { SOLIDS, brightness, faceNormal, polyhedron, project, rotate, type Solid } from "./polyhedra";

const SIZE = 640;
const BACKGROUND = "#0b1020";

type Mode = "solid" | "wire";

export default function Polyhedra() {
  const t = useTranslations("App.polyhedra");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const turn = useRef({ yaw: 0.6, pitch: -0.45, spin: 0.5 });
  const dragging = useRef<{ x: number; y: number } | null>(null);
  const [solid, setSolid] = useState<Solid>("dodeca");
  const [mode, setMode] = useState<Mode>("solid");
  const [auto, setAuto] = useState(true);
  const state = useRef({ solid, mode, auto });
  state.current = { solid, mode, auto };
  const shapes = useMemo(() => Object.fromEntries(SOLIDS.map(name => [name, polyhedron(name)])) as Record<Solid, ReturnType<typeof polyhedron>>, []);
  const shapesRef = useRef(shapes);
  const current = shapes[solid];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = SIZE;
    canvas.height = SIZE;
    let frame = 0;
    let before = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - before) / 1000, 0.05);
      before = now;
      const ctx = canvas.getContext("2d");
      const view = turn.current;
      const { solid: name, mode: how, auto: spinning } = state.current;
      if (!dragging.current) {
        // The speed settles to the slow spin of the automatic mode, or to a stop, whatever a drag made it.
        view.spin += ((spinning ? 0.5 : 0) - view.spin) * (1 - Math.pow(0.04, dt));
        view.yaw += view.spin * dt;
      }
      if (ctx) draw(ctx, shapesRef.current[name], how, view.yaw, view.pitch);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  function down(event: ReactPointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = { x: event.clientX, y: event.clientY };
    turn.current.spin = 0;
  }
  function move(event: ReactPointerEvent<HTMLCanvasElement>) {
    const last = dragging.current;
    if (!last) return;
    const dx = event.clientX - last.x, dy = event.clientY - last.y;
    turn.current.yaw += dx * 0.01;
    turn.current.pitch = Math.max(-1.5, Math.min(1.5, turn.current.pitch + dy * 0.01));
    // What is left of the movement goes on turning after the finger is lifted.
    turn.current.spin = dx * 0.01 * 30;
    dragging.current = { x: event.clientX, y: event.clientY };
  }
  function up() { dragging.current = null; }

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label={t("canvasLabel", { name: t(`solids.${solid}`) })} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
      <p className={styles.stats} role="status" data-polyhedra="stats">{t("stats", { name: t(`solids.${solid}`), v: current.vertices.length, e: current.edges.length, f: current.faces.length })}</p>
      <div className={styles.buttons} role="group" aria-label={t("choose")}>
        {SOLIDS.map(name => <button key={name} type="button" className={styles.choice} aria-pressed={solid === name} onClick={() => setSolid(name)}>{t(`solids.${name}`)}</button>)}
      </div>
      <div className={styles.buttons}>
        <button className="auth-link" type="button" aria-pressed={auto} onClick={() => setAuto(on => !on)} data-polyhedra="auto">{auto ? t("autoOn") : t("autoOff")}</button>
        <button type="button" className={styles.choice} aria-pressed={mode === "solid"} onClick={() => setMode("solid")}>{t("solid")}</button>
        <button type="button" className={styles.choice} aria-pressed={mode === "wire"} onClick={() => setMode("wire")}>{t("wire")}</button>
      </div>
      <p className={controls.label}>{t("hint")}</p>
    </ToolLayout>
  );
}

function draw(ctx: CanvasRenderingContext2D, shape: ReturnType<typeof polyhedron>, mode: Mode, yaw: number, pitch: number) {
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, SIZE, SIZE);
  const turned = shape.vertices.map(v => rotate(v, yaw, pitch));
  const screen = turned.map(v => project(v, SIZE));
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  if (mode === "wire") {
    // Edges at the back are fainter, so the depth can be read.
    const edges = [...shape.edges].sort((a, b) => (turned[b[0]].z + turned[b[1]].z) - (turned[a[0]].z + turned[a[1]].z));
    for (const [a, b] of edges) {
      const depth = (turned[a].z + turned[b].z) / 2;
      ctx.strokeStyle = `rgba(150, 210, 255, ${0.28 + 0.62 * (1 - (depth + 1) / 2)})`;
      ctx.lineWidth = 2.5 - depth * 0.8;
      ctx.beginPath();
      ctx.moveTo(screen[a].x, screen[a].y);
      ctx.lineTo(screen[b].x, screen[b].y);
      ctx.stroke();
    }
    for (let i = 0; i < screen.length; i++) {
      ctx.fillStyle = `rgba(230, 245, 255, ${0.5 + 0.5 * (1 - (turned[i].z + 1) / 2)})`;
      ctx.beginPath();
      ctx.arc(screen[i].x, screen[i].y, 4.2 * screen[i].scale, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  // Solid: the far faces first, the faces turned away not at all.
  const faces = shape.faces.map((face, index) => {
    const normal = rotate(faceNormal(shape.vertices, face), yaw, pitch);
    const depth = face.reduce((sum, i) => sum + turned[i].z, 0) / face.length;
    return { face, index, normal, depth };
  }).filter(item => item.normal.z < 0).sort((a, b) => b.depth - a.depth);
  for (const { face, index, normal } of faces) {
    const hue = (index * 360) / shape.faces.length;
    const light = brightness(normal);
    ctx.fillStyle = `hsl(${hue}, 70%, ${Math.round(18 + 52 * light)}%)`;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    face.forEach((i, k) => (k === 0 ? ctx.moveTo(screen[i].x, screen[i].y) : ctx.lineTo(screen[i].x, screen[i].y)));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}
