import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'use-intl';
import { MathTex } from '../../components/math-tex';
import { Link } from '../../i18n/navigation';
import { createLabAnalytics } from '../../lib/analytics';
import {
  INITIAL_WEIGHTS, LEARNING_RATE, NUDGE, TARGET, WEIGHT_IDS, X,
  fmt, forward, gradientOf, gradients, nudgedLoss, updated,
  type WeightId, type Weights,
} from './backprop';
import styles from './backprop-view.module.css';

const STEPS = ['forward', 'backward', 'nudge', 'update'] as const;
type Step = (typeof STEPS)[number];

// Step 2 walks the chain rule in from the loss: first ∂L/∂y, then the
// output-side weights and the hidden units, then the input-side weights.
const STAGES = ['out', 'mid', 'in'] as const;

const WEIGHT_LABEL: Record<WeightId, string> = { w1: 'w₁', w2: 'w₂', v1: 'v₁', v2: 'v₂' };
const GRAD_LABEL: Record<WeightId, string> = { w1: '∂L/∂w₁', w2: '∂L/∂w₂', v1: '∂L/∂v₁', v2: '∂L/∂v₂' };

// Node centres in the 360×252 viewBox.
const NX = { x: 42, y: 126 };
const NH1 = { x: 178, y: 62 };
const NH2 = { x: 178, y: 190 };
const NY = { x: 304, y: 126 };
const R = 20;

