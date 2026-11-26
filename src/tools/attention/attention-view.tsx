import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'use-intl';
import { MathTex } from '../../components/math-tex';
import { Link } from '../../i18n/navigation';
import { createLabAnalytics } from '../../lib/analytics';
import {
  EMBEDDINGS, PRESETS, WORD_TEXT, attend, resolvedMeaning,
  type Preset, type Vec,
} from './attention';
import styles from './attention-view.module.css';

const STEPS = ['scores', 'weights', 'output'] as const;
type Step = (typeof STEPS)[number];

// The plane: 320×320 with the origin in the middle; one unit is 75px, so the
// longest vector on the page (|q| ≤ 1.5) stays inside with room for labels.
const CENTER = 160;
const UNIT = 75;
const px = (x: number) => CENTER + x * UNIT;
const py = (y: number) => CENTER - y * UNIT;

function number(value: number) {
  return value.toFixed(2).replace('-', '−');
}

function Arrow({ vec, className, dashed, label, labelOffset = 15 }: { vec: Vec; className?: string; dashed?: boolean; label?: string; labelOffset?: number }) {
  const [x, y] = vec;
  const length = Math.hypot(x, y);
  if (length < 0.01) return null;
  const angle = Math.atan2(-y, x) * 180 / Math.PI;
  return <g className={className}>
    <line x1={CENTER} y1={CENTER} x2={px(x)} y2={py(y)} strokeDasharray={dashed ? '5 4' : undefined} />
    <polygon points="0,0 -8,3.2 -8,-3.2" transform={`translate(${px(x)} ${py(y)}) rotate(${angle})`} />
    {label && <text x={CENTER + (length * UNIT + labelOffset) * (x / length)} y={CENTER - (length * UNIT + labelOffset) * (y / length) + 4} textAnchor="middle">{label}</text>}
  </g>;
}

function Plane({ children, ariaLabel }: { children: React.ReactNode; ariaLabel: string }) {
  return <svg viewBox="-16 0 352 320" className={styles.plane} role="img" aria-label={ariaLabel}>
    <circle className={styles.unitCircle} cx={CENTER} cy={CENTER} r={UNIT} />
    <path className={styles.axes} d={`M12 ${CENTER}H308 M${CENTER} 12V308`} />
    {children}
  </svg>;
}

