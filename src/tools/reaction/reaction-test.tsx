"use client";

import ToolLayout from "../../components/tool-layout";
import ShareButtons from "../../components/share-buttons";
import controls from "../../components/tool-controls.module.css";
import ReactionChart from "./reaction-chart";
import styles from "./reaction-test.module.css";
import { MAX_DELAY_MS, MIN_DELAY_MS, ROUND, average, isKeptResult, topPercent, type Distribution } from "./reaction";
import type { action } from "./route";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useFetcher } from "react-router";
import { useLocale, useTranslations } from "use-intl";

type Phase = "idle" | "waiting" | "go" | "too-early" | "between" | "result";

// The best round average in this browser. (The single-reaction best of the earlier version is left alone: a round's
// average is a different number.)
const BEST_KEY = "paibot-app-reaction-best-average-ms";

function loadBest(): number | null {
  try {
    const value = Number(localStorage.getItem(BEST_KEY) ?? NaN);
    return Number.isFinite(value) ? value : null;
  } catch { return null; }
}
function saveBest(ms: number) {
  try { localStorage.setItem(BEST_KEY, String(ms)); } catch { /* The best time is optional. */ }
}

export default function ReactionTest({ distribution }: { distribution: Distribution | null }) {
  const t = useTranslations("App.reaction");
  const locale = useLocale();
  const fetcher = useFetcher<typeof action>();
  const [phase, setPhase] = useState<Phase>("idle");
  const [times, setTimes] = useState<number[]>([]);
  const [best, setBest] = useState<number | null>(null);
  const [newRecord, setNewRecord] = useState(false);
  const goAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A press is acted on when it goes down (pointerdown, keydown); the click that follows it is then ignored.
  const pressed = useRef(false);

  useEffect(() => {
    setBest(loadBest());
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  function wait() {
    setPhase("waiting");
    const delay = MIN_DELAY_MS + Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1));
    timer.current = setTimeout(() => { goAt.current = performance.now(); setPhase("go"); }, delay);
  }

  function press() {
    if (phase === "idle" || phase === "too-early" || phase === "between") wait();
    else if (phase === "waiting") {
      if (timer.current) clearTimeout(timer.current);
      setPhase("too-early");
    } else if (phase === "go") {
      const next = [...times, Math.round(performance.now() - goAt.current)];
      setTimes(next);
      if (next.length < ROUND) { setPhase("between"); return; }
      const result = average(next);
      const record = best === null || result < best;
      setNewRecord(record);
      if (record) { setBest(result); saveBest(result); }
      setPhase("result");
      if (isKeptResult(result)) fetcher.submit({ ms: String(result) }, { method: "post" });
    }
  }

  function again() {
    setTimes([]);
    setNewRecord(false);
    wait();
  }

  const onPointerDown = () => { pressed.current = true; press(); };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if ((event.key !== " " && event.key !== "Enter") || event.repeat) return;
    event.preventDefault();
    pressed.current = true;
    press();
  };
  // A click with no press before it (a screen reader's, say) still counts.
  const onClick = () => { if (pressed.current) pressed.current = false; else press(); };

  const result = phase === "result" ? average(times) : null;
  const posted = fetcher.data && "faster" in fetcher.data ? fetcher.data : null;
  const failed = fetcher.data && "error" in fetcher.data ? fetcher.data.error : null;
  const top = posted ? topPercent(posted.faster, posted.distribution.total) : null;
  const shown = posted?.distribution ?? distribution;

  return (
    <ToolLayout title={t("title")} layout="spacious">
      {phase === "result" && result !== null ? (
        <div className={styles.result}>
          <p className={controls.result} aria-live="polite" data-reaction="average">
            {t("resultLabel")}: {result}{t("msUnit")}
            {newRecord && <span className={controls.newRecord}> {t("newRecord")}</span>}
          </p>
          <p className={styles.times}>{t("trials")}: {times.map(ms => `${ms}${t("msUnit")}`).join(" / ")}</p>
          {top !== null && posted && <p className={styles.rank} data-reaction="rank">{t("rank", { total: posted.distribution.total, top })}</p>}
          {fetcher.state !== "idle" && <p className={styles.note}>{t("sending")}</p>}
          {failed === "limited" && <p className={styles.note}>{t("limited")}</p>}
          {failed === "failed" && <p className={styles.note}>{t("saveFailed")}</p>}
          {!isKeptResult(result) && <p className={styles.note}>{t("notKept")}</p>}
          {shown && shown.total > 0 && <ReactionChart distribution={shown} mine={posted ? result : null} />}
          <div className={controls.actions}>
            <button className="auth-link" type="button" onClick={again} data-reaction="again">{t("retry")}</button>
          </div>
          <ShareButtons text={top !== null ? t("shareText", { ms: result, top }) : t("shareTextPlain", { ms: result })} path={`/${locale}/reaction`} />
        </div>
      ) : (
        <>
          <p className={controls.label}>{t("intro", { round: ROUND })}</p>
          {/* Which of the round's reactions this is: the ones done show their time, the one to come is marked. */}
          <ol className={styles.progress} aria-label={t("progress", { done: times.length, round: ROUND })} data-reaction="progress">
            {Array.from({ length: ROUND }, (_, i) => (
              <li key={i} data-state={i < times.length ? "done" : i === times.length ? "now" : "later"}>
                <span className={styles.nth}>{t("nth", { n: i + 1 })}</span>
                <span className={styles.time}>{i < times.length ? `${times[i]}${t("msUnit")}` : "–"}</span>
              </li>
            ))}
          </ol>
          <button
            type="button"
            className={[styles["reaction-box"], styles[`reaction-box-${phase}`]].join(" ")}
            onPointerDown={onPointerDown}
            onKeyDown={onKeyDown}
            onClick={onClick}
            data-reaction="box"
            data-phase={phase}
          >
            {/* One child, so the button's grid keeps the lines together in the middle. */}
            <span>
              {phase === "idle" && <>{t("idle")}<span className={styles.sub}>{t("idleRound", { round: ROUND })}</span></>}
              {phase === "waiting" && t("waiting")}
              {phase === "go" && t("go")}
              {phase === "too-early" && t("tooEarly")}
              {phase === "between" && <>{times[times.length - 1]}{t("msUnit")}<span className={styles.sub}>{t("between", { next: times.length + 1 })}</span></>}
            </span>
          </button>
        </>
      )}
      {best !== null && <p className={controls.best}>{t("bestLabel")}: {best}{t("msUnit")}</p>}
      {phase !== "result" && shown && shown.total > 0 && <ReactionChart distribution={shown} mine={null} />}
      <p className={styles.note}>{t("hint")}</p>
    </ToolLayout>
  );
}
