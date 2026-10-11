import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useLocale, useTranslations } from 'use-intl';
import ShareButtons from '../../components/share-buttons';
import ToolLayout from '../../components/tool-layout';
import controls from '../../components/tool-controls.module.css';
import type { DynamicT } from '../../lib/apps';
import { createScene, drop, HEIGHT, holdMove, newRound, PLAYS_PER_ROUND, PRIZE_KINDS, step, WIDTH, type ClawPhase, type Event, type Scene } from './engine';
import { drawFrame, drawPrize } from './render';
import styles from './crane-game.module.css';

// The prizes ever won in this browser, by kind, and whether the sound is on.
const STORAGE = 'crane-game:v1';
type Saved = { collection: Record<string, number>; sound: boolean };
function load(): Saved {
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE) ?? 'null');
    const collection = raw?.collection && typeof raw.collection === 'object' ? raw.collection : {};
    return { collection, sound: raw?.sound !== false };
  } catch { return { collection: {}, sound: true }; }
}
function save(value: Saved) {
  try { window.localStorage.setItem(STORAGE, JSON.stringify(value)); } catch { /* private window or blocked storage */ }
}

// A few short tones; sound only after a tap, as browsers require.
function tone(audio: AudioContext, notes: [number, number][], type: OscillatorType = 'triangle') {
  let at = audio.currentTime;
  for (const [frequency, length] of notes) {
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.type = type; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.18, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(at); oscillator.stop(at + length + 0.02);
    at += length * 0.8;
  }
}

type View = { phase: ClawPhase; playsLeft: number; won: string[] };
type Message = { key: 'won' | 'slipped' | 'missed'; prize?: string } | null;

