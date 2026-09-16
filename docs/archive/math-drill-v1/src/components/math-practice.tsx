"use client";

import ToolLayout from "./tool-layout";
import controls from "./tool-controls.module.css";

import styles from "./math-practice.module.css";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { generateProblem, LEVEL_KEYS, type LevelIndex, type Problem } from "../lib/math-problems";
import { MathTex } from "./math-tex";

function createAnswers(problem: Problem): string[] {
  return problem.blanks.map(() => "");
}

export default function MathPractice() {
  const t = useTranslations("App");
  const [level, setLevel] = useState<LevelIndex>(0);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [correctFlags, setCorrectFlags] = useState<boolean[]>([]);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  // Problems are randomly generated, so the first one must be created on the client only —
  // generating it during the initial render would produce a different result on the server
  // and cause a hydration mismatch (same reasoning as the arithmetic practice tool).
  useEffect(() => {
    const first = generateProblem(0);
    setProblem(first);
    setAnswers(createAnswers(first));
  }, []);

  function newProblem(nextLevel: LevelIndex) {
    const next = generateProblem(nextLevel);
    setProblem(next);
    setAnswers(createAnswers(next));
    setChecked(false);
    setCorrectFlags([]);
  }

  function changeLevel(nextLevel: LevelIndex) {
    setLevel(nextLevel);
    setScore({ correct: 0, total: 0 });
    newProblem(nextLevel);
  }

  function updateAnswer(index: number, value: string) {
    setAnswers(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function checkAnswer() {
    if (!problem || checked) return;
    const flags = problem.blanks.map((blank, index) => {
      const value = parseFloat(answers[index]);
      if (Number.isNaN(value)) return false;
      return Math.abs(value - blank.value) <= (blank.tolerance ?? 0);
    });
    setCorrectFlags(flags);
    setChecked(true);
    const allCorrect = flags.every(Boolean);
    setScore(prev => ({ correct: prev.correct + (allCorrect ? 1 : 0), total: prev.total + 1 }));
  }

  function handleEnter() {
    if (checked) newProblem(level);
    else checkAnswer();
  }

  if (!problem) {
    return (
      <ToolLayout title={t("mathTitle")} centerTitle />
    );
  }

  const isCorrect = checked && correctFlags.every(Boolean);

  return (
    <ToolLayout title={t("mathTitle")} centerTitle>
      <label className={controls.field} htmlFor="math-level">
        <span className={controls.fieldLabel}>{t("mathLevelLabel")}</span>
        <select
          id="math-level"
          className={styles["math-select"]}
          value={level}
          onChange={event => changeLevel(Number(event.target.value) as LevelIndex)}
        >
          {LEVEL_KEYS.map((key, index) => (
            <option key={key} value={index}>{t(key)}</option>
          ))}
        </select>
      </label>

      <p className={controls.label}>{t("mathScoreLabel")}: {score.correct} / {score.total}</p>

      <div className={styles["math-problem"]}>
        {problem.instructionKey && (
          <p className={styles["math-instruction"]}>{t(problem.instructionKey, problem.instructionParams)}</p>
        )}
        {problem.tex && <MathTex tex={`${problem.tex} = ?`} block />}
      </div>

      {problem.blanks.length === 2 ? (
        <div className={styles["math-fraction-input"]}>
          <input
            type="number"
            inputMode="decimal"
            className={[styles["math-answer"], styles["math-answer-sm"]].join(" ")}
            value={answers[0] ?? ""}
            onChange={event => updateAnswer(0, event.target.value)}
            onKeyDown={event => { if (event.key === "Enter") handleEnter(); }}
            disabled={checked}
            aria-label={t("mathNumeratorLabel")}
          />
          <span className={styles["math-fraction-divider"]}>/</span>
          <input
            type="number"
            inputMode="decimal"
            className={[styles["math-answer"], styles["math-answer-sm"]].join(" ")}
            value={answers[1] ?? ""}
            onChange={event => updateAnswer(1, event.target.value)}
            onKeyDown={event => { if (event.key === "Enter") handleEnter(); }}
            disabled={checked}
            aria-label={t("mathDenominatorLabel")}
          />
        </div>
      ) : (
        <input
          type="number"
          inputMode="decimal"
          className={styles["math-answer"]}
          value={answers[0] ?? ""}
          onChange={event => updateAnswer(0, event.target.value)}
          onKeyDown={event => { if (event.key === "Enter") handleEnter(); }}
          disabled={checked}
          aria-label={t("mathAnswerLabel")}
        />
      )}

      {checked && (
        <div className={styles["math-result"]}>
          <p className={[styles["math-feedback"], styles[isCorrect ? "math-feedback-correct" : "math-feedback-incorrect"]].join(" ")}>
            {isCorrect ? t("mathCorrect") : t("mathIncorrect")}
          </p>
          <p className={styles["math-explanation-label"]}>{t("mathExplanationLabel")}</p>
          <MathTex tex={problem.explanationTex} block />
        </div>
      )}

      <div className={controls.actions}>
        {!checked ? (
          <button className="auth-link" type="button" onClick={checkAnswer}>{t("mathCheckAnswer")}</button>
        ) : (
          <button className="auth-link" type="button" onClick={() => newProblem(level)}>{t("mathNextProblem")}</button>
        )}
      </div>
      </ToolLayout>
  );
}
