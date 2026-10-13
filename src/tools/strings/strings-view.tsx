import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import styles from "./strings.module.css";
import { INSTRUMENTS, INSTRUMENT_IDS, type InstrumentId, type InstrumentSpec, type PluckSound } from "./instruments";
import { frequency, noteName, positionOf, pressed, stringAt } from "./theory";
import type { Synth } from "./synth";

const STORAGE_KEY = "paibot.strings";
// The picture is drawn in these units: the open-string area on the left, the nut, then the neck; the strings are GAP apart.
const WIDTH = 520, NUT = 60, NECK = 440, GAP = 60;
const TREMOLO_MS = 65;
const INLAYS = [3, 5, 7, 9, 15];

type Settings = { instrument: InstrumentId; tremolo: boolean; snap: boolean; vibrato: boolean; pizzicato: boolean; volume: number };
const DEFAULTS: Settings = { instrument: "mandolin", tremolo: false, snap: true, vibrato: true, pizzicato: false, volume: 0.7 };

function load(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return {
      instrument: (INSTRUMENT_IDS as readonly string[]).includes(saved.instrument) ? saved.instrument : DEFAULTS.instrument,
      tremolo: saved.tremolo === true,
      snap: saved.snap !== false,
      vibrato: saved.vibrato !== false,
      pizzicato: saved.pizzicato === true,
      volume: Math.min(1, Math.max(0, Number.isFinite(saved.volume) ? saved.volume : DEFAULTS.volume)),
    };
  } catch { return DEFAULTS; }
}

type Touch = { course: number; semitones: number; x: number };

// What a touch does on this instrument: pluck, or bow. A bowed instrument can be plucked instead (pizzicato).
function playing(spec: InstrumentSpec, pizzicato: boolean): { pluck: PluckSound } | { bow: Extract<InstrumentSpec["sound"], { kind: "bow" }> } {
  if (spec.sound.kind === "bow") return pizzicato && spec.pizzicato ? { pluck: spec.pizzicato } : { bow: spec.sound };
  return { pluck: spec.sound };
}

