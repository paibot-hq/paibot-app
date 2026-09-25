"use client";

import ToolLayout from "./tool-layout";
import controls from "./tool-controls.module.css";

import styles from "./reaction-test.module.css";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "use-intl";

type Phase = "idle" | "waiting" | "go" | "too-early" | "result";

const MIN_DELAY_MS = 1000;
const MAX_DELAY_MS = 4000;
const BEST_MS_KEY = "paibot-app-reaction-best-ms";

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function loadBestMs(): number | null {
  try {
    const raw = localStorage.getItem(BEST_MS_KEY);
    const value = raw === null ? NaN : Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function saveBestMs(ms: number) {
  try { localStorage.setItem(BEST_MS_KEY, String(ms)); } catch { /* Best time is optional. */ }
}

export default function ReactionTest() {
  const t = useTranslations("App");
  const [phase, setPhase] = useState<Phase>("idle");
  const [reactionMs, setReactionMs] = useState<number | null>(null);
  const [bestMs, setBestMs] = useState<number | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const goTimeRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reading the saved best time is client-only since localStorage isn't available on the server.
  useEffect(() => {
    setBestMs(loadBestMs());
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function startWaiting() {
    setPhase("waiting");
    setReactionMs(null);
    setIsNewRecord(false);
    const delay = randomInt(MIN_DELAY_MS, MAX_DELAY_MS);
    timeoutRef.current = setTimeout(() => {
      goTimeRef.current = Date.now();
      setPhase("go");
    }, delay);
  }

  function handleBoxClick() {
    if (phase === "idle" || phase === "too-early") {
      startWaiting();
    } else if (phase === "waiting") {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setPhase("too-early");
    } else if (phase === "go") {
      const reaction = goTimeRef.current === null ? 0 : Date.now() - goTimeRef.current;
      const newRecord = bestMs === null || reaction < bestMs;
      setReactionMs(reaction);
      setIsNewRecord(newRecord);
      if (newRecord) {
        setBestMs(reaction);
        saveBestMs(reaction);
      }
      setPhase("result");
    }
  }

  return (
    <ToolLayout title={t("reaction.title")} layout="spacious">
      {phase === "result" ? (
        <>
          <p className={controls.result} aria-live="polite">
            {t("reaction.resultLabel")}: {reactionMs}{t("reaction.msUnit")}
            {isNewRecord && <span className={controls.newRecord}> {t("reaction.newRecord")}</span>}
          </p>
          <div className={controls.actions}>
            <button className="auth-link" type="button" onClick={startWaiting}>{t("reaction.retry")}</button>
          </div>
        </>
      ) : (
        <button
          type="button"
          className={[styles["reaction-box"], styles[`reaction-box-${phase}`]].filter(Boolean).join(" ")}
          onClick={handleBoxClick}
        >
          {phase === "idle" && t("reaction.idle")}
          {phase === "waiting" && t("reaction.waiting")}
          {phase === "go" && t("reaction.go")}
          {phase === "too-early" && t("reaction.tooEarly")}
        </button>
      )}
      {bestMs !== null && (
        <p className={controls.best}>{t("reaction.bestLabel")}: {bestMs}{t("reaction.msUnit")}</p>
      )}
      </ToolLayout>
  );
}
