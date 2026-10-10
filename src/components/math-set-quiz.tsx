import { useEffect, useState, type ReactNode } from 'react';
import { useFetcher } from 'react-router';
import { useLocale, useTranslations } from 'use-intl';
import { Link } from '../i18n/navigation';
import { markSetDone } from '../lib/math-local-done';
import { saveResume, type MathResume } from '../lib/math-resume';
import { useFavoritesData } from '../routes/locale';
import MathBreadcrumb, { type MathCrumb } from './math-breadcrumb';
import ShareButtons from './share-buttons';
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
  // The learning item the problem is from, in a quiz drawn from several (a school year's test): shown with its result.
  source?: { label: string; href: string };
}

// The four-choice quiz shared by every /math unit: a fixed, ordered set of
// questions, one verdict and explanation per answer, then a score. Units only
// turn their locale-neutral problem data into prompts/choices/explanations.
// Render with key={setId} so moving between sets starts a fresh quiz.
// A signed-in user's finished attempt is posted to the page's own route action
// (see saveAttemptAction in lib/math-attempts.server.ts), which rescores it.
// Made for a phone: a tap on a choice is the answer (keys 1-4 on a keyboard), and "Next" appears in the same place.
export default function MathSetQuiz({ title, setLabel, questions, crumbs, version, current, next, onRetry, retryLabel, total: fixedTotal, onAnswered, result, sharePath, shareText }: {
  title: string; setLabel: string; questions: MathSetQuestion[];
  // Where the set sits: unit > learning item (linked) > the set itself (current).
  crumbs: MathCrumb[];
  // A practice set: its version when the page was loaded (the server refuses an attempt if it changed since), the set itself, and the one
  // to go on to after it (the next set of the item, or of the next items), if any. A test has none of these: nothing is saved.
  version?: string;
  current?: MathResume;
  next?: { set: MathResume; href: string; label: string } | null;
  // In place of starting the same questions again (a test draws new ones).
  onRetry?: () => void;
  retryLabel?: string;
  // A quiz whose questions are chosen as it goes (the placement test): how many there will be, told of each answer before "Next" (to add
  // the next question), and what to show at the top of the result.
  total?: number;
  onAnswered?: (index: number, correct: boolean) => void;
  result?: ReactNode;
  // The page that a shared result links to (where the friend can try the same), and the words, if not "<title>: right / total".
  sharePath: string;
  shareText?: (correct: number, total: number) => string;
}) {
  const t = useTranslations('App.math.quiz');
  const tm = useTranslations('App.math');
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const { signedIn } = useFavoritesData();
  const saver = useFetcher<{ ok: boolean }>();
  const locale = useLocale();

  const question = questions[index];
  const total = fixedTotal ?? questions.length;
  const revealed = selected !== null;
  const correctCount = answers.filter((answer, answerIndex) => answer === questions[answerIndex].answerIndex).length;
  const backLink = <MathBreadcrumb crumbs={crumbs} />;

  useEffect(() => { if (current) saveResume(current); }, [current?.unit, current?.item, current?.set]);

  function answer(choiceIndex: number) {
    if (revealed || finished) return;
    setSelected(choiceIndex);
    setAnswers(previous => [...previous, choiceIndex]);
    onAnswered?.(index, choiceIndex === question.answerIndex);
  }
  function advance() {
    if (index + 1 >= total) {
      setFinished(true);
      if (!current) return;
      markSetDone(`${current.unit}/${current.item}/${current.set}`);
      if (next) saveResume(next.set);
      if (signedIn && version) saver.submit({ problemIds: JSON.stringify(questions.map(q => q.id)), answers: JSON.stringify(answers), version }, { method: 'post' });
      return;
    }
    setIndex(index + 1);
    setSelected(null);
  }
  function restart() {
    if (onRetry) { onRetry(); return; }
    setIndex(0);
    setSelected(null);
    setAnswers([]);
    setFinished(false);
  }
  // Keys 1-4 answer, as the numbers on the choices say.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || (event.target as HTMLElement | null)?.closest('input, textarea, select')) return;
      const choice = Number(event.key) - 1;
      if (Number.isInteger(choice) && choice >= 0 && choice < (question?.choices.length ?? 0)) answer(choice);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (total === 0) {
    return <ToolLayout title={title} aboveTitle={backLink}>
      <div className={styles.quiz}>
        <p className={styles.setName}>{setLabel}</p>
        <p role="status">{t('setComingSoon')}</p>
      </div>
    </ToolLayout>;
  }

  // One mark per problem: right, wrong or still to come.
  const track = <ol className={styles.track} aria-hidden="true">
    {Array.from({ length: total }, (_, at) => <li key={at} data-state={at < answers.length ? (answers[at] === questions[at].answerIndex ? 'correct' : 'incorrect') : at === index && !finished ? 'current' : undefined} />)}
  </ol>;

  if (finished) {
    const percent = Math.round((correctCount / total) * 100);
    const perfect = correctCount === total;
    // All right: going on is the main button; otherwise trying again is.
    const retryButton = <button type="button" className={perfect && next ? styles.secondary : styles.primary} onClick={restart}>{retryLabel ?? t('retry')}</button>;
    const nextLink = next && <Link href={next.href} className={perfect ? styles.primary : styles.secondary}>
      <span>{t('nextSet')}</span><span className={styles.nextLabel}>{next.label}</span>
    </Link>;
    return <ToolLayout title={title} centerTitle compact aboveTitle={backLink}>
      <div className={styles.quiz}>
        <p className={styles.setName}>{setLabel}</p>
        {result}
        <p className={styles.score} aria-live="polite" data-perfect={perfect || undefined}>{t('resultCorrect', { correct: correctCount, total })}</p>
        <p className={styles.resultLine}>{t('resultAccuracy', { percent })}</p>
        {questions.some(q => q.source) ? <ol className={styles.review} data-math-review>
          {questions.map((q, at) => {
            const right = answers[at] === q.answerIndex;
            return <li key={q.id} data-correct={right || undefined}>
              <span className={styles.reviewMark} aria-hidden="true">{right ? '○' : '×'}</span>
              <span className={styles.srOnly}>{t('questionNumber', { number: at + 1 })} {right ? t('correct') : t('incorrect')}</span>
              {q.source && <Link href={q.source.href}>{q.source.label}</Link>}
            </li>;
          })}
        </ol> : <ol className={styles.marks}>
          {questions.map((q, at) => {
            const right = answers[at] === q.answerIndex;
            return <li key={q.id} data-correct={right || undefined}>
              <span aria-hidden="true">{right ? '○' : '×'}</span>
              <span className={styles.srOnly}>{t('questionNumber', { number: at + 1 })} {right ? t('correct') : t('incorrect')}</span>
            </li>;
          })}
        </ol>}
        <div className={styles.resultActions}>
          {perfect ? <>{nextLink}{retryButton}</> : <>{retryButton}{nextLink}</>}
        </div>
        {/* The link goes to the same set or test, so that a friend can try it. Only after the end, in the browser: window is there. */}
        <ShareButtons text={shareText ? shareText(correctCount, total) : t('shareText', { title: setLabel, correct: correctCount, total })} url={`${window.location.origin}/${locale}${sharePath}`} />
        {current && <p className={styles.saveStatus} role="status">
          {!signedIn ? t('signInToSave')
            : saver.state !== 'idle' ? null
              : saver.data?.ok ? t('saved') : saver.data ? t('saveFailed') : null}
        </p>}
      </div>
    </ToolLayout>;
  }

  return <ToolLayout title={title} compact aboveTitle={backLink}>
    <div className={styles.quiz}>
      <p className={styles.setName}>{setLabel}</p>
      {track}
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
            onClick={() => answer(choiceIndex)}>
            <span className={styles.number} aria-hidden="true">{choiceIndex + 1}</span>
            {choice}
          </button>;
        })}
      </div>
      {/* The verdict and "Next" come right under the choices, so the next step is never pushed off screen; the explanation (which can be
          long) goes below them. The verdict line is always in the page, so a screen reader announces it when its text appears. */}
      <div className={styles.action}>
        <p className={styles.verdict} data-correct={(revealed && selected === question.answerIndex) || undefined} aria-live="polite">
          {revealed ? (selected === question.answerIndex ? t('correct') : t('incorrect')) : ''}
        </p>
        {revealed && <button type="button" className={styles.primary} onClick={advance} autoFocus>{index + 1 >= total ? t('seeResult') : t('next')}</button>}
      </div>
      {revealed && <div className={styles.feedback}><div className={styles.explanation}>{question.explanation}</div></div>}
    </div>
  </ToolLayout>;
}