export default function StringsView() {
  const t = useTranslations("App.strings");
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const { tremolo, snap, vibrato, pizzicato, volume } = settings;
  const spec = INSTRUMENTS[settings.instrument];
  const { strings, reach } = spec;
  const height = Math.max(3, strings.length) * GAP;
  const mode = playing(spec, pizzicato);
  const bowed = "bow" in mode;
  const [fingers, setFingers] = useState<Record<number, Touch>>({});
  const [note, setNote] = useState<{ name: string; hz: number; cents: number } | null>(null);
  const [rings, setRings] = useState<number[]>([]);
  const synthRef = useRef<Synth | null>(null);
  const touches = useRef(new Map<number, Touch>());
  const live = useRef({ settings, spec, mode });
  live.current = { settings, spec, mode };

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
      synthRef.current.setVolume(live.current.settings.volume);
    }
    synthRef.current?.resume();
    return synthRef.current;
  };
  useEffect(() => () => { synthRef.current?.dispose(); synthRef.current = null; }, []);

  // A new instrument, or a change between bow and pizzicato, lets go of everything that is sounding.
  useEffect(() => {
    for (const id of touches.current.keys()) synthRef.current?.bowStop(String(id));
    touches.current.clear();
    setFingers({});
    setNote(null);
    setRings(strings.map(() => 0));
  }, [settings.instrument, pizzicato]);

  const midiOf = (course: number, semitones: number) => strings[course]!.midi + semitones;
  const show = (course: number, semitones: number) => {
    const midi = midiOf(course, semitones);
    setNote({ name: noteName(midi), hz: Math.round(frequency(midi) * 10) / 10, cents: Math.round((midi - Math.round(midi)) * 100) });
  };
  const ring = (course: number) => setRings(current => current.map((value, index) => (index === course ? value + 1 : value)));

  // Where a touch is on the neck, from the page's coordinates.
  const locate = (event: ReactPointerEvent<SVGSVGElement>): Touch => {
    const { settings: now, spec: instrument } = live.current;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const y = (event.clientY - rect.top) / rect.height;
    const course = stringAt(y, instrument.strings.length);
    return { course, semitones: pressed(instrument, instrument.strings[course]!, (x - NUT) / NECK, now.snap), x };
  };

  // `before` is where the touch was a moment ago, or null for a new touch: a plucked instrument picks on a new touch and on reaching a new
  // string (a strum), and a slide along a string is silent until the next pick; a bowed one goes on sounding, and changes string or pitch.
  const sound = (id: string, touch: Touch, before: Touch | null) => {
    const player = synth();
    if (!player) return;
    const { spec: instrument, mode: how, settings: now } = live.current;
    const changed = !before || before.course !== touch.course;
    const hz = frequency(midiOf(touch.course, touch.semitones));
    if ("pluck" in how) {
      if (changed) { player.pluck(instrument.id, touch.course, hz, how.pluck); ring(touch.course); show(touch.course, touch.semitones); }
    } else if (changed) {
      player.bowStop(id);
      player.bowStart(instrument.id, id, hz, how.bow, now.vibrato);
      ring(touch.course);
      show(touch.course, touch.semitones);
    } else {
      player.bowMove(id, hz);
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
    if ("bow" in live.current.mode) synthRef.current?.bowStop(String(event.pointerId));
    touches.current.delete(event.pointerId);
    setFingers(current => { const next = { ...current }; delete next[event.pointerId]; return next; });
  };

  // Tremolo: the held touch picks again and again, with a short ring.
  useEffect(() => {
    if (!spec.tremolo || !tremolo || bowed) return;
    const timer = setInterval(() => {
      const how = live.current.mode;
      if (!("pluck" in how)) return;
      for (const touch of touches.current.values()) synthRef.current?.pluck(live.current.spec.id, touch.course, frequency(midiOf(touch.course, touch.semitones)), how.pluck, true);
    }, TREMOLO_MS);
    return () => clearInterval(timer);
  }, [settings.instrument, tremolo, bowed]);

  // The open strings as buttons, for the keyboard and for tuning by ear.
  const playOpen = (course: number) => {
    const player = synth();
    if (!player) return;
    const { spec: instrument, mode: how, settings: now } = live.current;
    const hz = frequency(midiOf(course, 0));
    show(course, 0);
    ring(course);
    if ("pluck" in how) player.pluck(instrument.id, course, hz, how.pluck);
    else {
      const id = `open${course}`;
      player.bowStart(instrument.id, id, hz, how.bow, now.vibrato);
      setTimeout(() => player.bowStop(id), 1100);
    }
  };

  const fretX = (semitones: number) => NUT + NECK * positionOf(semitones, reach);
  const look = spec.look;
  const stringWidth = (course: number) => (look.even ? 2 : 1 + (course / Math.max(1, strings.length - 1)) * 1.6);
  const unique = strings.map(string => noteName(string.midi));
  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <div className={controls.mode} role="group" aria-label={t("instrument")}>
        {INSTRUMENT_IDS.map(option => (
          <button key={option} type="button" aria-pressed={settings.instrument === option} data-strings={`pick-${option}`} onClick={() => set({ instrument: option })}>{t(`names.${option}`)}</button>
        ))}
      </div>

      <svg
        className={styles["neck"]}
        style={{ aspectRatio: `${WIDTH} / ${height}` }}
        viewBox={`0 0 ${WIDTH} ${height}`}
        role="img"
        aria-label={t(spec.fretted ? "neckFretted" : "neckFretless", { instrument: t(`names.${spec.id}`), count: strings.length })}
        data-instrument={spec.id}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <rect x={0} y={0} width={WIDTH} height={height} fill={look.wood} />
        <rect x={0} y={0} width={NUT} height={height} fill="#000" opacity={0.28} />
        <rect x={NUT - 4} y={0} width={5} height={height} fill="#efe6d2" />
        {/* The frets (a fretted instrument) or faint marks at each semitone (the finger finds the note). */}
        {Array.from({ length: reach }, (_, index) => index + 1).map(n => (
          <line
            key={n}
            data-fret={n}
            x1={fretX(n)} x2={fretX(n)} y1={0} y2={height}
            stroke={spec.fretted ? look.fret : look.inlay}
            strokeWidth={spec.fretted ? 2.5 : 1}
            opacity={spec.fretted ? 0.95 : n % 12 === 7 || n === 12 ? 0.35 : 0.14}
          />
        ))}
        {[...INLAYS, 12].filter(n => n <= reach).map(n => (
          <circle key={n} cx={(fretX(n - 1) + fretX(n)) / 2} cy={height - 10} r={4} fill={look.inlay} opacity={0.7} />
        ))}
        {strings.map((string, course) => {
          const y = GAP * course + GAP / 2;
          const width = stringWidth(course);
          const start = string.from ? fretX(string.from) : NUT;
          const held = bowed && Object.values(fingers).some(finger => finger.course === course);
          // The colour of the lowest strings of a guitar or a violin is that of wound metal.
          const color = course === strings.length - 1 && strings.length >= 4 && !look.even && spec.id !== "mandolin" && spec.id !== "banjo" ? "#d7b46a" : look.string;
          return (
            <g key={`${course}-${rings[course] ?? 0}`} className={styles["string"]} data-string={course} data-ringing={held || rings[course] ? true : undefined} data-bowed={held || undefined}>
              {spec.sound.kind === "pluck" && spec.sound.strings === 2 ? (
                <>
                  <line x1={start} x2={WIDTH} y1={y - 3} y2={y - 3} stroke={color} strokeWidth={width} />
                  <line x1={start} x2={WIDTH} y1={y + 3} y2={y + 3} stroke={color} strokeWidth={width} />
                </>
              ) : (
                <line x1={start} x2={WIDTH} y1={y} y2={y} stroke={color} strokeWidth={width + 0.6} />
              )}
              {string.from ? <circle cx={start} cy={y} r={4} fill="#efe6d2" /> : null}
              <text x={NUT / 2} y={y + 5} textAnchor="middle" fill="#efe6d2" fontSize={16} fontWeight={700}>{string.name}</text>
            </g>
          );
        })}
        {Object.entries(fingers).map(([id, finger]) => (
          <circle key={id} cx={Math.max(8, Math.min(WIDTH - 8, finger.x))} cy={GAP * finger.course + GAP / 2} r={11} fill="#7fb4dc" opacity={0.8} stroke="#fff" strokeWidth={2} />
        ))}
      </svg>

      <p className={styles["note"]} data-strings="note" data-note={note?.name ?? ""} aria-live="polite">
        {note ? `${note.name}  ${note.hz} Hz${!spec.fretted && !snap && note.cents ? `  ${note.cents > 0 ? "+" : ""}${note.cents}¢` : ""}` : t("hint")}
      </p>

      <div className={styles["opens"]} role="group" aria-label={t("open")}>
        {strings.map((string, course) => (
          <button key={course} type="button" onClick={() => playOpen(course)} aria-label={t("openString", { string: unique[course]! })}>{unique[course]}</button>
        ))}
      </div>

      <div className={styles["options"]}>
        {spec.tremolo && <label className={styles["check"]}><input type="checkbox" checked={tremolo} onChange={event => set({ tremolo: event.target.checked })} /> {t("tremolo")}</label>}
        {!spec.fretted && <label className={styles["check"]}><input type="checkbox" checked={snap} onChange={event => set({ snap: event.target.checked })} /> {t("snap")}</label>}
        {spec.sound.kind === "bow" && (
          <>
            <label className={styles["check"]}><input type="checkbox" checked={pizzicato} onChange={event => set({ pizzicato: event.target.checked })} /> {t("pizzicato")}</label>
            {!pizzicato && <label className={styles["check"]}><input type="checkbox" checked={vibrato} onChange={event => set({ vibrato: event.target.checked })} /> {t("vibrato")}</label>}
          </>
        )}
        <label className={styles["check"]}>{t("volume")} <input type="range" min={0} max={1} step={0.05} value={volume} onChange={event => set({ volume: Number(event.target.value) })} /></label>
      </div>
      <p className={controls.label}>{t(bowed ? "keysBow" : spec.fretted ? "keysFretted" : "keysFretless")}</p>
    </ToolLayout>
  );
}
