"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { useLocale, useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import ShareButtons from "../../components/share-buttons";
import FigurePanel from "./figure";
import IqChart from "./iq-chart";
import styles from "./iq-test.module.css";
import { QUESTIONS, TIME_LIMIT_S, makeTest, standing, type Distribution } from "./matrix";
import type { action } from "./route";

type Phase = "intro" | "test" | "result";
// Below this many results the IQ is said to be rough: a few early scores move it a lot.
const FEW = 30;

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export default function IqTest({ distribution }: { distribution: Distribution | null }) {
  const t = useTranslations("App.iqTest");
  const locale = useLocale();
  const fetcher = useFetcher<typeof action>();
  const [phase, setPhase] = useState<Phase>("intro");
  const [seed, setSeed] = useState(1);
  const puzzles = useMemo(() => makeTest(seed), [seed]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [left, setLeft] = useState(TIME_LIMIT_S);
  const startedAt = useRef(0);
  const [used, setUsed] = useState(0);

  function start() {
    setSeed(Math.floor(Math.random() * 2 ** 31));
    setIndex(0);
    setAnswers([]);
    setLeft(TIME_LIMIT_S);
    startedAt.current = Date.now();
    setPhase("test");
  }

  // The test ends after the last puzzle or when the time runs out (puzzles not reached count as wrong).
  function finish(given: number[]) {
    const score = given.filter((choice, i) => choice === puzzles[i].answer).length;
    const seconds = Math.max(1, Math.min(TIME_LIMIT_S, Math.round((Date.now() - startedAt.current) / 1000)));
    setUsed(seconds);
    setPhase("result");
    fetcher.submit({ score: String(score), seconds: String(seconds) }, { method: "post" });
  }

  function choose(choice: number) {
    const given = [...answers, choice];
    setAnswers(given);
    if (given.length >= QUESTIONS) finish(given);
    else setIndex(given.length);
  }

  // The clock, once a second; at zero the test ends.
  useEffect(() => {
    if (phase !== "test") return;
    const timer = setInterval(() => {
      const remaining = Math.max(0, TIME_LIMIT_S - Math.floor((Date.now() - startedAt.current) / 1000));
      setLeft(remaining);
      if (remaining === 0) finish(answers);
    }, 250);
    return () => clearInterval(timer);
    // finish reads the answers given so far.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, answers]);

  // Keys 1-8 choose, as the choices are numbered.
  useEffect(() => {
    if (phase !== "test") return;
    const onKey = (event: KeyboardEvent) => {
      const n = Number(event.key);
      if (Number.isInteger(n) && n >= 1 && n <= 8 && !event.repeat) choose(n - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const score = answers.filter((choice, i) => choice === puzzles[i]?.answer).length;
  const posted = fetcher.data && "better" in fetcher.data ? fetcher.data : null;
  const failed = fetcher.data && "error" in fetcher.data ? fetcher.data.error : null;
  const place = posted ? standing(posted.better, posted.same, posted.distribution.total) : null;
  const shown = posted?.distribution ?? distribution;
  const puzzle = puzzles[index];

  return (
    <ToolLayout title={t("title")}>
      {phase === "intro" && (
        <div className={styles.intro}>
          <p className={styles.lead}>{t("intro", { questions: QUESTIONS, minutes: TIME_LIMIT_S / 60 })}</p>
          <ul className={styles.rules}>
            <li>{t("rule1")}</li>
            <li>{t("rule2")}</li>
            <li>{t("rule3")}</li>
          </ul>
          <button type="button" className={styles.start} onClick={start} data-iq="start">{t("start")}</button>
          {shown && shown.total > 0 && <IqChart distribution={shown} mine={null} />}
        </div>
      )}

      {phase === "test" && puzzle && (
        <div className={styles.test} data-iq="test" data-question={index + 1} data-family={puzzle.family}>
          <div className={styles.status}>
            <span>{t("question", { n: index + 1, total: QUESTIONS })}</span>
            <span className={left <= 60 ? styles.hurry : undefined} data-iq="left">{t("left", { time: clock(left) })}</span>
          </div>
          <progress className={styles.progress} max={QUESTIONS} value={index} aria-label={t("progress", { done: index, total: QUESTIONS })} />
          <div className={styles.matrix} role="img" aria-label={t("matrixLabel")}>
            {puzzle.cells.slice(0, 8).map((cell, i) => <div key={i} className={styles.cell}><FigurePanel family={puzzle.family} panel={cell} /></div>)}
            <div className={`${styles.cell} ${styles.missing}`}>?</div>
          </div>
          <p className={styles.ask}>{t("ask")}</p>
          <div className={styles.choices} role="group" aria-label={t("choices")}>
            {puzzle.choices.map((choice, i) => (
              <button key={`${index}-${i}`} type="button" className={styles.choice} onClick={() => choose(i)} aria-label={t("choice", { n: i + 1 })} data-iq-choice={i}>
                <span className={styles.number}>{i + 1}</span>
                <FigurePanel family={puzzle.family} panel={choice} />
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === "result" && (
        <div className={styles.result} data-iq="result">
          <p className={styles.score} data-iq="score">{t("scoreOf", { score, total: QUESTIONS })}</p>
          <ol className={styles.marks} aria-label={t("marks")}>
            {puzzles.map((p, i) => <li key={i} data-right={answers[i] === p.answer || undefined} title={t("markTitle", { n: i + 1 })}>{answers[i] === p.answer ? "○" : "×"}</li>)}
          </ol>
          {place && posted && (
            <>
              <p className={styles.iq} data-iq="iq"><span>IQ</span> {place.iq}</p>
              <p className={styles.rank} data-iq="rank">{t("rank", { total: posted.distribution.total, top: place.top })}</p>
              <p className={styles.note}>{posted.distribution.total < FEW ? t("fewTakers") : t("iqNote")}</p>
            </>
          )}
          {fetcher.state !== "idle" && <p className={styles.note}>{t("sending")}</p>}
          {failed && <p className={styles.note}>{t(failed === "limited" ? "limited" : "saveFailed")}</p>}
          <p className={styles.note}>{t("time", { time: clock(used) })}</p>
          {shown && shown.total > 0 && <IqChart distribution={shown} mine={posted ? score : null} />}
          <button type="button" className={styles.start} onClick={start} data-iq="again">{t("again")}</button>
          <ShareButtons text={place ? t("shareText", { iq: place.iq, top: place.top, score, total: QUESTIONS }) : t("shareTextPlain", { score, total: QUESTIONS })} path={`/${locale}/iq-test`} />
        </div>
      )}
      <p className={styles.note}>{t("hint")}</p>
    </ToolLayout>
  );
}
