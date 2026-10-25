import { useEffect, useState } from 'react';
import { useFetcher } from 'react-router';
import { useTranslations } from 'use-intl';
import ToolLayout from '../../components/tool-layout';
import { Link } from '../../i18n/navigation';
import EnglishBreadcrumb, { type EnglishCrumb } from './breadcrumb';
import type { EnglishPayload } from './payload';
import styles from '../../components/math-set-quiz.module.css';
import own from './english.module.css';

export interface EnglishQuestion { id: string; answerIndex: number; payload: EnglishPayload }

// The sentence with its blank drawn as a line; once answered, the right word fills it.
function Stem({ stem, filled }: { stem: string; filled: string | null }) {
  const [before, after] = stem.split('___');
  return <p className={own.stem}>{before}<span className={own.blank} data-filled={filled !== null || undefined}>{filled ?? ' '}</span>{after}</p>;
}

// A five-problem, four-choice English set, as math's quiz (components/math-set-quiz.tsx): a tap on a choice is the answer (keys 1-4
// on a keyboard), the verdict, the point and the explanation follow, then the score. The finished answers are posted to the page's
// own action, which rescores them and counts the result for the set (no one's record is kept).
export default function EnglishQuiz({ title, setLabel, questions, crumbs, next }: {
  title: string; setLabel: string; questions: EnglishQuestion[]; crumbs: EnglishCrumb[];
  next: { href: string; label: string } | null;
}) {
  const t = useTranslations('App.english');
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const counter = useFetcher();
  const question = questions[index];
  const total = questions.length;
  const revealed = selected !== null;
  const correctCount = answers.filter((answer, at) => answer === questions[at].answerIndex).length;
  const backLink = <EnglishBreadcrumb crumbs={crumbs} />;

  function answer(choiceIndex: number) {
    if (revealed || finished) return;
    setSelected(choiceIndex);
    setAnswers(previous => [...previous, choiceIndex]);
  }
  function advance() {
    if (index + 1 >= total) {
      setFinished(true);
      counter.submit({ problemIds: JSON.stringify(questions.map(q => q.id)), answers: JSON.stringify(answers) }, { method: 'post' });
      return;
    }
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

  const { payload } = question;
  return <ToolLayout title={title} compact aboveTitle={backLink}>
    <div className={styles.quiz}>
      <p className={styles.setName}>{setLabel}</p>
      <ol className={styles.track}>
        {questions.map((q, at) => <li key={q.id} data-state={at < answers.length ? (answers[at] === q.answerIndex ? 'correct' : 'incorrect') : at === index ? 'current' : undefined} />)}
      </ol>
      <p className={styles.progress} aria-live="polite">{t('quiz.progress', { current: index + 1, total })}</p>
      <div className={styles.question}><Stem stem={payload.stem} filled={revealed ? payload.choices[question.answerIndex] : null} /></div>
      <div className={styles.choices} role="group" aria-label={t('quiz.choices')}>
        {payload.choices.map((choice, choiceIndex) => {
          const state = !revealed ? undefined : choiceIndex === question.answerIndex ? 'correct' : choiceIndex === selected ? 'incorrect' : undefined;
          return <button key={choiceIndex} type="button" className={styles.choice} data-state={state} aria-pressed={choiceIndex === selected} disabled={revealed} onClick={() => answer(choiceIndex)}>
            <span className={styles.number} aria-hidden="true">{choiceIndex + 1}</span>
            {choice}
          </button>;
        })}
      </div>
      <div className={styles.action}>
        <p className={styles.verdict} data-correct={(revealed && selected === question.answerIndex) || undefined} aria-live="polite">
          {revealed ? (selected === question.answerIndex ? t('quiz.correct') : t('quiz.incorrect')) : ''}
        </p>
        {revealed && <button type="button" className={styles.primary} onClick={advance} autoFocus>{index + 1 >= total ? t('quiz.seeResult') : t('quiz.next')}</button>}
      </div>
      {revealed && <div className={styles.feedback}>
        <p className={own.point}>{payload.point.ja}</p>
        <p className={styles.explanation}>{payload.explanation.ja}</p>
      </div>}
    </div>
  </ToolLayout>;
}