export default function AttentionView() {
  const t = useTranslations('App.attention');
  const [preset, setPreset] = useState<Preset>(PRESETS[0]);
  const [selected, setSelected] = useState(PRESETS[0].focus);
  const [step, setStep] = useState<Step>('scores');
  const analytics = useRef<ReturnType<typeof createLabAnalytics> | null>(null);
  analytics.current ??= createLabAnalytics('attention');

  const result = attend(preset.words, selected);
  const meaning = resolvedMeaning(preset, selected, result.weights);
  const original = EMBEDDINGS[preset.words[selected]];

  useEffect(() => {
    analytics.current?.view();
  }, []);

  // Step 3 moves the arrow from the word's own vector to the attention output.
  const [moved, setMoved] = useState<Vec>(original);
  const target = step === 'output' ? result.output : original;
  useEffect(() => {
    const from = original, to = target;
    if (step !== 'output' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMoved(to);
      return;
    }
    setMoved(from);
    let raf = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / 500);
      const eased = 1 - (1 - progress) ** 3;
      setMoved([from[0] + (to[0] - from[0]) * eased, from[1] + (to[1] - from[1]) * eased]);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, preset.id, selected]);

  function choosePreset(next: Preset) {
    analytics.current?.changeSetting('preset');
    setPreset(next);
    setSelected(next.focus);
    setStep('scores');
  }

  function chooseWord(index: number) {
    analytics.current?.interact('step');
    setSelected(index);
    setStep('scores');
  }

  function chooseStep(next: Step) {
    analytics.current?.interact('step');
    setStep(next);
  }

  const selectedText = WORD_TEXT[preset.words[selected]];

  return <section id="attention" className={styles.section} aria-label={t('title')}>
    <p className={styles.intro}>{t('intro')}</p>
    <div className={styles.experiment}>
      <div className={styles.controls}>
        <div className={styles.presets} role="group" aria-label={t('presets')}>
          {PRESETS.map(candidate =>
            <button key={candidate.id} type="button" aria-pressed={candidate.id === preset.id} onClick={() => choosePreset(candidate)}>
              {candidate.words.map(word => WORD_TEXT[word]).join('')}
            </button>)}
        </div>
        <p className={styles.gloss}>{t(`gloss.${preset.id}`)}</p>
        <div className={styles.sentence} role="group" aria-label={t('selectWord')}>
          {preset.words.map((word, index) =>
            <button key={index} type="button" className={styles.word} aria-pressed={index === selected} onClick={() => chooseWord(index)}>
              {WORD_TEXT[word]}
            </button>)}
        </div>
        <div className={styles.steps} role="group" aria-label={t('stepsLabel')}>
          {STEPS.map((candidate, index) =>
            <button key={candidate} type="button" aria-pressed={candidate === step} onClick={() => chooseStep(candidate)}>
              <strong>{index + 1}</strong><span>{t(`steps.${candidate}`)}</span>
            </button>)}
        </div>
      </div>

      <div className={styles.panel}>
        {step === 'scores' && <>
          <Plane ariaLabel={t('planeScores', { word: selectedText })}>
            {preset.words.map((word, index) =>
              <Arrow key={index} vec={result.keys[index]} className={styles.keyArrow} label={`${WORD_TEXT[word]} k`} />)}
            <Arrow vec={result.q} className={styles.queryArrow} label={`${selectedText} q`} labelOffset={32} />
          </Plane>
          <table className={styles.scores} aria-label={t('scoresTitle')}>
            <thead><tr><th scope="col">{t('wordHeader')}</th><th scope="col">{t('scoreHeader')}</th></tr></thead>
            <tbody>
              {preset.words.map((word, index) =>
                <tr key={index} data-selected={index === selected || undefined}>
                  <th scope="row">{WORD_TEXT[word]}</th>
                  <td>{number(result.scores[index])}</td>
                </tr>)}
            </tbody>
          </table>
        </>}

        {step === 'weights' && <>
          <h3 className={styles.panelTitle}>{t('weightsTitle', { word: selectedText })}</h3>
          <ul className={styles.bars}>
            {preset.words.map((word, index) =>
              <li key={index}>
                <span className={styles.barWord}>{WORD_TEXT[word]}</span>
                <span className={styles.barTrack}>
                  <span className={styles.barFill} style={{ width: `${result.weights[index] * 100}%` }} />
                </span>
                <span className={styles.barValue}>{(result.weights[index] * 100).toFixed(1)}%</span>
              </li>)}
          </ul>
          <p className={styles.note}>{t('exampleNote')}</p>
        </>}

        {step === 'output' && <>
          <Plane ariaLabel={t('planeOutput', { word: selectedText })}>
            {preset.words.map((word, index) =>
              <Arrow key={index} vec={[result.values[index][0] * result.weights[index], result.values[index][1] * result.weights[index]]}
                className={styles.valueArrow} label={`${WORD_TEXT[word]} v`} />)}
            <Arrow vec={original} className={styles.ghostArrow} dashed />
            <Arrow vec={moved} className={styles.outputArrow} label={selectedText} />
          </Plane>
          <p className={styles.output}>{t('newVector', { word: selectedText, x: number(result.output[0]), y: number(result.output[1]) })}</p>
          {meaning && <p className={styles.meaning} role="status">{t('meaningLabel')}<strong>{t(`meanings.${meaning}`)}</strong></p>}
        </>}

        <p className={styles.hint}>{t(`hint.${step}`, { word: selectedText })}</p>
      </div>
    </div>

    <div className={styles.explanation}>
      <h3>{t('ruleTitle')}</h3>
      <div className={styles.formula}><MathTex tex={String.raw`\begin{aligned}
        q_i &= W_Q\,x_i,\quad k_i = W_K\,x_i,\quad v_i = W_V\,x_i \\
        w_{ij} &= \operatorname{softmax}_j(q_i\cdot k_j),\quad x_i' = \textstyle\sum_j w_{ij}\,v_j
      \end{aligned}`} block /></div>
      <p>{t('rule')}</p>
      <p>{t('softmaxText')}</p>
      <p>{t('contextText')}</p>
      <div className={styles.lessons}>
        <Link href="/ai-ds/arch/attention" onClick={() => analytics.current?.lessonClick('ai-ds')}>{t('aiLesson')} <span aria-hidden="true">→</span></Link>
        <Link href="/gradient-descent">{t('gdLab')} <span aria-hidden="true">→</span></Link>
      </div>
    </div>
  </section>;
}
