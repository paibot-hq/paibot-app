import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import styles from "./strings.module.css";
import { MAX_SEMITONES, STRINGS, frequency, noteName, positionOf, pressed, stringAt, type Instrument } from "./theory";
import type { Synth } from "./synth";

const STORAGE_KEY = "paibot.strings";
// The picture is drawn in these units: the open-string area on the left, the nut, then the neck; the strings are 60 apart.
const WIDTH = 520, HEIGHT = 240, NUT = 60, NECK = 440, GAP = HEIGHT / STRINGS.length;
const TREMOLO_MS = 65;
const FRET_DOTS = [3, 5, 7, 9];

type Settings = { instrument: Instrument; tremolo: boolean; snap: boolean; vibrato: boolean; volume: number };
const DEFAULTS: Settings = { instrument: "mandolin", tremolo: false, snap: true, vibrato: true, volume: 0.7 };

function load(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return {
      instrument: saved.instrument === "violin" ? "violin" : "mandolin",
      tremolo: saved.tremolo === true,
      snap: saved.snap !== false,
      vibrato: saved.vibrato !== false,
      volume: Math.min(1, Math.max(0, Number.isFinite(saved.volume) ? saved.volume : DEFAULTS.volume)),
    };
  } catch { return DEFAULTS; }
}

type Touch = { course: number; semitones: number; x: number; y: number };

