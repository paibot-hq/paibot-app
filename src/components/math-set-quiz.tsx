import { useState, type ReactNode } from 'react';
import { useFetcher } from 'react-router';
import { useTranslations } from 'use-intl';
import { Link } from '../i18n/navigation';
import { useFavoritesData } from '../routes/locale';
import MathBreadcrumb, { type MathCrumb } from './math-breadcrumb';
import ToolLayout from './tool-layout';
import styles from './math-set-quiz.module.css';

export interface MathSetQuestion {
  id: string;
  prompt: ReactNode;
  choices: ReactNode[];
  answerIndex: number;
  explanation: ReactNode;
  // 1 basic, 2 standard, 3 advanced; shown beside the progress.
  tier?: number;
}

// The four-choice quiz shared by every /math unit: a fixed, ordered set of
// questions, one verdict and explanation per answer, then a score. Units only
// turn their locale-neutral problem data into prompts/choices/explanations.
// Render with key={setId} so moving between sets starts a fresh quiz.
// A signed-in user's finished attempt is posted to the page's own route action
// (see saveAttemptAction in lib/math-attempts.server.ts), which rescores it.
export default function MathSetQuiz({ title, setLabel, questions, crumbs, version }: {
  title: string; setLabel: string; questions: MathSetQuestion[];
  // Where the set sits: unit > learning item (linked) > the set itself (current).
  crumbs: MathCrumb[];
  // The set's version when the page was loaded; the server refuses an attempt if it changed since.
  version: string;
}) {
  const t = useTranslations('App.math.quiz');
  const tm = useTranslations('App.math');
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const { signedIn } = useFavoritesData();
  const saver = useFetcher<{ ok: boolean }>();

  const question = questions[index];
  const total = questions.length;
  const correctCount = answers.filter((answer, answerIndex) => answer === questions[answerIndex].answerIndex).length;
  const backLink = <MathBreadcrumb crumbs={crumbs} />;

  function submit() {
    if (selected === null) return;
    setRevealed(true);
    setAnswers(previous => [...previous, selected]);
  }
  function next() {
    if (index + 1 >= total) {
      setFinished(true);
      if (signedIn) saver.submit({ problemIds: JSON.stringify(questions.map(q => q.id)), answers: JSON.stringify(answers), version }, { method: 'post' });
      return;
    }
    setIndex(index + 1);
    setSelected(null);
    setRevealed(false);
  }
  function restart() {
    setIndex(0);
    setSelected(null);
    setRevealed(false);
    setAnswers([]);
    setFinished(false);
  }

  if (total === 0) {
    return <ToolLayout title={title} aboveTitle={backLink}>
      <div className={styles.quiz}>
        <p className={styles.setName}>{setLabel}</p>
        <p role="status">{t('setComingSoon')}</p>
      </div>
    </ToolLayout>;
  }

  if (finished) {
    const percent = Math.round((correctCount / total) * 100);
    return <ToolLayout title={title} centerTitle aboveTitle={backLink}>
      <div className={styles.quiz}>
        <p className={styles.setName}>{setLabel}</p>
        <p className={styles.resultLine} aria-live="polite">{t('resultCorrect', { correct: correctCount, total })}</p>
        <p className={styles.resultLine}>{t('resultAccuracy', { percent })}</p>
        <p className={styles.saveStatus} role="status">
          {!signedIn ? t('signInToSave')
            : saver.state !== 'idle' ? null
              : saver.data?.ok ? t('saved') : saver.data ? t('saveFailed') : null}
        </p>
        <button type="button" className={styles.primary} onClick={restart}>{t('retry')}</button>
      </div>
    </ToolLayout>;
  }

  return <ToolLayout title={title} aboveTitle={backLink}>
    <div className={styles.quiz}>
      <p className={styles.setName}>{setLabel}</p>
      <p className={styles.progress} aria-live="polite">
        <span>{t('progress', { current: index + 1, total })}</span>
        {question.tier && <span className={styles.tier} data-tier={question.tier}>{tm(`tiers.${question.tier}` as 'tiers.1')}</span>}
      </p>
      <div className={styles.question}>{question.prompt}</div>
      <div className={styles.choices} role="group" aria-label={title}>
        {question.choices.map((choice, choiceIndex) => {
          const isCorrectChoice = choiceIndex === question.answerIndex;
          const isSelected = choiceIndex === selected;
          const state = !revealed ? undefined : isCorrectChoice ? 'correct' : isSelected ? 'incorrect' : undefined;
          return <button key={choiceIndex} type="button" className={styles.choice} data-state={state}
            aria-pressed={isSelected} disabled={revealed}
            onClick={() => setSelected(choiceIndex)}>
            <span className={styles.number} aria-hidden="true">{choiceIndex + 1}</span>
            {choice}
          </button>;
        })}
      </div>
      {!revealed
        ? <button type="button" className={styles.primary} disabled={selected === null} onClick={submit}>{t('answer')}</button>
        : <div className={styles.feedback} aria-live="polite">
          <p className={styles.verdict} data-correct={selected === question.answerIndex || undefined}>
            {selected === question.answerIndex ? t('correct') : t('incorrect')}
          </p>
          <div className={styles.explanation}>{question.explanation}</div>
          <button type="button" className={styles.primary} onClick={next}>{t('next')}</button>
        </div>}
    </div>
  </ToolLayout>;
}
