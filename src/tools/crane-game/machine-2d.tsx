import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { useTranslations } from 'use-intl';
import { createScene, drop, HEIGHT, holdMove, newRound, step, WIDTH, type Scene } from './engine';
import { drawFrame } from './render';
import type { MachineProps } from './crane-game';
import styles from './crane-game.module.css';

// The machine seen from the side: hold "move" (once a play), then "drop".
export default function Machine2D({ round, onEvents, onView, onPress, message }: MachineProps & { message: ReactNode }) {
  const t = useTranslations('App.craneGame');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const movingRef = useRef(false);
  const [over, setOver] = useState(false);
  const buttonsRef = useRef<{ move: HTMLButtonElement | null; drop: HTMLButtonElement | null }>({ move: null, drop: null });

  useEffect(() => {
    const canvas = canvasRef.current, context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    sceneRef.current ??= createScene(Math.random);
    let width = 0;
    const fit = () => {
      const next = Math.round(canvas.clientWidth || WIDTH);
      if (next === width) return;
      width = next;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round((width * HEIGHT / WIDTH) * ratio);
      context.setTransform(ratio * width / WIDTH, 0, 0, ratio * width / WIDTH, 0, 0);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    let frame = 0, last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const scene = sceneRef.current!;
      onEvents(step(scene, dt, Math.random, movingRef.current));
      drawFrame(context, scene, document.documentElement.dataset.theme === 'dark');
      onView({ phase: scene.phase, playsLeft: scene.playsLeft, won: scene.won });
      // The buttons follow the claw without a render each frame.
      const { move, drop: dropButton } = buttonsRef.current;
      if (move) move.disabled = !(scene.phase === 'ready' || scene.phase === 'moving');
      if (dropButton) dropButton.disabled = !(scene.phase === 'ready' || scene.phase === 'moving' || scene.phase === 'aimed');
      setOver(scene.phase === 'over');
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [onEvents, onView]);

  // "Again": a new round on this machine.
  useEffect(() => { if (round > 0 && sceneRef.current) newRound(sceneRef.current, Math.random); }, [round]);

  function moveDown() {
    const scene = sceneRef.current;
    if (!scene) return;
    onPress(scene.phase === 'ready');
    holdMove(scene, true);
    movingRef.current = scene.phase === 'moving';
  }
  function moveUp() {
    const scene = sceneRef.current;
    if (!scene || !movingRef.current) return;
    movingRef.current = false;
    holdMove(scene, false);
  }
  function dropClaw() {
    const scene = sceneRef.current;
    if (!scene) return;
    onPress(scene.phase === 'ready');
    movingRef.current = false;
    if (scene.phase === 'moving') holdMove(scene, false);
    drop(scene);
  }
  // The keyboard: → held moves, ↓ / Space / Enter drops.
  function key(event: ReactKeyboardEvent<HTMLDivElement>, down: boolean) {
    if (event.key === 'ArrowRight') { event.preventDefault(); if (down && !event.repeat) moveDown(); if (!down) moveUp(); }
    if (down && (event.key === 'ArrowDown' || event.key === ' ' || event.key === 'Enter') && (event.target as HTMLElement).tagName !== 'BUTTON') { event.preventDefault(); dropClaw(); }
  }

  return <div onKeyDown={event => key(event, true)} onKeyUp={event => key(event, false)}>
    <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label={t('canvasLabel')} tabIndex={0} data-crane="canvas" />
    {message}
    <div className={styles.controls} hidden={over}>
      <button type="button" className={styles.move} ref={element => { buttonsRef.current.move = element; }} data-crane="move"
        onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); moveDown(); }}
        onPointerUp={moveUp} onPointerCancel={moveUp} onLostPointerCapture={moveUp}
        onKeyDown={event => { if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) { event.preventDefault(); moveDown(); } }}
        onKeyUp={event => { if (event.key === ' ' || event.key === 'Enter') moveUp(); }}>
        <span aria-hidden="true">→</span> {t('move')}
      </button>
      <button type="button" className={styles.drop} ref={element => { buttonsRef.current.drop = element; }} onClick={dropClaw} data-crane="drop">
        <span aria-hidden="true">↓</span> {t('drop')}
      </button>
    </div>
  </div>;
}