export default function StringsView() {
  const t = useTranslations("App.strings");
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const { instrument, tremolo, snap, vibrato, volume } = settings;
  const [fingers, setFingers] = useState<Record<number, Touch>>({});
  const [note, setNote] = useState<{ name: string; hz: number; cents: number } | null>(null);
  const [rings, setRings] = useState<number[]>([0, 0, 0, 0]);
  const synthRef = useRef<Synth | null>(null);
  const touches = useRef(new Map<number, Touch>());
  const live = useRef(settings);
  live.current = settings;

  useEffect(() => { setSettings(load()); }, []);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* storage unavailable */ }
    synthRef.current?.setVolume(settings.volume);
  }, [settings]);
  const set = (change: Partial<Settings>) => setSettings(current => ({ ...current, ...change }));

  // The sound code is loaded when the page opens, and the audio is made on the first touch itself, inside the press: phones allow it only then.
  const moduleRef = useRef<typeof import("./synth") | null>(null);
  useEffect(() => { void import("./synth").then(loaded => { moduleRef.current = loaded; }); }, []);
  const synth = (): Synth | null => {
    if (!synthRef.current && moduleRef.current) {
      synthRef.current = moduleRef.current.createSynth();
      synthRef.current.setVolume(live.current.volume);
    }
    synthRef.current?.resume();
    return synthRef.current;
  };
  useEffect(() => () => { synthRef.current?.dispose(); synthRef.current = null; }, []);

  const stopAll = () => {
    for (const id of touches.current.keys()) synthRef.current?.bowStop(String(id));
    touches.current.clear();
    setFingers({});
  };
  useEffect(() => { stopAll(); setNote(null); }, [instrument]);

  const hz = (course: number, semitones: number) => frequency(STRINGS[course]!.midi + semitones);
  const show = (course: number, semitones: number) => {
    const midi = STRINGS[course]!.midi + semitones;
    setNote({ name: noteName(midi), hz: Math.round(frequency(midi) * 10) / 10, cents: Math.round((midi - Math.round(midi)) * 100) });
  };
  const ring = (course: number) => setRings(current => current.map((value, index) => (index === course ? value + 1 : value)));

  // Where a touch is on the neck, from the page's coordinates.
  const locate = (event: ReactPointerEvent<SVGSVGElement>): Touch => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * HEIGHT;
    const course = stringAt(y / HEIGHT);
    return { course, semitones: pressed(live.current.instrument, (x - NUT) / NECK, live.current.snap), x, y };
  };

  // `before` is where the touch was a moment ago, or null for a new touch: a mandolin picks on a new touch and on reaching a new string (a
  // strum), and a slide along a string is silent until the next pick; a violin goes on sounding, and changes string or pitch.
  const sound = (id: string, touch: Touch, before: Touch | null) => {
    const player = synth();
    if (!player) return;
    const changed = !before || before.course !== touch.course;
    if (live.current.instrument === "mandolin") {
      if (changed) { player.pluck(touch.course, hz(touch.course, touch.semitones)); ring(touch.course); show(touch.course, touch.semitones); }
    } else if (changed) {
      player.bowStop(id);
      player.bowStart(id, hz(touch.course, touch.semitones), live.current.vibrato);
      ring(touch.course);
      show(touch.course, touch.semitones);
    } else {
      player.bowMove(id, hz(touch.course, touch.semitones));
      show(touch.course, touch.semitones);
    }
  };

  const onDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const touch = locate(event);
    touches.current.set(event.pointerId, touch);
    setFingers(current => ({ ...current, [event.pointerId]: touch }));
    sound(String(event.pointerId), touch, null);
  };
  const onMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const before = touches.current.get(event.pointerId);
    if (!before) return;
    const touch = locate(event);
    touches.current.set(event.pointerId, touch);
    setFingers(current => ({ ...current, [event.pointerId]: touch }));
    sound(String(event.pointerId), touch, before);
  };
  const onUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (live.current.instrument === "violin") synthRef.current?.bowStop(String(event.pointerId));
    touches.current.delete(event.pointerId);
    setFingers(current => { const next = { ...current }; delete next[event.pointerId]; return next; });
  };

  // Tremolo: the held touch picks again and again, with a short ring.
  useEffect(() => {
    if (instrument !== "mandolin" || !tremolo) return;
    const timer = setInterval(() => {
      for (const touch of touches.current.values()) synthRef.current?.pluck(touch.course, hz(touch.course, touch.semitones), true);
    }, TREMOLO_MS);
    return () => clearInterval(timer);
  }, [instrument, tremolo]);

  // The open strings as buttons, for the keyboard and for tuning by ear.
  const playOpen = (course: number) => {
    const player = synth();
    if (!player) return;
    show(course, 0);
    ring(course);
    if (live.current.instrument === "mandolin") player.pluck(course, hz(course, 0));
    else {
      const id = `open${course}`;
      player.bowStart(id, hz(course, 0), live.current.vibrato);
      setTimeout(() => player.bowStop(id), 1100);
    }
  };

  const fretX = (semitones: number) => NUT + NECK * positionOf(semitones);
  const wood = instrument === "mandolin" ? "#5b3a26" : "#1f1916";
  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <div className={controls.mode} role="group" aria-label={t("instrument")}>
        {(["mandolin", "violin"] as const).map(option => (
          <button key={option} type="button" aria-pressed={instrument === option} data-strings={`pick-${option}`} onClick={() => set({ instrument: option })}>{t(option)}</button>
        ))}
      </div>

      <svg
        className={styles["neck"]}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={t(`${instrument}Label`)}
        data-instrument={instrument}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill={wood} />
        <rect x={0} y={0} width={NUT} height={HEIGHT} fill="#000" opacity={0.28} />
        <rect x={NUT - 4} y={0} width={5} height={HEIGHT} fill="#efe6d2" />
        {/* The frets (a mandolin) or faint marks at each semitone (a violin has none: the finger finds the note). */}
        {Array.from({ length: MAX_SEMITONES }, (_, index) => index + 1).map(n => (
          <line
            key={n}
            data-fret={n}
            x1={fretX(n)} x2={fretX(n)} y1={0} y2={HEIGHT}
            stroke={instrument === "mandolin" ? "#cfd3d8" : "#efe6d2"}
            strokeWidth={instrument === "mandolin" ? 2.5 : 1}
            opacity={instrument === "mandolin" ? 0.95 : n % 12 === 7 || n === 12 ? 0.35 : 0.14}
          />
        ))}
        {FRET_DOTS.map(n => <circle key={n} cx={(fretX(n - 1) + fretX(n)) / 2} cy={HEIGHT - 10} r={4} fill="#efe6d2" opacity={0.7} />)}
        <circle cx={(fretX(11) + fretX(12)) / 2} cy={HEIGHT - 10} r={4} fill="#efe6d2" opacity={0.7} />
        {STRINGS.map((string, course) => {
          const y = GAP * course + GAP / 2;
          const width = 1.2 + course * 0.5;
          const bowed = Object.values(fingers).some(finger => finger.course === course) && instrument === "violin";
          return (
            <g key={`${string.name}-${rings[course]}`} className={styles["string"]} data-string={course} data-ringing={bowed || rings[course] ? true : undefined} data-bowed={bowed || undefined}>
              {instrument === "mandolin" ? (
                <>
                  <line x1={0} x2={WIDTH} y1={y - 3} y2={y - 3} stroke="#e3e6ea" strokeWidth={width} />
                  <line x1={0} x2={WIDTH} y1={y + 3} y2={y + 3} stroke="#e3e6ea" strokeWidth={width} />
                </>
              ) : (
                <line x1={0} x2={WIDTH} y1={y} y2={y} stroke={course === 3 ? "#d7b46a" : "#e3e6ea"} strokeWidth={width + 0.6} />
              )}
              <text x={NUT / 2} y={y + 5} textAnchor="middle" fill="#efe6d2" fontSize={16} fontWeight={700}>{string.name}</text>
            </g>
          );
        })}
        {Object.entries(fingers).map(([id, finger]) => (
          <circle key={id} cx={Math.max(8, Math.min(WIDTH - 8, finger.x))} cy={GAP * finger.course + GAP / 2} r={11} fill="#7fb4dc" opacity={0.8} stroke="#fff" strokeWidth={2} />
        ))}
      </svg>

      <p className={styles["note"]} data-strings="note" data-note={note?.name ?? ""} aria-live="polite">
        {note ? `${note.name}  ${note.hz} Hz${instrument === "violin" && !snap && note.cents ? `  ${note.cents > 0 ? "+" : ""}${note.cents}¢` : ""}` : t("hint")}
      </p>

      <div className={styles["opens"]} role="group" aria-label={t("open")}>
        {STRINGS.map((string, course) => (
          <button key={string.name} type="button" onClick={() => playOpen(course)} aria-label={t("openString", { string: `${string.name}` })}>{string.name}</button>
        ))}
      </div>

      <div className={styles["options"]}>
        {instrument === "mandolin" ? (
          <label className={styles["check"]}><input type="checkbox" checked={tremolo} onChange={event => set({ tremolo: event.target.checked })} /> {t("tremolo")}</label>
        ) : (
          <>
            <label className={styles["check"]}><input type="checkbox" checked={snap} onChange={event => set({ snap: event.target.checked })} /> {t("snap")}</label>
            <label className={styles["check"]}><input type="checkbox" checked={vibrato} onChange={event => set({ vibrato: event.target.checked })} /> {t("vibrato")}</label>
          </>
        )}
        <label className={styles["check"]}>{t("volume")} <input type="range" min={0} max={1} step={0.05} value={volume} onChange={event => set({ volume: Number(event.target.value) })} /></label>
      </div>
      <p className={controls.label}>{t(`${instrument}Keys`)}</p>
    </ToolLayout>
  );
}
