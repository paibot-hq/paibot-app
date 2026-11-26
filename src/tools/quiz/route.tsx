import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'use-intl';
import PublicHead from '../../components/public-head';
import ToolLayout from '../../components/tool-layout';
import type { QuizQuestion } from '../../lib/quiz';
import styles from './quiz.module.css';

function Solution({ question }: { question: QuizQuestion }) {
  const t = useTranslations('App.quiz');
  return <div className={styles.solution}><p>{question.explanation}</p>
    <a href={question.source} target="_blank" rel="noopener noreferrer">{t('source')}</a>
  </div>;
}
export default function Quiz() {
  const locale = useLocale();
  return <QuizGame key={locale} locale={locale} />;
}
function QuizGame({ locale }: { locale: string }) {
  const t = useTranslations('App.quiz');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const request = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const finished = questions.length > 0 && answers.length === questions.length;
  const question = questions[answers.length];
  const score = answers.filter((answer, index) => answer === questions[index].answerIndex).length;
  const mistakes = questions.filter((item, index) => answers[index] !== item.answerIndex);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => { if (questions.length) heading.current?.focus(); }, [questions, answers.length]);
  async function start() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    setLoading(true); setFailed(false); setQuestions([]); setAnswers([]); setSelected(null);
    try {
      const response = await fetch(`/api/quiz?locale=${encodeURIComponent(locale)}`, { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) throw new Error('Quiz unavailable');
      const body = await response.json() as { questions: QuizQuestion[] };
      if (body.questions.length !== 5) throw new Error('Incomplete round');
      if (request.current === controller) setQuestions(body.questions);
    } catch { if (request.current === controller) setFailed(true); }
    finally { clearTimeout(timeout); if (request.current === controller) setLoading(false); }
  }
  function next() {
    if (selected === null) return;
    setAnswers(previous => [...previous, selected]); setSelected(null);
  }
  function back() { setQuestions([]); setAnswers([]); setSelected(null); setFailed(false); }
  return <><PublicHead locale={locale} path="/quiz" title={`${t('title')} | PAIBOT.app`} description={t('description')} />
    <ToolLayout title={t('title')}><div className={styles.quiz}>
      {!questions.length ? <>
        <p className={styles.intro}>{t('intro')}</p><p className={styles.note}>{t('note')}</p>
        {failed && <p role="alert">{t('loadError')}</p>}
        {/* The button stays under the choices (the explanation can be long and would push it off screen). */}
        <div className={styles.actions}><button className={styles.primary} disabled={loading} onClick={start}>{loading ? t('loading') : t('start')}</button></div>
      </> : finished ? <section>
        <h2 ref={heading} tabIndex={-1}>{t('complete')}</h2>
        <p className={styles.score} data-quiz-score>{t('score', { score, total: questions.length })}</p>
        <p>{score === questions.length ? t('perfect') : t('encourage')}</p>
        <div className={styles.actions}><button onClick={start}>{t('retry')}</button><button onClick={back}>{t('back')}</button></div>
        {mistakes.length > 0 && <><h3>{t('review')}</h3>{mistakes.map(item => <article className={styles.review} key={item.id}>
          <h4>{item.prompt}</h4><p>{t('yourAnswer', { answer: item.choices[answers[questions.indexOf(item)]] })}</p>
          <p>{t('rightAnswer', { answer: item.choices[item.answerIndex] })}</p><Solution question={item} />
        </article>)}</>}
      </section> : <section>
        <div className={styles.topline}><span>{t('progress', { current: answers.length + 1, total: questions.length })}</span></div>
        <progress value={answers.length} max={questions.length} aria-label={t('progressLabel')} />
        <h2 ref={heading} tabIndex={-1} className={styles.question} data-quiz-question={question.id}>{question.prompt}</h2>
        <p className={styles.note}>{t('pickAnswer')}</p>
        <div className={styles.choices}>{question.choices.map((choice, index) => <button key={index} disabled={selected !== null}
          data-quiz-choice={index} data-result={selected === null ? undefined : index === question.answerIndex ? 'correct' : index === selected ? 'incorrect' : undefined}
          aria-pressed={selected === index} onClick={() => { if (selected === null) setSelected(index); }}>
          <small aria-hidden="true">{index + 1}</small><span>{choice}</span>
        </button>)}</div>
        {/* The button stays under the choices (the explanation can be long and would push it off screen). */}
        <div className={styles.actions}><button className={styles.primary} disabled={selected === null} onClick={next}>{answers.length + 1 === questions.length ? t('seeResults') : t('next')}</button></div>
        {selected !== null && <div className={styles.feedback} role="status">
          <strong>{selected === question.answerIndex ? t('correct') : t('incorrect')}</strong>
          <p>{t('rightAnswer', { answer: question.choices[question.answerIndex] })}</p><Solution question={question} />
        </div>}
        <button className={styles.back} onClick={back}>{t('back')}</button>
      </section>}
    </div></ToolLayout>
  </>;
}
