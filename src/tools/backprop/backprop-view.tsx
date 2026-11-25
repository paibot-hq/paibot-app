import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'use-intl';
import { MathTex } from '../../components/math-tex';
import { Link } from '../../i18n/navigation';
import { createLabAnalytics } from '../../lib/analytics';
import {
  INITIAL_WEIGHTS, LEARNING_RATE, NUDGE, TARGET, WEIGHT_IDS, X,
  fmt, forward, gradientOf, gradients, nudgedLoss, updated,
  type WeightId,
} from './backprop';
import styles from './backprop-view.module.css';

const STEPS = ['forward', 'backward', 'nudge', 'update'] as const;
type Step = (typeof STEPS)[number];

// Step 2 walks the chain rule in from the loss: first ∂L/∂y, then the
// output-side weights and the hidden units, then the input-side weights.
const STAGES = ['out', 'mid', 'in'] as const;

// Everything on the page is derived from the one set of hand-placed constants.
const f = forward(INITIAL_WEIGHTS);
const g = gradients(INITIAL_WEIGHTS);
const next = updated(INITIAL_WEIGHTS);
const nextLoss = forward(next).loss;

const WEIGHT_TEX: Record<WeightId, string> = { w1: 'w_1', w2: 'w_2', v1: 'v_1', v2: 'v_2' };
const WEIGHT_LABEL: Record<WeightId, string> = { w1: 'w₁', w2: 'w₂', v1: 'v₁', v2: 'v₂' };
const GRAD_LABEL: Record<WeightId, string> = { w1: '∂L/∂w₁', w2: '∂L/∂w₂', v1: '∂L/∂v₁', v2: '∂L/∂v₂' };

// Node centres in the 360×252 viewBox.
const NX = { x: 42, y: 126 };
const NH1 = { x: 178, y: 62 };
const NH2 = { x: 178, y: 190 };
const NY = { x: 304, y: 126 };
const R = 20;

