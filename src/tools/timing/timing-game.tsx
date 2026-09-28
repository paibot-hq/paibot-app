"use client";

import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";

import styles from "./timing-game.module.css";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "use-intl";

type Phase = "idle" | "running" | "result";

const TARGET_SECONDS = 5;
const BEST_DIFF_KEY = "paibot-app-timing-best-diff";

function loadBestDiff(): number | null {
  try {
    const raw = localStorage.getItem(BEST_DIFF_KEY);
    const value = raw === null ? NaN : Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function saveBestDiff(diff: number) {
  try { localStorage.setItem(BEST_DIFF_KEY, String(diff)); } catch { /* Best diff is optional. */ }
}

export default function TimingGame() {
  const t = useTranslations("App");
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [bestDiff, setBestDiff] = useState<number | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const startTimeRef = useRef<number | null>(null);

  // Reading the saved best difference is client-only since localStorage isn't available on the server.
  useEffect(() => {
    setBestDiff(loadBestDiff());
  }, []);

  function start() {
    setPhase("running");
    setElapsed(null);
    setIsNewRecord(false);
    startTimeRef.current = Date.now();
  }

  function stop() {
    if (startTimeRef.current === null) return;
    const seconds = (Date.now() - startTimeRef.current) / 1000;
    const diff = Math.abs(seconds - TARGET_SECONDS);
    setElapsed(seconds);
    const newRecord = bestDiff === null || diff < bestDiff;
    setIsNewRecord(newRecord);
    if (newRecord) {
      setBestDiff(diff);
      saveBestDiff(diff);
    }
    setPhase("result");
  }

  function handleBoxClick() {
    if (phase === "idle") start();
    else if (phase === "running") stop();
  }

  function resetToIdle() {
    setPhase("idle");
    setElapsed(null);
    setIsNewRecord(false);
  }

  const diff = elapsed === null ? null : Math.abs(elapsed - TARGET_SECONDS);

  return (
    <ToolLayout title={t("timing.title")} layout="spacious">
      <p className={controls.label}>{t("timing.targetLabel", { seconds: TARGET_SECONDS })}</p>
      {phase === "result" ? (
        <>
          <p className={controls.result} aria-live="polite">
            {t("timing.resultLabel")}: {elapsed!.toFixed(2)}{t("timing.secondsUnit")}
          </p>
          <p className={styles["timing-diff"]}>
            {t("timing.diffLabel")}: {diff!.toFixed(2)}{t("timing.secondsUnit")}
            {isNewRecord && <span className={controls.newRecord}> {t("timing.newRecord")}</span>}
          </p>
          <div className={controls.actions}>
            <button className="auth-link" type="button" onClick={resetToIdle}>{t("timing.retry")}</button>
          </div>
        </>
      ) : (
        <button type="button" className={[styles["timing-box"], styles[`timing-box-${phase}`]].filter(Boolean).join(" ")} onClick={handleBoxClick}>
          {phase === "idle" ? t("timing.idle") : t("timing.running")}
        </button>
      )}
      {bestDiff !== null && (
        <p className={controls.best}>{t("timing.bestLabel")}: {bestDiff.toFixed(2)}{t("timing.secondsUnit")}</p>
      )}
      </ToolLayout>
  );
}
