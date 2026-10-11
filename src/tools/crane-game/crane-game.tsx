import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'use-intl';
import ShareButtons from '../../components/share-buttons';
import ToolLayout from '../../components/tool-layout';
import controls from '../../components/tool-controls.module.css';
import type { DynamicT } from '../../lib/apps';
import { PLAYS_PER_ROUND, PRIZE_KINDS, type Event } from './engine';
import Machine2D from './machine-2d';
import { drawPrize } from './render';
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

type View = { phase: string; playsLeft: number; won: string[] };
type Message = { key: 'won' | 'slipped' | 'dropped' | 'missed'; prize?: string } | null;

// What the machine is given: the round to play (raised by "again"), and where to report what happened.
export interface MachineProps {
  round: number;
  onEvents: (events: Event[]) => void;
  onView: (view: View) => void;
  // A button was pressed; `starting` when it starts a play (the last message is cleared).
  onPress: (starting: boolean) => void;
}

export default function CraneGame() {
  const t = useTranslations('App.craneGame');
  const td = t as unknown as DynamicT;
  const locale = useLocale();
  const audioRef = useRef<AudioContext | null>(null);
  const soundRef = useRef(true);
  const savedRef = useRef<Saved>({ collection: {}, sound: true });
  const shownRef = useRef('');
  const machineRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState<View>({ phase: 'ready', playsLeft: PLAYS_PER_ROUND, won: [] });
  const [message, setMessage] = useState<Message>(null);
  const [collection, setCollection] = useState<Record<string, number>>({});
  const [sound, setSound] = useState(true);
  const [round, setRound] = useState(0);
  soundRef.current = sound;

  useEffect(() => {
    const saved = load();
    savedRef.current = saved;
    setCollection(saved.collection);
    setSound(saved.sound);
  }, []);
  useEffect(() => () => { void audioRef.current?.close(); }, []);

  const wake = useCallback(() => {
    if (!soundRef.current) return;
    try {
      audioRef.current ??= new AudioContext();
      if (audioRef.current.state === 'suspended') void audioRef.current.resume();
    } catch { /* no audio */ }
  }, []);

  // What happened in a frame: a message, a sound, and a won prize added to the collection.
  const onEvents = useCallback((events: Event[]) => {
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
        // "So close" only when it fell near the chute; dropped soon after lifting, it says so.
        setMessage({ key: event.late ? 'slipped' : 'dropped' });
        if (audio) tone(audio, [[392, 0.12], [311, 0.25]], 'sine');
      } else if (event.type === 'missed') {
        setMessage({ key: 'missed' });
      } else if (event.type === 'grabbed') {
        if (audio) tone(audio, [[660, 0.06]], 'square');
      }
    }
  }, []);
  const onView = useCallback((next: View) => {
    const key = `${next.phase}|${next.playsLeft}|${next.won.join()}`;
    if (key !== shownRef.current) { shownRef.current = key; setView({ ...next, won: [...next.won] }); }
  }, []);
  const onPress = useCallback((starting: boolean) => { wake(); if (starting) setMessage(null); }, [wake]);
  // The machine, counters to buttons, as large as the screen allows once the site's header is out of the way: on opening the page, if it
  // does not fit below the header, the page is scrolled to it (unless the visitor has scrolled already).
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const box = machineRef.current?.getBoundingClientRect();
      if (!box || window.scrollY > 0 || box.bottom <= window.innerHeight) return;
      window.scrollTo({ top: window.scrollY + (box.height <= window.innerHeight - 16 ? box.bottom - window.innerHeight + 8 : box.top - 8) });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  function again() { setRound(round + 1); setMessage(null); }
  function toggleSound() {
    const next = !sound;
    setSound(next);
    soundRef.current = next;
    if (next) wake();
    savedRef.current = { ...savedRef.current, sound: next };
    save(savedRef.current);
  }

  const owned = PRIZE_KINDS.filter(kind => collection[kind.id]).length;
  const prizeName = (id: string) => td(`prizes.${id}`);
  const messageLine = <p className={styles.message} role="status" aria-live="polite" data-crane="message" data-kind={message?.key}>
    {message ? t(message.key, { prize: message.prize ? prizeName(message.prize) : '' }) : ' '}
  </p>;
  const machine = { round, onEvents, onView, onPress, message: messageLine };

  return (
    <ToolLayout title={t('title')} compact>
      <div className={styles.machine} ref={machineRef}>
        <dl className={styles.hud}>
          <div><dt>{t('playsLeft')}</dt><dd data-crane="plays" data-left={view.playsLeft}>{t('playsCount', { count: view.playsLeft })}</dd></div>
          <div><dt>{t('thisRound')}</dt><dd data-crane="won">{view.won.length}</dd></div>
        </dl>
        <Machine2D {...machine} />
        {view.phase === 'over' && <div className={styles.result} data-crane="result">
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

// A prize drawn small, as in the side view.
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