// The order the forward animation lights the graph up in: the input, the
// input-side edges, the hidden units, the output-side edges, then y and L.
const FORWARD_PHASES = 5;

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

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function BackpropView() {
  const t = useTranslations('App.backprop');
  const [step, setStep] = useState<Step>('forward');
  const [stage, setStage] = useState(0);
  const [weight, setWeight] = useState<WeightId>('w1');
  const [weights, setWeights] = useState<Weights>(INITIAL_WEIGHTS);
  const [x, setX] = useState(X);
  const [target, setTarget] = useState(TARGET);
  const [rate, setRate] = useState(LEARNING_RATE);
  const [iterations, setIterations] = useState(0);
  // null: the whole graph is shown; 0..4: the forward animation is at that phase.
  const [phase, setPhase] = useState<number | null>(null);
  const timer = useRef(0);
  const analytics = useRef<ReturnType<typeof createLabAnalytics> | null>(null);
  analytics.current ??= createLabAnalytics('backprop');

  useEffect(() => {
    analytics.current?.view();
    return () => window.clearInterval(timer.current);
  }, []);

  const f = forward(weights, x, target);
  const g = gradients(weights, x, target);
  const next = updated(weights, rate, x, target);
  const nextLoss = forward(next, x, target).loss;

  function stopPlaying() {
    window.clearInterval(timer.current);
    setPhase(null);
  }

  function chooseStep(nextStep: Step) {
    analytics.current?.interact('step');
    stopPlaying();
    setStep(nextStep);
    setStage(0);
  }

  function chooseStage(index: number) {
    analytics.current?.interact('step');
    stopPlaying();
    setStage(index);
  }

  function chooseWeight(id: WeightId) {
    analytics.current?.interact('step');
    setWeight(id);
  }

  // Step 1's play: light the graph up in computation order.
  function playForward() {
    analytics.current?.interact('play');
    window.clearInterval(timer.current);
    if (reducedMotion()) return;
    let at = 0;
    setPhase(0);
    timer.current = window.setInterval(() => {
      at += 1;
      if (at >= FORWARD_PHASES) stopPlaying();
      else setPhase(at);
    }, 500);
  }

  // Step 2's play: walk the three chain-rule stages from the loss inwards.
  function playBackward() {
    analytics.current?.interact('play');
    window.clearInterval(timer.current);
    if (reducedMotion()) {
      setStage(2);
      return;
    }
    let at = 0;
    setStage(0);
    timer.current = window.setInterval(() => {
      at += 1;
      setStage(at);
      if (at >= 2) window.clearInterval(timer.current);
    }, 700);
  }

  function applyUpdate() {
    analytics.current?.interact('play');
    setWeights(next);
    setIterations(count => count + 1);
  }

  function changeParam(kind: 'initial' | 'rate', apply: () => void) {
    analytics.current?.changeSetting(kind);
    stopPlaying();
    apply();
  }

  function reset() {
    analytics.current?.changeSetting('initial');
    stopPlaying();
    setWeights(INITIAL_WEIGHTS);
    setX(X);
    setTarget(TARGET);
    setRate(LEARNING_RATE);
    setIterations(0);
  }

  const backward = step === 'backward';
  const showMid = backward && stage >= 1;
  const showIn = backward && stage >= 2;
  const grad = gradientOf(g, weight);
  const predicted = grad * NUDGE;
  const actual = nudgedLoss(weights, weight, NUDGE, x, target) - f.loss;
  const lossDown = nextLoss < f.loss;

  // Which forward-animation phase reveals each part of the graph.
  const hidden = (tick: number) => !backward && phase !== null && phase < tick;
  const vis = (tick: number) => (hidden(tick) ? ` ${styles.waiting}` : '');
  const groupVis = (tick: number) => (hidden(tick) ? styles.waiting : undefined);

  // What each edge prints: the weight on steps 1/3/4, the gradient so far on step 2.
  const edgeText = (id: WeightId) => {
    if (!backward) return `${WEIGHT_LABEL[id]} = ${fmt(weights[id], 2)}`;
    const shown = id === 'v1' || id === 'v2' ? showMid : showIn;
    return shown ? `${GRAD_LABEL[id]} = ${fmt(gradientOf(g, id))}` : WEIGHT_LABEL[id];
  };

  const slider = (label: string, value: number, min: number, max: number, onChange: (next: number) => void, kind: 'initial' | 'rate' = 'initial') =>
    <label className={styles.param}>
      <span>{label}</span>
      <input type="range" min={min} max={max} step={0.05} value={value}
        onChange={event => changeParam(kind, () => onChange(Number(event.target.value)))} />
      <output>{fmt(value, 2)}</output>
    </label>;

  return <section id="backprop" className={styles.section} aria-label={t('title')}>
    <p className={styles.intro}>{t('intro')}</p>
    <div className={styles.experiment}>
      <div className={styles.steps} role="group" aria-label={t('stepsLabel')}>
        {STEPS.map((candidate, index) =>
          <button key={candidate} type="button" aria-pressed={candidate === step} onClick={() => chooseStep(candidate)}>
            <strong>{index + 1}</strong><span>{t(`steps.${candidate}`)}</span>
          </button>)}
      </div>

      <details className={styles.params}>
        <summary>{t('paramsLabel')}</summary>
        <div className={styles.paramGrid}>
          {slider(t('inputLabel'), x, -1.5, 1.5, setX)}
          {slider(t('targetLabel'), target, -1, 1, setTarget)}
          {slider(t('rateLabel'), rate, 0, 1.5, setRate, 'rate')}
          {WEIGHT_IDS.map(id =>
            <label key={id} className={styles.param}>
              <span>{WEIGHT_LABEL[id]}</span>
              <input type="range" min={-1.5} max={1.5} step={0.05} value={weights[id]}
                onChange={event => changeParam('initial', () => setWeights({ ...weights, [id]: Number(event.target.value) }))} />
              <output>{fmt(weights[id], 2)}</output>
            </label>)}
        </div>
        <button type="button" className={styles.reset} onClick={reset}>{t('resetParams')}</button>
      </details>

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
              <g className={groupVis(1)}>
                <Edge from={NX} to={NH1} />
                <Edge from={NX} to={NH2} />
              </g>
              <g className={groupVis(3)}>
                <Edge from={NH1} to={NY} />
                <Edge from={NH2} to={NY} />
              </g>
              <g className={groupVis(4)}>
                <Edge from={NY} to={{ x: NY.x, y: 234 }} />
              </g>
            </>}

          <text className={styles.edgeLabel + vis(1)} x={106} y={80} textAnchor="middle">{edgeText('w1')}</text>
          <text className={styles.edgeLabel + vis(1)} x={106} y={180} textAnchor="middle">{edgeText('w2')}</text>
          <text className={styles.edgeLabel + vis(3)} x={248} y={80} textAnchor="middle">{edgeText('v1')}</text>
          <text className={styles.edgeLabel + vis(3)} x={248} y={180} textAnchor="middle">{edgeText('v2')}</text>

          <g className={styles.node + vis(0)}>
            <circle cx={NX.x} cy={NX.y} r={R} />
            <text x={NX.x} y={NX.y + 4} textAnchor="middle">x</text>
          </g>
          <text className={styles.value + vis(0)} x={NX.x} y={NX.y + 36} textAnchor="middle">{!backward && `x = ${fmt(x, 2)}`}</text>

          <g className={styles.node + vis(2)} data-active={showMid || undefined}>
            <circle cx={NH1.x} cy={NH1.y} r={R} />
            <text x={NH1.x} y={NH1.y + 4} textAnchor="middle">h₁</text>
          </g>
          <text className={styles.value + vis(2)} x={NH1.x} y={22} textAnchor="middle">
            {backward ? (showMid && `∂L/∂h₁ = ${fmt(g.dh1)}`) : `a₁ = ${fmt(f.a1)}`}
          </text>
          <text className={styles.value + vis(2)} x={NH1.x} y={34} textAnchor="middle">
            {backward ? (showMid && `∂L/∂a₁ = ${fmt(g.da1)}`) : `h₁ = tanh(a₁) = ${fmt(f.h1)}`}
          </text>

          <g className={styles.node + vis(2)} data-active={showMid || undefined}>
            <circle cx={NH2.x} cy={NH2.y} r={R} />
            <text x={NH2.x} y={NH2.y + 4} textAnchor="middle">h₂</text>
          </g>
          <text className={styles.value + vis(2)} x={NH2.x} y={226} textAnchor="middle">
            {backward ? (showMid && `∂L/∂h₂ = ${fmt(g.dh2)}`) : `a₂ = ${fmt(f.a2)}`}
          </text>
          <text className={styles.value + vis(2)} x={NH2.x} y={238} textAnchor="middle">
            {backward ? (showMid && `∂L/∂a₂ = ${fmt(g.da2)}`) : `h₂ = tanh(a₂) = ${fmt(f.h2)}`}
          </text>

          <g className={styles.node + vis(4)} data-active={backward || undefined}>
            <circle cx={NY.x} cy={NY.y} r={R} />
            <text x={NY.x} y={NY.y + 4} textAnchor="middle">y</text>
          </g>
          <text className={styles.value + vis(4)} x={NY.x} y={90} textAnchor="middle">
            {backward ? `∂L/∂y = ${fmt(g.dy)}` : `y = ${fmt(f.y)}`}
          </text>

          <g className={styles.loss + vis(4)}>
            <rect x={NY.x - 44} y={214} width={88} height={34} rx={8} />
            <text x={NY.x} y={228} textAnchor="middle">L = (y − t)²</text>
            <text x={NY.x} y={242} textAnchor="middle">{backward ? `t = ${fmt(target, 2)}` : `= ${fmt(f.loss)}`}</text>
          </g>
        </svg>

        {step === 'forward' && <>
          <button type="button" className={styles.play} onClick={playForward}>{t('play')}</button>
          <p className={styles.readout}>{t('forwardReadout', { y: fmt(f.y), loss: fmt(f.loss) })}</p>
        </>}

        {backward && <>
          <div className={styles.stageRow}>
            <button type="button" className={styles.play} onClick={playBackward}>{t('play')}</button>
            <div className={styles.stages} role="group" aria-label={t('stagesLabel')}>
              {STAGES.map((candidate, index) =>
                <button key={candidate} type="button" aria-pressed={stage === index} onClick={() => chooseStage(index)}>
                  {t(`stages.${candidate}`)}
                </button>)}
            </div>
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
            <MathTex tex={String.raw`w \leftarrow w - \eta\,\frac{\partial L}{\partial w},\qquad \eta = ${rate.toFixed(2)}`} block />
          </div>
          <table className={styles.table} aria-label={t('updateTitle')}>
            <thead><tr><th scope="col">{t('weightHeader')}</th><th scope="col">{t('beforeHeader')}</th><th scope="col">{t('gradHeader')}</th><th scope="col">{t('afterHeader')}</th></tr></thead>
            <tbody>
              {WEIGHT_IDS.map(id =>
                <tr key={id}>
                  <th scope="row">{WEIGHT_LABEL[id]}</th>
                  <td>{fmt(weights[id], 2)}</td>
                  <td>{fmt(gradientOf(g, id))}</td>
                  <td>{fmt(next[id])}</td>
                </tr>)}
            </tbody>
          </table>
          <p className={styles.lossDrop} role="status" data-up={!lossDown || undefined}>
            {t(lossDown ? 'lossDrop' : 'lossUp')} <strong>{fmt(f.loss, 4)} → {fmt(nextLoss, 4)}</strong>
          </p>
          <div className={styles.applyRow}>
            <button type="button" className={styles.apply} onClick={applyUpdate}>{t('apply')}</button>
            <span className={styles.iterations}>{t('iterationCount', { n: iterations })}</span>
          </div>
        </>}

        <p className={styles.hint}>{t(`hint.${step}`)}</p>
      </div>
    </div>

    <div className={styles.explanation}>
      <h3>{t('ruleTitle')}</h3>
      <div className={styles.formula}><MathTex tex={String.raw`\begin{aligned}
        a_i &= w_i\,x,\quad h_i = \tanh(a_i),\quad y = v_1 h_1 + v_2 h_2,\quad L = (y - t)^2 \\
        \frac{\partial L}{\partial w_1} &= \underbrace{2(y-t)}_{\partial L/\partial y}\cdot
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
