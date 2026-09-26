import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'use-intl';
import { MathTex } from '../components/math-tex';
import PublicHead from '../components/public-head';
import ToolLayout from '../components/tool-layout';
import { Link } from '../i18n/navigation';
import { factoredTex, generateFactorizationSet, trinomialTex } from '../lib/math-factorization';
import type { Route } from './+types/math-factorization';
import styles from './math-factorization.module.css';

// Same 404 pattern as locale.tsx's isLocale check: an invalid setId is a
// routing error, not a state the UI needs to render around.
export async function loader({ params }: Route.LoaderArgs) {
  const setId = Number(params.setId);
  if (!Number.isInteger(setId) || setId < 1) throw new Response('Not Found', { status: 404 });
  return { setId, questions: generateFactorizationSet(setId) };
}

export default function MathFactorization({ loaderData }: Route.ComponentProps) {
  const { setId, questions } = loaderData;
  const locale = useLocale();
  const t = useTranslations('App.math.factorization');

  // The lib returns locale-neutral numbers; the tex/explanation strings that
  // depend on locale (KaTeX notation doesn't, but the explanation text does)
  // are built here rather than inside the pure generator.
  const displayQuestions = useMemo(() => questions.map(question => ({
    id: question.id,
    tex: trinomialTex(question.a, question.b),
    choices: question.choices.map(factoredTex),
    correctIndex: question.correctIndex,
    explanation: t('explanationTemplate', { p: question.p, q: question.q, a: question.a, b: question.b }),
  })), [questions, t]);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const question = displayQuestions[index];
  const total = displayQuestions.length;

  function submit() {
    if (selected === null) return;
    setRevealed(true);
    if (selected === question.correctIndex) setCorrectCount(count => count + 1);
  }
  function next() {
    if (index + 1 >= total) { setFinished(true); return; }
    setIndex(index + 1);
    setSelected(null);
    setRevealed(false);
  }
  function restart() {
    setIndex(0);
    setSelected(null);
    setRevealed(false);
    setCorrectCount(0);
    setFinished(false);
  }

  const path = `/math/factorization/${setId}`;

  if (finished) {
    const percent = Math.round((correctCount / total) * 100);
    return <><PublicHead locale={locale} path={path} title={`${t('title')} | PAIBOT.app`} description={t('description')} />
      <ToolLayout title={t('title')} layout="centered" centerTitle>
        <div className={styles.quiz}>
          <p className={styles.back}><Link href="/math/factorization">{`← ${t('backToSets')}`}</Link></p>
          <p className={styles.resultLine} aria-live="polite">{t('resultCorrect', { correct: correctCount, total })}</p>
          <p className={styles.resultLine}>{t('resultAccuracy', { percent })}</p>
          <button type="button" className={styles.primary} onClick={restart}>{t('retry')}</button>
        </div>
      </ToolLayout>
    </>;
  }

  return <><PublicHead locale={locale} path={path} title={`${t('title')} | PAIBOT.app`} description={t('description')} />
    <ToolLayout title={t('title')}>
      <div className={styles.quiz}>
        <p className={styles.back}><Link href="/math/factorization">{`← ${t('backToSets')}`}</Link></p>
        <p className={styles.progress} aria-live="polite">{t('progress', { current: index + 1, total })}</p>
        <div className={styles.question}><MathTex tex={question.tex} block /></div>
        <div className={styles.choices} role="group" aria-label={t('title')}>
          {question.choices.map((choice, choiceIndex) => {
            const isCorrectChoice = choiceIndex === question.correctIndex;
            const isSelected = choiceIndex === selected;
            const state = !revealed ? undefined : isCorrectChoice ? 'correct' : isSelected ? 'incorrect' : undefined;
            return <button key={choiceIndex} type="button" className={styles.choice} data-state={state}
              aria-pressed={isSelected} disabled={revealed}
              onClick={() => setSelected(choiceIndex)}>
              <MathTex tex={choice} />
            </button>;
          })}
        </div>
        {!revealed
          ? <button type="button" className={styles.primary} disabled={selected === null} onClick={submit}>{t('answer')}</button>
          : <div className={styles.feedback} aria-live="polite">
            <p className={styles.verdict} data-correct={selected === question.correctIndex || undefined}>
              {selected === question.correctIndex ? t('correct') : t('incorrect')}
            </p>
            <p className={styles.explanation}>{question.explanation}</p>
            <button type="button" className={styles.primary} onClick={next}>{t('next')}</button>
          </div>}
      </div>
    </ToolLayout>
  </>;
}
