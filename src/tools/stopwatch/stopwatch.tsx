"use client";

import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";

import styles from "./stopwatch.module.css";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "use-intl";

type Lap = { total: number; split: number };

function formatTime(ms: number) {
  const totalCentiseconds = Math.floor(ms / 10);
  const centiseconds = totalCentiseconds % 100;
  const totalSeconds = Math.floor(totalCentiseconds / 100);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(minutes)}:${pad(seconds)}.${pad(centiseconds)}`;
}

export default function Stopwatch() {
  const t = useTranslations("App");
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [displayMs, setDisplayMs] = useState(0);
  const [laps, setLaps] = useState<Lap[]>([]);
  const startTimeRef = useRef<number | null>(null);

  // Ticks the display while running; the actual value always comes from
  // Date.now() minus when it was (re)started, so drift from setInterval's
  // own imprecision never accumulates.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      if (startTimeRef.current !== null) {
        setDisplayMs(elapsedMs + (Date.now() - startTimeRef.current));
      }
    }, 10);
    return () => clearInterval(id);
  }, [running, elapsedMs]);

  function start() {
    startTimeRef.current = Date.now();
    setRunning(true);
  }

  function pause() {
    if (startTimeRef.current !== null) {
      const newElapsed = elapsedMs + (Date.now() - startTimeRef.current);
      setElapsedMs(newElapsed);
      setDisplayMs(newElapsed);
    }
    setRunning(false);
    startTimeRef.current = null;
  }

  function reset() {
    setRunning(false);
    setElapsedMs(0);
    setDisplayMs(0);
    setLaps([]);
    startTimeRef.current = null;
  }

  function recordLap() {
    setLaps(prev => {
      const previousTotal = prev.length > 0 ? prev[prev.length - 1].total : 0;
      return [...prev, { total: displayMs, split: displayMs - previousTotal }];
    });
  }

  const hasElapsed = displayMs > 0;

  return (
    <ToolLayout title={t("stopwatch.title")} layout="spacious">
      <p className={styles["stopwatch-display"]} aria-live="polite">{formatTime(displayMs)}</p>
      <div className={controls.actions}>
        {!running && !hasElapsed && (
          <button className="auth-link" type="button" onClick={start}>{t("stopwatch.start")}</button>
        )}
        {running && (
          <>
            <button className="auth-link" type="button" onClick={recordLap}>{t("stopwatch.lap")}</button>
            <button className="auth-link" type="button" onClick={pause}>{t("stopwatch.pause")}</button>
          </>
        )}
        {!running && hasElapsed && (
          <>
            <button className="auth-link" type="button" onClick={start}>{t("stopwatch.resume")}</button>
            <button className="auth-link" type="button" onClick={reset}>{t("stopwatch.reset")}</button>
          </>
        )}
      </div>
      {laps.length > 0 && (
        <ol className={styles["stopwatch-laps"]}>
          {laps.slice().reverse().map((lap, i) => {
            const lapNumber = laps.length - i;
            return (
              <li key={lapNumber} className={styles["stopwatch-lap"]}>
                <span>{t("stopwatch.lapRow", { n: lapNumber })}</span>
                <span>{t("stopwatch.splitLabel")} {formatTime(lap.split)}</span>
                <span>{t("stopwatch.totalLabel")} {formatTime(lap.total)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </ToolLayout>
  );
}
