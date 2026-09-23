"use client";

import ToolLayout from "./tool-layout";
import controls from "./tool-controls.module.css";

import styles from "./arithmetic-practice.module.css";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

type Operator = "+" | "-" | "×" | "÷";

type Problem = { a: number; b: number; operator: Operator; answer: number };

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateProblem(): Problem {
  const operator = (["+", "-", "×", "÷"] as const)[randomInt(0, 3)];
  if (operator === "+") {
    const a = randomInt(1, 50);
    const b = randomInt(1, 50);
    return { a, b, operator, answer: a + b };
  }
  if (operator === "-") {
    const a = randomInt(1, 50);
    const b = randomInt(1, a);
    return { a, b, operator, answer: a - b };
  }
  if (operator === "×") {
    const a = randomInt(1, 12);
    const b = randomInt(1, 12);
    return { a, b, operator, answer: a * b };
  }
  const b = randomInt(1, 12);
  const answer = randomInt(1, 12);
  return { a: b * answer, b, operator, answer };
}

const SESSION_LENGTH = 10;
const BEST_TIME_KEY = "paibot-app-arith-best-time";

function loadBestTime(): number | null {
  try {
    const raw = localStorage.getItem(BEST_TIME_KEY);
    const value = raw === null ? NaN : Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function saveBestTime(seconds: number) {
  try { localStorage.setItem(BEST_TIME_KEY, String(seconds)); } catch { /* Best time is optional. */ }
}

export default function ArithmeticPractice() {
  const t = useTranslations("App");
  const [problem, setProblem] = useState<Problem | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [incorrect, setIncorrect] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [finished, setFinished] = useState(false);
  const [bestTime, setBestTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Problems are randomly generated, so the first one must be created on the
  // client only — generating it during the initial render would produce a
  // different result on the server and cause a hydration mismatch. Reading the
  // saved best time is also client-only since localStorage isn't available on the server.
  useEffect(() => {
    setProblem(generateProblem());
    setBestTime(loadBestTime());
    startTimeRef.current = Date.now();
  }, []);

  // Focus (or refocus) the answer field whenever a new problem appears — including the
  // very first one, which doesn't exist in the DOM yet at the point the effect above runs.
  useEffect(() => {
    if (problem) inputRef.current?.focus();
  }, [problem]);

  const advance = useCallback(() => {
    const newCompleted = completed + 1;
    if (newCompleted >= SESSION_LENGTH) {
      const elapsed = startTimeRef.current === null ? 0 : (Date.now() - startTimeRef.current) / 1000;
      const newRecord = bestTime === null || elapsed < bestTime;
      setElapsedTime(elapsed);
      setIsNewRecord(newRecord);
      if (newRecord) {
        setBestTime(elapsed);
        saveBestTime(elapsed);
      }
      setCompleted(newCompleted);
      setFinished(true);
      return;
    }
    setCompleted(newCompleted);
    setProblem(generateProblem());
    setAnswerText("");
    setIncorrect(false);
  }, [completed, bestTime]);

  const submitAnswer = useCallback(() => {
    if (!problem) return;
    const value = parseInt(answerText, 10);
    if (Number.isNaN(value)) return;
    if (value === problem.answer) {
      advance();
    } else {
      setMistakes(prev => prev + 1);
      setIncorrect(true);
      setAnswerText("");
    }
  }, [problem, answerText, advance]);

  const restart = useCallback(() => {
    setCompleted(0);
    setMistakes(0);
    setFinished(false);
    setElapsedTime(null);
    setIsNewRecord(false);
    setProblem(generateProblem());
    setAnswerText("");
    setIncorrect(false);
    startTimeRef.current = Date.now();
  }, []);

  if (finished) {
    return (
      <ToolLayout title={t("arith.title")}>
        <p className={styles["arith-result-summary"]} aria-live="polite">
          {t("arith.resultSummary", { total: SESSION_LENGTH, mistakes })}
        </p>
        {elapsedTime !== null && (
          <p className={styles["arith-time"]}>
            {t("arith.timeLabel")}: {elapsedTime.toFixed(1)}{t("arith.secondsUnit")}
            {isNewRecord && <span className={controls.newRecord}> {t("arith.newRecord")}</span>}
          </p>
        )}
        {bestTime !== null && (
          <p className={styles["arith-best-time"]}>{t("arith.bestTimeLabel")}: {bestTime.toFixed(1)}{t("arith.secondsUnit")}</p>
        )}
        <div className={styles["arith-actions"]}>
          <button className="auth-link" type="button" onClick={restart}>{t("arith.retry")}</button>
        </div>
        </ToolLayout>
    );
  }

  if (!problem) {
    return (
      <ToolLayout title={t("arith.title")} />
    );
  }

  return (
    <ToolLayout title={t("arith.title")}>
      <p className={styles["arith-progress"]} aria-live="polite">
        {t("arith.progress", { current: completed + 1, total: SESSION_LENGTH })}
      </p>
      <p className={controls.label} aria-live="polite">{t("arith.mistakesLabel")}: {mistakes}</p>
      <p className={styles["arith-problem"]} aria-live="polite">{problem.a} {problem.operator} {problem.b}</p>
      <input
        ref={inputRef}
        className={styles["arith-answer"]}
        type="number"
        inputMode="numeric"
        value={answerText}
        onChange={event => { setAnswerText(event.target.value); setIncorrect(false); }}
        onKeyDown={event => { if (event.key === "Enter") submitAnswer(); }}
        placeholder={t("arith.answerPlaceholder")}
        aria-label={t("arith.answerPlaceholder")}
      />
      <p className={[styles["arith-feedback"], incorrect && styles["arith-feedback-incorrect"]].filter(Boolean).join(" ")} aria-live="polite">
        {incorrect && t("arith.incorrect")}
      </p>
      <div className={styles["arith-actions"]}>
        <button className="auth-link" type="button" onClick={submitAnswer}>{t("arith.submit")}</button>
      </div>
      </ToolLayout>
  );
}
