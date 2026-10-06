"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import form from "../../components/tool-form.module.css";
import styles from "./pomodoro-timer.module.css";
import { DEFAULT_PLAN, clock, minutes, next, progress, remaining, seconds, type Phase, type Plan } from "./pomodoro";

const RING = 2 * Math.PI * 88;

// A soft double beep for the end of a phase.
function beep(audio: AudioContext) {
  for (const [offset, frequency] of [[0, 880], [0.22, 1175]] as const) {
    const at = audio.currentTime + offset;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.18, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.4);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.45);
  }
}

export default function PomodoroTimer() {
  const t = useTranslations("App.pomodoro");
  const [plan, setPlan] = useState<Plan>(DEFAULT_PLAN);
  const [phase, setPhase] = useState<Phase>("focus");
  const [done, setDone] = useState(0);
  const [running, setRunning] = useState(false);
  const [left, setLeft] = useState(seconds("focus", DEFAULT_PLAN));
  const [sound, setSound] = useState(true);
  const endsAt = useRef(0);
  const audio = useRef<AudioContext | null>(null);
  const live = useRef({ plan, phase, done, sound });
  live.current = { plan, phase, done, sound };

  function begin(nextPhase: Phase, nextDone: number, auto: boolean) {
    setPhase(nextPhase);
    setDone(nextDone);
    const total = seconds(nextPhase, live.current.plan);
    setLeft(total);
    endsAt.current = Date.now() + total * 1000;
    setRunning(auto);
  }

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      const rest = remaining(endsAt.current, Date.now());
      setLeft(rest);
      if (rest > 0) return;
      const now = live.current;
      if (now.sound && audio.current) beep(audio.current);
      const after = next(now.phase, now.done, now.plan);
      begin(after.phase, after.done, true);
    }, 250);
    return () => clearInterval(timer);
    // `begin` only reads refs and setters, so the timer need not restart when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // The time in the tab's title, so it can be read from another tab.
  useEffect(() => {
    const original = document.title;
    document.title = running ? `${clock(left)} ${t(`phase.${phase}`)} | PAIBOT` : original;
    return () => { document.title = original; };
  }, [left, phase, running, t]);

  function toggle() {
    if (!audio.current && sound) audio.current = new AudioContext();
    void audio.current?.resume();
    if (running) { setRunning(false); return; }
    endsAt.current = Date.now() + left * 1000;
    setRunning(true);
  }

  function reset() {
    begin("focus", 0, false);
  }

  function skip() {
    const after = next(phase, done, plan);
    begin(after.phase, after.done, running);
  }

  function setMinutes(key: "focus" | "short" | "long", value: string) {
    const updated = { ...plan, [key]: minutes(Number(value), plan[key]) };
    setPlan(updated);
    if (!running && key === phase) setLeft(seconds(phase, updated));
  }

  const whole = seconds(phase, plan);
  const filled = progress(left, whole);

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <div className={styles.dial} data-phase={phase}>
        <svg viewBox="0 0 200 200" className={styles.ring} aria-hidden="true">
          <circle cx="100" cy="100" r="88" className={styles.track} />
          <circle cx="100" cy="100" r="88" className={styles.bar} strokeDasharray={RING} strokeDashoffset={RING * (1 - filled)} transform="rotate(-90 100 100)" />
        </svg>
        <div className={styles.inside}>
          <span className={styles.phase}>{t(`phase.${phase}`)}</span>
          <span className={styles.time} data-pomodoro="time" role="timer" aria-live="off">{clock(left)}</span>
          <span className={styles.count}>{t("done", { n: done })}</span>
        </div>
      </div>
      <div className={styles.actions}>
        <button className="auth-link" type="button" onClick={toggle}>{running ? t("pause") : left < whole ? t("resume") : t("start")}</button>
        <button className={form.swap} type="button" onClick={skip}>{t("skip")}</button>
        <button className={form.swap} type="button" onClick={reset}>{t("reset")}</button>
      </div>
      <div className={form.panel}>
        {(["focus", "short", "long"] as const).map(key => (
          <label key={key} className={form.row}>
            <span className={form.name}>{t(`phase.${key}`)}</span>
            <input className={form.input} style={{ maxWidth: "6rem" }} type="number" min={1} max={180} value={plan[key]} onChange={event => setMinutes(key, event.target.value)} aria-label={t(`phase.${key}`)} />
            <span className={form.unit}>{t("minutes")}</span>
          </label>
        ))}
        <label className={form.row}>
          <span className={form.name}>{t("soundLabel")}</span>
          <input type="checkbox" checked={sound} onChange={event => setSound(event.target.checked)} aria-label={t("soundLabel")} />
        </label>
      </div>
      <p className={form.hint}>{t("note")}</p>
    </ToolLayout>
  );
}
