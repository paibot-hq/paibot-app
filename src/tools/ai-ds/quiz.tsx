import { useEffect, useState } from 'react';
import { useTranslations } from 'use-intl';
import ToolLayout from '../../components/tool-layout';
import MathText from '../../components/math-text';
import { Link } from '../../i18n/navigation';
import AiDsBreadcrumb, { type AiDsCrumb } from './breadcrumb';
import type { AiDsQuestion } from './problems';
import styles from '../../components/math-set-quiz.module.css';
import own from './ai-ds.module.css';

// A five-problem, four-choice set, as math's quiz (components/math-set-quiz.tsx): a tap on a choice is the answer (keys 1-4 on a
// keyboard), the verdict and the explanation follow, then the score. Nothing is saved.
export default function AiDsQuiz({ title, setLabel, questions, crumbs, next }: {
  title: string; setLabel: string; questions: AiDsQuestion[]; crumbs: AiDsCrumb[];
  next: { href: string; label: string } | null;
}) {
  const t = useTranslations('App.aiDs');
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const question = questions[index];
  const total = questions.length;
  const revealed = selected !== null;
  const correctCount = answers.filter((answer, at) => answer === questions[at].answerIndex).length;
  const backLink = <AiDsBreadcrumb crumbs={crumbs} />;

  function answer(choiceIndex: number) {
    if (revealed || finished) return;
    setSelected(choiceIndex);
    setAnswers(previous => [...previous, choiceIndex]);
  }
  function advance() {
    if (index + 1 >= total) { setFinished(true); return; }
    setIndex(index + 1);
    setSelected(null);
  }
  function restart() {
    setIndex(0);
    setSelected(null);
    setAnswers([]);
    setFinished(false);
  }
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const choice = Number(event.key) - 1;
      if (!finished && !revealed && choice >= 0 && choice < 4) answer(choice);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (finished) {
    const perfect = correctCount === total;
    const retryButton = <button type="button" className={perfect && next ? styles.secondary : styles.primary} onClick={restart}>{t('quiz.retry')}</button>;
    const nextLink = next && <Link href={next.href} className={perfect ? styles.primary : styles.secondary}>
      <span>{t('quiz.nextSet')}</span><span className={styles.nextLabel}>{next.label}</span>
    </Link>;
    return <ToolLayout title={title} centerTitle compact aboveTitle={backLink}>
      <div className={styles.quiz}>
        <p className={styles.setName}>{setLabel}</p>
        <p className={styles.score} aria-live="polite" data-perfect={perfect || undefined}>{t('quiz.resultCorrect', { correct: correctCount, total })}</p>
        <ol className={styles.marks}>
          {questions.map((q, at) => {
            const right = answers[at] === q.answerIndex;
            return <li key={q.id} data-correct={right || undefined}>
              <span aria-hidden="true">{right ? '○' : '×'}</span>
              <span className={styles.srOnly}>{t('quiz.questionNumber', { number: at + 1 })} {right ? t('quiz.correct') : t('quiz.incorrect')}</span>
            </li>;
          })}
        </ol>
        <div className={styles.resultActions}>{perfect ? <>{nextLink}{retryButton}</> : <>{retryButton}{nextLink}</>}</div>
      </div>
    </ToolLayout>;
  }

  return <ToolLayout title={title} compact aboveTitle={backLink}>
    <div className={styles.quiz}>
      <p className={styles.setName}>{setLabel}</p>
      <ol className={styles.track}>
        {questions.map((q, at) => <li key={q.id} data-state={at < answers.length ? (answers[at] === q.answerIndex ? 'correct' : 'incorrect') : at === index ? 'current' : undefined} />)}
      </ol>
      <p className={styles.progress} aria-live="polite">{t('quiz.progress', { current: index + 1, total })}</p>
      <div className={styles.question}>
        <p className={own.question}><MathText text={question.question} /></p>
      </div>
      <div className={styles.choices} role="group" aria-label={t('quiz.choices')}>
        {question.choices.map((choice, choiceIndex) => {
          const state = !revealed ? undefined : choiceIndex === question.answerIndex ? 'correct' : choiceIndex === selected ? 'incorrect' : undefined;
          return <button key={choiceIndex} type="button" className={`${styles.choice} ${own.choice}`} data-state={state} aria-pressed={choiceIndex === selected} disabled={revealed} onClick={() => answer(choiceIndex)}>
            <span className={styles.number} aria-hidden="true">{choiceIndex + 1}</span>
            <span><MathText text={choice} /></span>
          </button>;
        })}
      </div>
      <div className={styles.action}>
        <p className={styles.verdict} data-correct={(revealed && selected === question.answerIndex) || undefined} aria-live="polite">
          {revealed ? (selected === question.answerIndex ? t('quiz.correct') : t('quiz.incorrect')) : ''}
        </p>
        {revealed && <button type="button" className={styles.primary} onClick={advance} autoFocus>{index + 1 >= total ? t('quiz.seeResult') : t('quiz.next')}</button>}
      </div>
      {revealed && <div className={`${styles.feedback} ${own.feedback}`}>
        <p className={own.explanationLabel}>{t('quiz.explanation')}</p>
        <p className={styles.explanation}><MathText text={question.explanation} /></p>
      </div>}
    </div>
  </ToolLayout>;
}