function Edge({ from, to, active }: { from: { x: number; y: number }; to: { x: number; y: number }; active?: boolean }) {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const u = { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
  return <line
    className={active ? styles.edgeActive : styles.edge}
    x1={from.x + u.x * R} y1={from.y + u.y * R}
    x2={to.x - u.x * (R + 2)} y2={to.y - u.y * (R + 2)}
    markerEnd="url(#backprop-arrow)"
  />;
}

export default function BackpropView() {
  const t = useTranslations('App.backprop');
  const [step, setStep] = useState<Step>('forward');
  const [stage, setStage] = useState(0);
  const [weight, setWeight] = useState<WeightId>('w1');
  const analytics = useRef<ReturnType<typeof createLabAnalytics> | null>(null);
  analytics.current ??= createLabAnalytics('backprop');

  useEffect(() => {
    analytics.current?.view();
  }, []);

  function chooseStep(nextStep: Step) {
    analytics.current?.interact('step');
    setStep(nextStep);
    setStage(0);
  }

  function chooseStage(index: number) {
    analytics.current?.interact('step');
    setStage(index);
  }

  function chooseWeight(id: WeightId) {
    analytics.current?.interact('step');
    setWeight(id);
  }

  const backward = step === 'backward';
  const showMid = backward && stage >= 1;
  const showIn = backward && stage >= 2;
  const grad = gradientOf(g, weight);
  const predicted = grad * NUDGE;
  const actual = nudgedLoss(INITIAL_WEIGHTS, weight) - f.loss;

  // What each edge prints: the weight on steps 1/3/4, the gradient so far on step 2.
  const edgeText = (id: WeightId, value: number) => {
    if (!backward) return `${WEIGHT_LABEL[id]} = ${fmt(value, 2)}`;
    const shown = id === 'v1' || id === 'v2' ? showMid : showIn;
    return shown ? `${GRAD_LABEL[id]} = ${fmt(gradientOf(g, id))}` : WEIGHT_LABEL[id];
  };

  return <section id="backprop" className={styles.section} aria-label={t('title')}>
    <p className={styles.intro}>{t('intro')}</p>
    <div className={styles.experiment}>
      <div className={styles.steps} role="group" aria-label={t('stepsLabel')}>
        {STEPS.map((candidate, index) =>
          <button key={candidate} type="button" aria-pressed={candidate === step} onClick={() => chooseStep(candidate)}>
            <strong>{index + 1}</strong><span>{t(`steps.${candidate}`)}</span>
          </button>)}
      </div>

      <div className={styles.panel}>
        <svg viewBox="0 0 360 252" className={styles.net} role="img" aria-label={t(backward ? 'netBackward' : 'netForward')}>
          <defs>
            <marker id="backprop-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0L8 4L0 8z" className={styles.arrowHead} />
            </marker>
          </defs>
          {backward
            ? <>
              <Edge from={NH1} to={NX} active={showIn} />
              <Edge from={NH2} to={NX} active={showIn} />
              <Edge from={NY} to={NH1} active={showMid} />
              <Edge from={NY} to={NH2} active={showMid} />
              <Edge from={{ x: NY.x, y: 234 }} to={NY} active />
            </>
            : <>
              <Edge from={NX} to={NH1} />
              <Edge from={NX} to={NH2} />
              <Edge from={NH1} to={NY} />
              <Edge from={NH2} to={NY} />
              <Edge from={NY} to={{ x: NY.x, y: 234 }} />
            </>}

          <text className={styles.edgeLabel} x={106} y={80} textAnchor="middle">{edgeText('w1', INITIAL_WEIGHTS.w1)}</text>
          <text className={styles.edgeLabel} x={106} y={180} textAnchor="middle">{edgeText('w2', INITIAL_WEIGHTS.w2)}</text>
          <text className={styles.edgeLabel} x={248} y={80} textAnchor="middle">{edgeText('v1', INITIAL_WEIGHTS.v1)}</text>
          <text className={styles.edgeLabel} x={248} y={180} textAnchor="middle">{edgeText('v2', INITIAL_WEIGHTS.v2)}</text>

          <g className={styles.node}>
            <circle cx={NX.x} cy={NX.y} r={R} />
            <text x={NX.x} y={NX.y + 4} textAnchor="middle">x</text>
          </g>
          <text className={styles.value} x={NX.x} y={NX.y + 36} textAnchor="middle">{!backward && `x = ${fmt(X, 1)}`}</text>

          <g className={styles.node} data-active={showMid || undefined}>
            <circle cx={NH1.x} cy={NH1.y} r={R} />
            <text x={NH1.x} y={NH1.y + 4} textAnchor="middle">h₁</text>
          </g>
          <text className={styles.value} x={NH1.x} y={22} textAnchor="middle">
            {backward ? (showMid && `∂L/∂h₁ = ${fmt(g.dh1)}`) : `a₁ = ${fmt(f.a1)}`}
          </text>
          <text className={styles.value} x={NH1.x} y={34} textAnchor="middle">
            {backward ? (showMid && `∂L/∂a₁ = ${fmt(g.da1)}`) : `h₁ = tanh(a₁) = ${fmt(f.h1)}`}
          </text>

          <g className={styles.node} data-active={showMid || undefined}>
            <circle cx={NH2.x} cy={NH2.y} r={R} />
            <text x={NH2.x} y={NH2.y + 4} textAnchor="middle">h₂</text>
          </g>
          <text className={styles.value} x={NH2.x} y={226} textAnchor="middle">
            {backward ? (showMid && `∂L/∂h₂ = ${fmt(g.dh2)}`) : `a₂ = ${fmt(f.a2)}`}
          </text>
          <text className={styles.value} x={NH2.x} y={238} textAnchor="middle">
            {backward ? (showMid && `∂L/∂a₂ = ${fmt(g.da2)}`) : `h₂ = tanh(a₂) = ${fmt(f.h2)}`}
          </text>

          <g className={styles.node} data-active={backward || undefined}>
            <circle cx={NY.x} cy={NY.y} r={R} />
            <text x={NY.x} y={NY.y + 4} textAnchor="middle">y</text>
          </g>
          <text className={styles.value} x={NY.x} y={90} textAnchor="middle">
            {backward ? `∂L/∂y = ${fmt(g.dy)}` : `y = ${fmt(f.y)}`}
          </text>

          <g className={styles.loss}>
            <rect x={NY.x - 44} y={214} width={88} height={34} rx={8} />
            <text x={NY.x} y={228} textAnchor="middle">L = (y − t)²</text>
            <text x={NY.x} y={242} textAnchor="middle">{backward ? `t = ${fmt(TARGET, 1)}` : `= ${fmt(f.loss)}`}</text>
          </g>
        </svg>

        {step === 'forward' && <p className={styles.readout}>{t('forwardReadout', { y: fmt(f.y), loss: fmt(f.loss) })}</p>}

        {backward && <>
          <div className={styles.stages} role="group" aria-label={t('stagesLabel')}>
            {STAGES.map((candidate, index) =>
              <button key={candidate} type="button" aria-pressed={stage === index} onClick={() => chooseStage(index)}>
                {t(`stages.${candidate}`)}
              </button>)}
          </div>
          <p className={styles.readout}>{t(`stageText.${STAGES[stage]}`)}</p>
        </>}

        {step === 'nudge' && <>
          <div className={styles.weights} role="group" aria-label={t('selectWeight')}>
            {WEIGHT_IDS.map(id =>
              <button key={id} type="button" aria-pressed={id === weight} onClick={() => chooseWeight(id)}>
                {WEIGHT_LABEL[id]}
              </button>)}
          </div>
          <table className={styles.table} aria-label={t('nudgeTitle', { weight: WEIGHT_LABEL[weight] })}>
            <tbody>
              <tr><th scope="row">{t('analytic')} {GRAD_LABEL[weight]}</th><td>{fmt(grad)}</td></tr>
              <tr><th scope="row">{t('predicted', { weight: WEIGHT_LABEL[weight] })}</th><td>{fmt(predicted, 5)}</td></tr>
              <tr><th scope="row">{t('actual', { weight: WEIGHT_LABEL[weight] })}</th><td>{fmt(actual, 5)}</td></tr>
            </tbody>
          </table>
          <p className={styles.readout}>{t('nudgeNote')}</p>
        </>}

        {step === 'update' && <>
          <div className={styles.formula}>
            <MathTex tex={String.raw`w \leftarrow w - \eta\,\frac{\partial L}{\partial w},\qquad \eta = ${LEARNING_RATE}`} block />
          </div>
          <table className={styles.table} aria-label={t('updateTitle')}>
            <thead><tr><th scope="col">{t('weightHeader')}</th><th scope="col">{t('beforeHeader')}</th><th scope="col">{t('gradHeader')}</th><th scope="col">{t('afterHeader')}</th></tr></thead>
            <tbody>
              {WEIGHT_IDS.map(id =>
                <tr key={id}>
                  <th scope="row">{WEIGHT_LABEL[id]}</th>
                  <td>{fmt(INITIAL_WEIGHTS[id], 2)}</td>
                  <td>{fmt(gradientOf(g, id))}</td>
                  <td>{fmt(next[id])}</td>
                </tr>)}
            </tbody>
          </table>
          <p className={styles.lossDrop} role="status">
            {t('lossDrop')} <strong>{fmt(f.loss, 4)} → {fmt(nextLoss, 4)}</strong>
          </p>
        </>}

        <p className={styles.hint}>{t(`hint.${step}`)}</p>
      </div>
    </div>

    <div className={styles.explanation}>
      <h3>{t('ruleTitle')}</h3>
      <div className={styles.formula}><MathTex tex={String.raw`\begin{aligned}
        a_i &= w_i\,x,\quad h_i = \tanh(a_i),\quad y = v_1 h_1 + v_2 h_2,\quad L = (y - t)^2 \\
        \frac{\partial L}{\partial ${WEIGHT_TEX.w1}} &= \underbrace{2(y-t)}_{\partial L/\partial y}\cdot
        \underbrace{v_1}_{\partial y/\partial h_1}\cdot
        \underbrace{(1 - h_1^2)}_{\partial h_1/\partial a_1}\cdot
        \underbrace{x}_{\partial a_1/\partial w_1}
      \end{aligned}`} block /></div>
      <p>{t('rule')}</p>
      <p>{t('chainText')}</p>
      <p>{t('realText')}</p>
      <div className={styles.lessons}>
        <Link href="/ai-ds/nn/backpropagation" onClick={() => analytics.current?.lessonClick('ai-ds')}>{t('aiLesson')} <span aria-hidden="true">→</span></Link>
        <Link href="/gradient-descent">{t('gdLab')} <span aria-hidden="true">→</span></Link>
      </div>
    </div>
  </section>;
}
