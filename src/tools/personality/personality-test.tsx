"use client";

import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { useLocale, useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import ShareButtons from "../../components/share-buttons";
import styles from "./personality.module.css";
import { ANIMAL_EMOJI, CHOICES, ITEMS, TRAITS, animalOf, isComplete, percent, rawScores, topPercent } from "./personality";
import type { action } from "./route";

type Phase = "intro" | "quiz" | "result";

export default function PersonalityTest({ taken }: { taken: number }) {
  const t = useTranslations("App.personality");
  // The items and the scale are numbered keys, known only at run time (as with the app list's keys).
  const numbered = t as unknown as (key: string) => string;
  const locale = useLocale();
  const fetcher = useFetcher<typeof action>();
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);

  function start() {
    setAnswers([]);
    setIndex(0);
    setPhase("quiz");
  }

  function answer(value: number) {
    const given = [...answers.slice(0, index), value];
    setAnswers(given);
    if (index + 1 < ITEMS.length) { setIndex(index + 1); return; }
    if (!isComplete(given)) return;
    const scores = rawScores(given);
    setPhase("result");
    fetcher.submit(Object.fromEntries(TRAITS.map(trait => [trait, String(scores[trait])])), { method: "post" });
  }

  // Keys 1-5 answer, as the choices are numbered; Backspace goes back a question.
  useEffect(() => {
    if (phase !== "quiz") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const n = Number(event.key);
      if (Number.isInteger(n) && n >= 1 && n <= CHOICES) answer(n);
      else if (event.key === "Backspace" && index > 0) setIndex(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const scores = phase === "result" ? rawScores(answers) : null;
  const animal = scores ? animalOf(scores) : null;
  const everyone = fetcher.data && "distributions" in fetcher.data ? fetcher.data.distributions : null;
  const failed = fetcher.data && "error" in fetcher.data ? fetcher.data.error : null;

  return (
    <ToolLayout title={t("title")}>
      {phase === "intro" && (
        <div className={styles.intro}>
          <p className={styles.lead}>{t("intro", { count: ITEMS.length })}</p>
          <ul className={styles.traitList}>
            {TRAITS.map(trait => <li key={trait}><strong>{t(`traits.${trait}.name`)}</strong>: {t(`traits.${trait}.about`)}</li>)}
          </ul>
          <button type="button" className={styles.start} onClick={start} data-personality="start">{t("start")}</button>
          {taken > 0 && <p className={styles.note}>{t("taken", { count: taken })}</p>}
        </div>
      )}

      {phase === "quiz" && (
        <div className={styles.quiz} data-personality="quiz" data-item={index + 1}>
          <div className={styles.status}>
            <span>{t("question", { n: index + 1, total: ITEMS.length })}</span>
            {index > 0 && <button type="button" className={styles.back} onClick={() => setIndex(index - 1)} data-personality="back">{t("back")}</button>}
          </div>
          <progress className={styles.progress} max={ITEMS.length} value={index} aria-label={t("progress", { done: index, total: ITEMS.length })} />
          <p className={styles.item} id="personality-item">{numbered(`items.${index + 1}`)}</p>
          <div className={styles.scale} role="radiogroup" aria-labelledby="personality-item">
            {Array.from({ length: CHOICES }, (_, i) => i + 1).map(value => (
              <button key={`${index}-${value}`} type="button" role="radio" aria-checked={answers[index] === value} className={styles.option} onClick={() => answer(value)} data-personality-answer={value}>
                <span className={styles.dot} data-size={Math.abs(value - 3)} aria-hidden="true" />
                <span>{numbered(`scale.${value}`)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === "result" && scores && animal && (
        <div className={styles.result} data-personality="result">
          <div className={styles.animal} data-personality="animal" data-animal={animal.animal}>
            <span className={styles.emoji} aria-hidden="true">{ANIMAL_EMOJI[animal.animal]}</span>
            <p className={styles.animalLabel}>{t("youAre")}</p>
            <p className={styles.animalName}>{t(`animals.${animal.animal}.name`)}</p>
            <p className={styles.animalText}>{t(`animals.${animal.animal}.text`)}</p>
          </div>
          <ul className={styles.traits} data-personality="traits">
            {TRAITS.map(trait => {
              const value = percent(scores[trait]);
              return (
                <li key={trait} data-trait={trait} data-value={value}>
                  <div className={styles.traitHead}>
                    <span className={styles.traitName}>{t(`traits.${trait}.name`)}</span>
                    <span className={styles.traitValue}>{value}</span>
                  </div>
                  <div className={styles.track} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-label={t(`traits.${trait}.name`)}>
                    <span className={styles.fill} style={{ width: `${Math.max(2, value)}%` }} />
                  </div>
                  <div className={styles.ends}><span>{t(`traits.${trait}.low`)}</span><span>{t(`traits.${trait}.high`)}</span></div>
                  {everyone && everyone.total > 1 && <p className={styles.top} data-top>{t("top", { top: topPercent(everyone.counts[trait], scores[trait]), total: everyone.total })}</p>}
                </li>
              );
            })}
          </ul>
          {fetcher.state !== "idle" && <p className={styles.note}>{t("sending")}</p>}
          {failed && <p className={styles.note}>{t(failed === "limited" ? "limited" : "saveFailed")}</p>}
          <p className={styles.note}>{t("animalNote")}</p>
          <button type="button" className={styles.start} onClick={start} data-personality="again">{t("again")}</button>
          <ShareButtons
            text={t("shareText", { animal: t(`animals.${animal.animal}.name`), ...Object.fromEntries(TRAITS.map(trait => [trait, percent(scores[trait])])) })}
            path={`/${locale}/personality`}
          />
        </div>
      )}
      <p className={styles.note}>{t("hint")}</p>
    </ToolLayout>
  );
}
