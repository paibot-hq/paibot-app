"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import styles from "./life-view.module.css";
import { PATTERNS, PATTERN_NAMES, count, create, fill, index, patternSize, place, step, toggle, type Life, type PatternName } from "./life";

const SIZE = 640;
const GRID = 80;
const CELL = SIZE / GRID;

type Tool = "pen" | PatternName;

export default function LifeGame() {
  const t = useTranslations("App.life");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lifeRef = useRef<Life>(create(GRID, GRID));
  const generation = useRef(0);
  const dirty = useRef(true);
  const drawing = useRef<boolean | null>(null);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(12);
  const [tool, setTool] = useState<Tool>("pen");
  const [stats, setStats] = useState({ generation: 0, population: 0 });
  const state = useRef({ running, speed, tool });
  state.current = { running, speed, tool };

  function load(life: Life) { lifeRef.current = life; generation.current = 0; dirty.current = true; }
  function advance() { lifeRef.current = step(lifeRef.current); generation.current++; dirty.current = true; }
  function reseed(name: PatternName) {
    const { width, height } = patternSize(PATTERNS[name]);
    load(place(create(GRID, GRID), PATTERNS[name], Math.floor((GRID - width) / 2), Math.floor((GRID - height) / 2)));
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = SIZE;
    canvas.height = SIZE;
    reseed("rpentomino");
    let frame = 0, before = performance.now(), owed = 0, shown = "";
    const loop = (now: number) => {
      owed += Math.min(now - before, 200) / 1000;
      before = now;
      if (state.current.running) {
        const every = 1 / state.current.speed;
        while (owed >= every) { owed -= every; advance(); }
      } else owed = 0;
      if (dirty.current) { dirty.current = false; draw(canvas, lifeRef.current); }
      const population = count(lifeRef.current);
      const next = `${generation.current}/${population}`;
      if (next !== shown) { shown = next; setStats({ generation: generation.current, population }); }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cellAt = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: Math.floor(((event.clientX - rect.left) / rect.width) * GRID), y: Math.floor(((event.clientY - rect.top) / rect.height) * GRID) };
  };
  function down(event: ReactPointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const { x, y } = cellAt(event);
    const picked = state.current.tool;
    if (picked !== "pen") {
      const { width, height } = patternSize(PATTERNS[picked]);
      lifeRef.current = place(lifeRef.current, PATTERNS[picked], x - Math.floor(width / 2), y - Math.floor(height / 2));
      dirty.current = true;
      return;
    }
    // The pen draws live cells, or erases if it began on one.
    drawing.current = lifeRef.current.cells[index(lifeRef.current, x, y)] === 0;
    lifeRef.current = toggle(lifeRef.current, x, y, drawing.current);
    dirty.current = true;
  }
  function move(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (drawing.current === null) return;
    const { x, y } = cellAt(event);
    if (x < 0 || y < 0 || x >= GRID || y >= GRID) return;
    lifeRef.current = toggle(lifeRef.current, x, y, drawing.current);
    dirty.current = true;
  }
  function up() { drawing.current = null; }

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label={t("canvasLabel")} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
      <p className={styles.stats} role="status" data-life="stats">{t("stats", stats)}</p>
      <div className={styles.buttons}>
        <button className="auth-link" type="button" aria-pressed={running} onClick={() => setRunning(on => !on)} data-life="run">{running ? t("running") : t("paused")}</button>
        <button className={styles.button} type="button" onClick={() => { advance(); }} data-life="step">{t("step")}</button>
        <button className={styles.button} type="button" onClick={() => load(fill(create(GRID, GRID), 0.25, Math.random))} data-life="random">{t("random")}</button>
        <button className={styles.button} type="button" onClick={() => load(create(GRID, GRID))} data-life="clear">{t("clear")}</button>
      </div>
      <label className={styles.slider}>
        <span>{t("speed")}</span>
        <input type="range" min={1} max={40} step={1} value={speed} aria-label={t("speed")} onChange={event => setSpeed(Number(event.target.value))} />
        <span className={styles.value}>{t("perSecond", { n: speed })}</span>
      </label>
      <div className={styles.buttons} role="group" aria-label={t("tool")}>
        <button type="button" className={styles.choice} aria-pressed={tool === "pen"} onClick={() => setTool("pen")}>{t("pen")}</button>
        {PATTERN_NAMES.map(name => <button key={name} type="button" className={styles.choice} aria-pressed={tool === name} onClick={() => setTool(name)}>{t(`patterns.${name}`)}</button>)}
      </div>
      <p className={controls.label}>{t("hint")}</p>
    </ToolLayout>
  );
}

function draw(canvas: HTMLCanvasElement, life: Life) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#0b1020";
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < GRID; i++) { ctx.moveTo(i * CELL + 0.5, 0); ctx.lineTo(i * CELL + 0.5, SIZE); ctx.moveTo(0, i * CELL + 0.5); ctx.lineTo(SIZE, i * CELL + 0.5); }
  ctx.stroke();
  // Young cells are green, and the older they get the bluer they are.
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
    const age = life.cells[y * GRID + x];
    if (age === 0) continue;
    ctx.fillStyle = `hsl(${130 + Math.min(age, 40) * 3.25}, 85%, ${age === 1 ? 70 : 58}%)`;
    ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
  }
}