export default function CraneGame() {
  const t = useTranslations('App.craneGame');
  const td = t as unknown as DynamicT;
  const locale = useLocale();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const movingRef = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);
  const soundRef = useRef(true);
  const savedRef = useRef<Saved>({ collection: {}, sound: true });
  const [view, setView] = useState<View>({ phase: 'ready', playsLeft: PLAYS_PER_ROUND, won: [] });
  const [message, setMessage] = useState<Message>(null);
  const [collection, setCollection] = useState<Record<string, number>>({});
  const [sound, setSound] = useState(true);
  soundRef.current = sound;

  useEffect(() => {
    const saved = load();
    savedRef.current = saved;
    setCollection(saved.collection);
    setSound(saved.sound);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
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
    let frame = 0, last = performance.now(), shown = '';
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const scene = sceneRef.current!;
      handle(step(scene, dt, Math.random, movingRef.current));
      drawFrame(context, scene, document.documentElement.dataset.theme === 'dark');
      const next: View = { phase: scene.phase, playsLeft: scene.playsLeft, won: [...scene.won] };
      const key = JSON.stringify(next);
      if (key !== shown) { shown = key; setView(next); }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);

  useEffect(() => () => { void audioRef.current?.close(); }, []);

  // What happened in a frame: a message, a sound, and a won prize added to the collection.
  function handle(events: Event[]) {
    const audio = soundRef.current ? audioRef.current : null;
    for (const event of events) {
      if (event.type === 'won') {
        const saved = savedRef.current;
        saved.collection = { ...saved.collection, [event.kind]: (saved.collection[event.kind] ?? 0) + 1 };
        save(saved);
        setCollection(saved.collection);
        setMessage({ key: 'won', prize: event.kind });
        if (audio) tone(audio, [[523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.3]]);
        try { navigator.vibrate?.([20, 40, 20]); } catch { /* not supported */ }
      } else if (event.type === 'slipped') {
        setMessage({ key: 'slipped' });
        if (audio) tone(audio, [[392, 0.12], [311, 0.25]], 'sine');
      } else if (event.type === 'missed') {
        setMessage({ key: 'missed' });
      } else if (event.type === 'grabbed') {
        if (audio) tone(audio, [[660, 0.06]], 'square');
      }
    }
  }

  function wake() {
    if (!soundRef.current) return;
    try {
      audioRef.current ??= new AudioContext();
      if (audioRef.current.state === 'suspended') void audioRef.current.resume();
    } catch { /* no audio */ }
  }

  // "Move" is held: pressed starts it, released (or the pointer leaving the button) stops it for good.
  function moveDown() {
    const scene = sceneRef.current;
    if (!scene) return;
    wake();
    if (scene.phase === 'ready') setMessage(null);
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
    wake();
    if (scene.phase === 'ready') setMessage(null);
    movingRef.current = false;
    if (scene.phase === 'moving') holdMove(scene, false);
    drop(scene);
  }
  function again() {
    const scene = sceneRef.current;
    if (!scene) return;
    newRound(scene, Math.random);
    setMessage(null);
  }
  // The keyboard: → held moves, ↓ / Space / Enter drops.
  function key(event: ReactKeyboardEvent<HTMLDivElement>, down: boolean) {
    if (event.key === 'ArrowRight') { event.preventDefault(); if (down && !event.repeat) moveDown(); if (!down) moveUp(); }
    if (down && (event.key === 'ArrowDown' || event.key === ' ' || event.key === 'Enter') && (event.target as HTMLElement).tagName !== 'BUTTON') { event.preventDefault(); dropClaw(); }
  }
  function toggleSound() {
    const next = !sound;
    setSound(next);
    soundRef.current = next;
    if (next) wake();
    savedRef.current = { ...savedRef.current, sound: next };
    save(savedRef.current);
  }

  const canMove = view.phase === 'ready' || view.phase === 'moving';
  const canDrop = view.phase === 'ready' || view.phase === 'moving' || view.phase === 'aimed';
  const owned = PRIZE_KINDS.filter(kind => collection[kind.id]).length;
  const prizeName = (id: string) => td(`prizes.${id}`);

  return (
    <ToolLayout title={t('title')} compact>
      <div className={styles.machine} onKeyDown={event => key(event, true)} onKeyUp={event => key(event, false)}>
        <dl className={styles.hud}>
          <div><dt>{t('playsLeft')}</dt><dd data-crane="plays">{view.playsLeft} / {PLAYS_PER_ROUND}</dd></div>
          <div><dt>{t('thisRound')}</dt><dd data-crane="won">{view.won.length}</dd></div>
        </dl>
        <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label={t('canvasLabel')} tabIndex={0} data-crane="canvas" />
        <p className={styles.message} role="status" aria-live="polite" data-crane="message" data-kind={message?.key}>
          {message ? t(message.key, { prize: message.prize ? prizeName(message.prize) : '' }) : ' '}
        </p>
        {view.phase !== 'over' ? <div className={styles.controls}>
          <button type="button" className={styles.move} disabled={!canMove} data-crane="move"
            onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); moveDown(); }}
            onPointerUp={moveUp} onPointerCancel={moveUp} onLostPointerCapture={moveUp}
            onKeyDown={event => { if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) { event.preventDefault(); moveDown(); } }}
            onKeyUp={event => { if (event.key === ' ' || event.key === 'Enter') moveUp(); }}>
            <span aria-hidden="true">→</span> {t('move')}
          </button>
          <button type="button" className={styles.drop} disabled={!canDrop} onClick={dropClaw} data-crane="drop">
            <span aria-hidden="true">↓</span> {t('drop')}
          </button>
        </div> : <div className={styles.result} data-crane="result">
          <p className={styles.resultTitle}>{t('roundOver', { count: view.won.length, plays: PLAYS_PER_ROUND })}</p>
          {view.won.length > 0 && <ul className={styles.wonList}>
            {view.won.map((id, index) => <li key={index}><PrizeIcon kind={id} />{prizeName(id)}</li>)}
          </ul>}
          <button type="button" className={`auth-link ${styles.big}`} onClick={again} data-crane="again" autoFocus>{t('newRound')}</button>
        </div>}
      </div>
      {/* The how-to under the buttons, so that the machine and its buttons fit a phone's screen together. */}
      <p className={`${controls.label} ${styles.intro}`}>{t('intro')}</p>
      {view.phase === 'over' && <ShareButtons path={`/${locale}/crane-game`}
        text={view.won.length ? t('shareText', { prize: [...new Set(view.won)].map(prizeName).join('、'), count: view.won.length, plays: PLAYS_PER_ROUND }) : t('shareTextNone', { plays: PLAYS_PER_ROUND })} />}
      <section className={styles.collection} aria-labelledby="crane-collection">
        <h2 id="crane-collection">{t('collection')} <span data-crane="owned">{owned} / {PRIZE_KINDS.length}</span></h2>
        <ul>
          {PRIZE_KINDS.map(kind => <li key={kind.id} data-owned={collection[kind.id] ? true : undefined} data-rare={kind.rare || undefined}>
            {collection[kind.id] ? <><PrizeIcon kind={kind.id} /><span>{prizeName(kind.id)}</span><small>×{collection[kind.id]}</small></>
              : <><span className={styles.unknown} aria-hidden="true">?</span><span>{kind.rare ? t('unknownRare') : t('unknown')}</span></>}
          </li>)}
        </ul>
      </section>
      <div className={styles.buttons}>
        <button type="button" className="auth-link" aria-pressed={sound} onClick={toggleSound} data-crane="sound">{t('sound')}: {sound ? t('on') : t('off')}</button>
      </div>
      <p className={styles.hint}>{t('hint')}</p>
    </ToolLayout>
  );
}

// A prize drawn small, as in the machine.
function PrizeIcon({ kind }: { kind: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current, context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = 32 * ratio; canvas.height = 32 * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawPrize(context, kind, 16, 16, 13);
  }, [kind]);
  return <canvas ref={ref} className={styles.icon} width={32} height={32} aria-hidden="true" />;
}
