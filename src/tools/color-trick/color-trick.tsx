import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'use-intl';
import ToolLayout from '../../components/tool-layout';
import { COLORS, draw, points, type Color } from './logic';
import s from './color-trick.module.css';
const STORAGE = 'paibot:color-trick:best';
export default function ColorTrick() {
  const t = useTranslations('App.colorTrick');
  const [phase, setPhase] = useState<'ready' | 'playing' | 'done'>('ready');
  const [card, setCard] = useState({ ink: 'pink' as Color, word: 'blue' as Color });
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [remaining, setRemaining] = useState(30);
  const [best, setBest] = useState(0);
  const [feedback, setFeedback] = useState('');
  const deadline = useRef(0);
  const scoreRef = useRef(0);
  const locked = useRef(false);
  useEffect(() => { try { const value = Number(localStorage.getItem(STORAGE)); if (Number.isFinite(value) && value > 0) setBest(value); } catch {} }, []);
  function finish() {
    locked.current = true;
    setPhase('done'); setRemaining(0);
    setBest(previous => {
      const next = Math.max(previous, scoreRef.current);
      try { localStorage.setItem(STORAGE, String(next)); } catch {}
      return next;
    });
  }
  useEffect(() => {
    if (phase !== 'playing') return;
    const timer = window.setInterval(() => {
      const left = Math.max(0, (deadline.current - performance.now()) / 1000);
      setRemaining(left);
      if (left === 0) finish();
    }, 50);
    return () => window.clearInterval(timer);
  }, [phase]);
  function start() {
    scoreRef.current = 0; locked.current = false;
    setScore(0); setStreak(0); setCorrect(0); setTotal(0); setFeedback('');
    setCard(draw()); setRemaining(30); deadline.current = performance.now() + 30000; setPhase('playing');
  }
  function answer(color: Color) {
    if (phase !== 'playing' || locked.current) return;
    if (performance.now() >= deadline.current) { finish(); return; }
    const right = color === card.ink;
    const gained = right ? points(streak) : 0;
    scoreRef.current += gained;
    setScore(scoreRef.current); setTotal(value => value + 1);
    if (right) { setCorrect(value => value + 1); setStreak(value => value + 1); }
    else setStreak(0);
    setFeedback(right ? t('right', { points: gained }) : t('wrong'));
    setCard(draw(card.ink));
  }
  return <ToolLayout title={t('title')}>
    <section className={s.game} aria-label={t('title')}>
      <div className={s.top}><span className={s.label}>BRAIN / PLAY / 01</span><span className={s.best}>{t('best')} <b>{best}</b></span></div>
      <div className={s.heading}><span className={s.dot} />{t('tagline')}</div>
      <p className={s.intro}>{t('intro')}</p>
      <div className={s.stats}><div><span>{t('score')}</span><strong data-score>{score.toString().padStart(3, '0')}</strong></div><div><span>{t('time')}</span><strong>{Math.ceil(remaining)}<small>s</small></strong></div><div><span>{t('combo')}</span><strong>×{Math.min(4, 1 + Math.floor(streak / 5))}</strong></div></div>
      <div className={s.track}><div style={{ width: `${remaining / 30 * 100}%` }} /></div>
      {phase === 'done' ? <div className={s.card} aria-live="polite"><span className={s.eyebrow}>{t('finished')}</span><strong className={s.result}>{score}</strong><p>{t('accuracy', { correct, total })}</p></div> : <div className={s.card}>
        <span className={s.eyebrow}>{t(phase === 'playing' ? 'question' : 'example')}</span>
        <span className={s.word} data-ink={card.ink} style={{ color: `var(--ink-${card.ink})` }}>{t(card.word)}</span>
        <span className={s.hint}>{phase === 'ready' ? t('exampleHint') : t('streak', { count: streak })}</span>
      </div>}
      {phase === 'playing' ? <><div className={s.answers}>{COLORS.map(color => <button key={color} type="button" onClick={() => answer(color)}><i style={{ background: `var(--ink-${color})` }} />{t(color)}</button>)}</div><p className={s.feedback} aria-live="polite">{feedback || t('go')}</p></> : <><button className={s.start} onClick={start}>{t(phase === 'done' ? 'again' : 'start')} <span aria-hidden="true">↗</span></button><p className={s.footnote}>{t('rules')}</p></>}
    </section>
  </ToolLayout>;
}
