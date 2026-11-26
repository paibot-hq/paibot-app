import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'use-intl';
import { MathTex } from '../../components/math-tex';
import { Link } from '../../i18n/navigation';
import { createLabAnalytics } from '../../lib/analytics';
import {
  EMBEDDINGS, POSITIONS, PRESETS, VOCAB, WORD_TEXT,
  runTransformer, type Preset, type Vec,
} from './transformer';
import styles from './transformer-view.module.css';

const STEPS = ['embed', 'attend', 'ffn', 'predict'] as const;
type Step = (typeof STEPS)[number];

// The plane: 320×320 with the origin in the middle; one unit is 75px, so the
// longest vector on the page (max |x_i| = 1.45) stays inside with room for labels.
const CENTER = 160;
const UNIT = 75;
const px = (x: number) => CENTER + x * UNIT;
const py = (y: number) => CENTER - y * UNIT;

function number(value: number) {
  return value.toFixed(2).replace('-', '−');
}

function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
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

export default function TransformerView() {
  const t = useTranslations('App.transformer');
  const [preset, setPreset] = useState<Preset>(PRESETS[0]);
  const [step, setStep] = useState<Step>('embed');
  const analytics = useRef<ReturnType<typeof createLabAnalytics> | null>(null);
  analytics.current ??= createLabAnalytics('transformer');

  const result = runTransformer(preset.words);
  const last = preset.words.length - 1;
  const lastText = WORD_TEXT[preset.words[last]];
  const topProb = Math.max(...result.probs);

  useEffect(() => {
    analytics.current?.view();
  }, []);

  // Step 3 moves the arrow from the attended vector z to the block's output u.
  const [moved, setMoved] = useState<Vec>(result.attended);
  const target = step === 'ffn' ? result.output : result.attended;
  useEffect(() => {
    const from = result.attended, to = target;
    if (step !== 'ffn' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
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
  }, [step, preset.id]);

  function choosePreset(next: Preset) {
    analytics.current?.changeSetting('preset');
    setPreset(next);
    setStep('embed');
  }

  function chooseStep(next: Step) {
    analytics.current?.interact('step');
    setStep(next);
  }

  return <section id="transformer" className={styles.section} aria-label={t('title')}>
    <p className={styles.intro}>{t('intro')}</p>
    <div className={styles.experiment}>
      <div className={styles.controls}>
        <div className={styles.presets} role="group" aria-label={t('presets')}>
          {PRESETS.map(candidate =>
            <button key={candidate.id} type="button" aria-pressed={candidate.id === preset.id} onClick={() => choosePreset(candidate)}>
              {candidate.words.map(word => WORD_TEXT[word]).join('')}…
            </button>)}
        </div>
        <p className={styles.gloss}>{t(`gloss.${preset.id}`)}</p>
        <div className={styles.sentence} aria-label={t('sentenceLabel')}>
          {preset.words.map((word, index) =>
            <span key={index} className={styles.word} data-last={index === last || undefined}>{WORD_TEXT[word]}</span>)}
          <span className={styles.nextSlot} data-revealed={step === 'predict' || undefined} aria-label={t('nextSlot')}>
            {step === 'predict' ? WORD_TEXT[result.predicted] : '？'}
          </span>
        </div>
        <div className={styles.steps} role="group" aria-label={t('stepsLabel')}>
          {STEPS.map((candidate, index) =>
            <button key={candidate} type="button" aria-pressed={candidate === step} onClick={() => chooseStep(candidate)}>
              <strong>{index + 1}</strong><span>{t(`steps.${candidate}`)}</span>
            </button>)}
        </div>
      </div>

      <div className={styles.panel}>
        {step === 'embed' && <>
          <Plane ariaLabel={t('planeEmbed')}>
            {preset.words.map((word, index) => {
              const e = EMBEDDINGS[word];
              const x = result.xs[index];
              return <g key={index} className={styles.token}>
                <line x1={px(e[0])} y1={py(e[1])} x2={px(x[0])} y2={py(x[1])} strokeDasharray="3 3" />
                <circle className={styles.embedDot} cx={px(e[0])} cy={py(e[1])} r={4} />
                <circle className={styles.tokenDot} cx={px(x[0])} cy={py(x[1])} r={5.5} />
                <text x={px(x[0])} y={py(x[1]) - 10} textAnchor="middle">{WORD_TEXT[word]}</text>
              </g>;
            })}
          </Plane>
          <table className={styles.table} aria-label={t('embedTitle')}>
            <thead><tr><th scope="col">{t('wordHeader')}</th><th scope="col">{t('embedHeader')}</th><th scope="col">{t('posHeader')}</th></tr></thead>
            <tbody>
              {preset.words.map((word, index) =>
                <tr key={index}>
                  <th scope="row">{WORD_TEXT[word]}</th>
                  <td>({number(EMBEDDINGS[word][0])}, {number(EMBEDDINGS[word][1])})</td>
                  <td>({number(POSITIONS[index][0])}, {number(POSITIONS[index][1])})</td>
                </tr>)}
            </tbody>
          </table>
        </>}

        {step === 'attend' && <>
          <h3 className={styles.panelTitle}>{t('weightsTitle', { word: lastText })}</h3>
          <ul className={styles.bars}>
            {preset.words.map((word, index) =>
              <li key={index}>
                <span className={styles.barWord}>{WORD_TEXT[word]}</span>
                <span className={styles.barTrack}>
                  <span className={styles.barFill} style={{ width: `${result.weights[index] * 100}%` }} />
                </span>
                <span className={styles.barValue}>{percent(result.weights[index])}</span>
              </li>)}
          </ul>
          <p className={styles.note}>
            {t('attendNote')}{' '}
            <Link href="/attention" onClick={() => analytics.current?.interact('step')}>{t('attentionDetail')} <span aria-hidden="true">→</span></Link>
          </p>
        </>}

        {step === 'ffn' && <>
          <Plane ariaLabel={t('planeFfn')}>
            <Arrow vec={result.attended} className={styles.ghostArrow} dashed label={`${lastText} z`} />
            <g className={styles.correction}>
              <line x1={px(result.attended[0])} y1={py(result.attended[1])} x2={px(result.output[0])} y2={py(result.output[1])} strokeDasharray="4 3" />
            </g>
            <Arrow vec={moved} className={styles.outputArrow} label={lastText} labelOffset={24} />
          </Plane>
          <p className={styles.output}>{t('newVector', { word: lastText, x: number(result.output[0]), y: number(result.output[1]) })}</p>
        </>}

        {step === 'predict' && <>
          <h3 className={styles.panelTitle}>{t('probsTitle')}</h3>
          <ul className={styles.vocabBars}>
            {VOCAB.map((word, index) =>
              <li key={word} data-top={result.probs[index] === topProb || undefined}>
                <span className={styles.barWord}>{WORD_TEXT[word]}</span>
                <span className={styles.barTrack}>
                  <span className={styles.barFill} style={{ width: `${result.probs[index] * 100}%` }} />
                </span>
                <span className={styles.barValue}>{percent(result.probs[index])}</span>
              </li>)}
          </ul>
          <p className={styles.prediction} role="status">
            {t('prediction', { word: WORD_TEXT[result.predicted], percent: percent(topProb) })}
          </p>
          <p className={styles.note}>{t('layersNote')}</p>
        </>}

        <p className={styles.hint}>{t(`hint.${step}`, { word: lastText })}</p>
      </div>
    </div>

    <div className={styles.explanation}>
      <h3>{t('ruleTitle')}</h3>
      <div className={styles.formula}><MathTex tex={String.raw`\begin{aligned}
        x_i &= e_i + p_i,\quad z = \textstyle\sum_j \operatorname{softmax}_j(q\cdot k_j)\,v_j \\
        u &= z + W_2\operatorname{ReLU}(W_1 z),\quad P(w) = \operatorname{softmax}_w(\beta\, e_w\cdot u)
      \end{aligned}`} block /></div>
      <p>{t('rule')}</p>
      <p>{t('ffnText')}</p>
      <p>{t('predictText')}</p>
      <div className={styles.lessons}>
        <Link href="/attention">{t('attentionLab')} <span aria-hidden="true">→</span></Link>
        <Link href="/backprop">{t('backpropLab')} <span aria-hidden="true">→</span></Link>
        <Link href="/gradient-descent">{t('gdLab')} <span aria-hidden="true">→</span></Link>
      </div>
    </div>
  </section>;
}
