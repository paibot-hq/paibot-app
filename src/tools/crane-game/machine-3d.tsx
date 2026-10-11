import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { useTranslations } from 'use-intl';
import { createScene3, holdBack, holdRight, newRound3, step3, type Scene3 } from './engine3d';
import { createView3, type View3 } from './render3d';
import type { MachineProps } from './crane-game';
import styles from './crane-game.module.css';

// The 3D machine, as a real one: hold "→" (once), then hold "↑ back" (once); letting go of "back" drops the claw. Loaded only when chosen
// (three.js is large). While the claw goes back, the camera swings to the side to show the depth.
export default function Machine3D({ round, onEvents, onView, onPress, message }: MachineProps & { message: ReactNode }) {
  const t = useTranslations('App.craneGame');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<Scene3 | null>(null);
  const heldRef = useRef({ right: false, back: false });
  const buttonsRef = useRef<{ right: HTMLButtonElement | null; back: HTMLButtonElement | null }>({ right: null, back: null });
  const [over, setOver] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    sceneRef.current ??= createScene3(Math.random);
    let view: View3;
    try { view = createView3(canvas, document.documentElement.dataset.theme === 'dark'); } catch { setFailed(true); return; }
    const fit = () => view.resize(canvas.clientWidth || 360, canvas.clientHeight || 480);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    let frame = 0, last = performance.now(), sideways = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const scene = sceneRef.current!;
      onEvents(step3(scene, dt, Math.random, heldRef.current));
      // The camera goes round to the side while the claw goes back, and comes back to the front after.
      const target = scene.phase === 'movingZ' ? 1 : 0;
      sideways += (target - sideways) * Math.min(1, dt * 4);
      view.draw(scene, sideways);
      onView({ phase: scene.phase, playsLeft: scene.playsLeft, won: scene.won });
      const { right, back } = buttonsRef.current;
      if (right) right.disabled = !(scene.phase === 'ready' || scene.phase === 'movingX');
      if (back) back.disabled = !(scene.phase === 'ready' || scene.phase === 'aimedX' || scene.phase === 'movingZ');
      setOver(scene.phase === 'over');
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); view.dispose(); };
  }, [onEvents, onView]);

  useEffect(() => { if (round > 0 && sceneRef.current) newRound3(sceneRef.current, Math.random); }, [round]);

  const press = (which: 'right' | 'back', down: boolean) => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (down) onPress(scene.phase === 'ready');
    if (which === 'right') { holdRight(scene, down); heldRef.current.right = down && scene.phase === 'movingX'; }
    else { if (down && scene.phase === 'movingX') holdRight(scene, false); holdBack(scene, down); heldRef.current.back = down && scene.phase === 'movingZ'; }
  };
  // The keyboard: → held moves right, ↑ held moves back (letting go drops).
  function key(event: ReactKeyboardEvent<HTMLDivElement>, down: boolean) {
    const which = event.key === 'ArrowRight' ? 'right' : event.key === 'ArrowUp' ? 'back' : null;
    if (!which) return;
    event.preventDefault();
    if (down && event.repeat) return;
    press(which, down);
  }
  const hold = (which: 'right' | 'back') => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => { event.currentTarget.setPointerCapture(event.pointerId); press(which, true); },
    onPointerUp: () => press(which, false), onPointerCancel: () => press(which, false), onLostPointerCapture: () => { if (heldRef.current[which]) press(which, false); },
    onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => { if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) { event.preventDefault(); press(which, true); } },
    onKeyUp: (event: React.KeyboardEvent<HTMLButtonElement>) => { if (event.key === ' ' || event.key === 'Enter') press(which, false); },
  });

  if (failed) return <p className={styles.message} role="alert">{t('noWebgl')}</p>;
  return <div onKeyDown={event => key(event, true)} onKeyUp={event => key(event, false)}>
    <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label={t('canvasLabel3d')} tabIndex={0} data-crane="canvas" />
    {message}
    <div className={styles.controls} hidden={over}>
      <button type="button" className={styles.move} ref={element => { buttonsRef.current.right = element; }} data-crane="move" {...hold('right')}>
        <span aria-hidden="true">→</span> {t('move')}
      </button>
      <button type="button" className={styles.drop} ref={element => { buttonsRef.current.back = element; }} data-crane="back" {...hold('back')}>
        <span aria-hidden="true">↑</span> {t('back')}
      </button>
    </div>
  </div>;
}
