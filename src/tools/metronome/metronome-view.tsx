import { useEffect, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import styles from "./metronome.module.css";
import { BEATS_OPTIONS, DEFAULT_BPM, MAX_BPM, MIN_BPM, clampBpm, schedule, tap, tempoName, type Click, type Clock } from "./metronome";

const STORAGE_KEY = "paibot.metronome";
// How far ahead clicks are scheduled. A hidden tab's timers run about once a second, so it looks further ahead.
const AHEAD = 0.12;
const AHEAD_HIDDEN = 1.3;

function load(): { bpm: number; beats: number; volume: number } {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return {
      bpm: clampBpm(Number(saved.bpm) || DEFAULT_BPM),
      beats: (BEATS_OPTIONS as readonly number[]).includes(saved.beats) ? saved.beats : 4,
      volume: Math.min(1, Math.max(0, Number.isFinite(saved.volume) ? saved.volume : 0.7)),
    };
  } catch { return { bpm: DEFAULT_BPM, beats: 4, volume: 0.7 }; }
}

// A short, dry click; the first beat of the bar is higher and louder.
function click(audio: AudioContext, at: number, accent: boolean, volume: number) {
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.value = accent ? 1568 : 1046;
  const peak = (accent ? 0.9 : 0.6) * volume;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), at + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.06);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(at);
  oscillator.stop(at + 0.07);
}

export default function MetronomeView() {
  const t = useTranslations("App.metronome");
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [beats, setBeats] = useState(4);
  const [volume, setVolume] = useState(0.7);
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(-1);
  const audioRef = useRef<AudioContext | null>(null);
  const live = useRef({ bpm, beats, volume });
  live.current = { bpm, beats, volume };
  const tapsRef = useRef<number[]>([]);

  useEffect(() => {
    const saved = load();
    setBpm(saved.bpm);
    setBeats(saved.beats);
    setVolume(saved.volume);
  }, []);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ bpm, beats, volume })); } catch { /* storage unavailable */ }
  }, [bpm, beats, volume]);

  useEffect(() => {
    if (!running) return;
    const audio = audioRef.current;
    if (!audio) return;
    const clock: Clock = { next: audio.currentTime + 0.08, beat: 0 };
    const queue: Click[] = [];
    const tick = () => {
      const now = live.current;
      for (const next of schedule(clock, audio.currentTime, document.hidden ? AHEAD_HIDDEN : AHEAD, now.bpm, now.beats)) {
        click(audio, next.time, next.beat === 0, now.volume);
        queue.push(next);
      }
    };
    tick();
    const timer = setInterval(tick, 25);
    // The picture follows the audio clock, so the light and the click agree.
    let frame = 0;
    const show = () => {
      while (queue.length && queue[0]!.time <= audio.currentTime) setBeat(queue.shift()!.beat);
      frame = requestAnimationFrame(show);
    };
    frame = requestAnimationFrame(show);
    return () => { clearInterval(timer); cancelAnimationFrame(frame); setBeat(-1); };
  }, [running]);

  const toggle = () => {
    // The audio is made inside the press, which phones require.
    if (!audioRef.current) audioRef.current = new AudioContext();
    void audioRef.current.resume();
    setRunning(value => !value);
  };
  const change = (delta: number) => setBpm(value => clampBpm(value + delta));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      // On a focused button Space presses that button; the arrows are free.
      if (event.code === "Space") { if (target?.closest("button")) return; event.preventDefault(); toggle(); }
      else if (event.code === "ArrowUp" || event.code === "ArrowRight") { event.preventDefault(); change(event.shiftKey ? 10 : 1); }
      else if (event.code === "ArrowDown" || event.code === "ArrowLeft") { event.preventDefault(); change(event.shiftKey ? -10 : -1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => () => { void audioRef.current?.close(); }, []);

  const onTap = () => {
    const result = tap(tapsRef.current, performance.now());
    tapsRef.current = result.taps;
    if (result.bpm !== null) setBpm(result.bpm);
  };

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <div className={styles["panel"]} data-beat={beat} data-running={running || undefined}>
        <div className={styles["tempo"]}>
          <span className={styles["bpm"]} data-metronome="bpm">{bpm}</span>
          <span className={styles["unit"]}>BPM</span>
          <span className={styles["name"]}>{t(`tempo.${tempoName(bpm)}`)}</span>
        </div>
        <div className={styles["lights"]} aria-hidden="true">
          {Array.from({ length: beats }, (_, index) => (
            <span key={index} className={styles["light"]} data-first={index === 0 || undefined} data-on={beat === index || undefined} />
          ))}
        </div>
        <div className={styles["nudge"]}>
          {[-10, -1, 1, 10].map(delta => (
            <button key={delta} type="button" onClick={() => change(delta)} aria-label={t("nudge", { delta: (delta > 0 ? "+" : "−") + Math.abs(delta) })}>{delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`}</button>
          ))}
        </div>
        <input
          className={styles["slider"]}
          type="range"
          min={MIN_BPM}
          max={MAX_BPM}
          value={bpm}
          aria-label={t("bpmLabel")}
          onChange={event => setBpm(clampBpm(Number(event.target.value)))}
        />
        <button type="button" className={styles["start"]} data-metronome="toggle" onClick={toggle}>{running ? t("stop") : t("start")}</button>
      </div>

      <div className={styles["options"]}>
        <div className={controls.field}>
          <span className={controls.fieldLabel}>{t("beats")}</span>
          <div className={controls.mode} role="group" aria-label={t("beats")}>
            {BEATS_OPTIONS.map(option => (
              <button key={option} type="button" aria-pressed={beats === option} onClick={() => setBeats(option)}>{option}</button>
            ))}
          </div>
        </div>
        <button type="button" className={styles["tap"]} data-metronome="tap" onClick={onTap}>{t("tap")}</button>
        <label className={styles["volume"]}>
          <span className={controls.fieldLabel}>{t("volume")}</span>
          <input type="range" min={0} max={1} step={0.05} value={volume} onChange={event => setVolume(Number(event.target.value))} />
        </label>
      </div>
      <p className={controls.label}>{t("keys")}</p>
    </ToolLayout>
  );
}
