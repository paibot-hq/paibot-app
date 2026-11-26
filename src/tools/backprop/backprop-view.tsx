import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'use-intl';
import { MathTex } from '../../components/math-tex';
import { Link } from '../../i18n/navigation';
import { createLabAnalytics } from '../../lib/analytics';
import {
  INITIAL_WEIGHTS, NUDGE, TARGET, WEIGHT_IDS, X,
  fmt, forward, gradientOf, gradients, nudgedLoss, updated,
  type WeightId, type Weights,
} from './backprop';
import styles from './backprop-view.module.css';

// The lab is a film, not a control panel: one play button runs the whole
// story — compute an answer, measure the gap, send the blame backwards,
// nudge the weights — for six rounds, until the gap is all but closed.
export const CYCLES = 6;

// The weights at the start of each round: round c plays on SEQUENCE[c] and
// its update frame reveals SEQUENCE[c + 1]. Deterministic, so the unit tests
// pin every number the film shows.
const SEQUENCE: readonly Weights[] = (() => {
  const list = [INITIAL_WEIGHTS];
  for (let i = 0; i < CYCLES; i++) list.push(updated(list[i]));
  return list;
})();

// One round is seven frames: three forward (input, hidden, output), the
// measurement, two backward (output side, input side), and the update.
const FRAMES_PER_CYCLE = 7;
const TOTAL = CYCLES * FRAMES_PER_CYCLE;

const WEIGHT_LABEL: Record<WeightId, string> = { w1: 'w₁', w2: 'w₂', v1: 'v₁', v2: 'v₂' };
const GRAD_LABEL: Record<WeightId, string> = { w1: '∂L/∂w₁', w2: '∂L/∂w₂', v1: '∂L/∂v₁', v2: '∂L/∂v₂' };

// Node centres in the 360×252 viewBox.
const NX = { x: 42, y: 126 };
const NH1 = { x: 178, y: 62 };
const NH2 = { x: 178, y: 190 };
const NY = { x: 304, y: 126 };
const LOSS = { x: 304, y: 234 };
const R = 20;

// The gap meter's number line: y stays within ±3 and t within ±1.
const METER_MIN = -3;
const METER_MAX = 3;
const meterX = (value: number) => 16 + ((value - METER_MIN) / (METER_MAX - METER_MIN)) * 328;
const clampLabel = (x: number) => Math.min(290, Math.max(70, x));
// The loss bar is full at 0.6, a little above the initial 0.187.
const lossShare = (loss: number) => Math.min(1, loss / 0.6);

function Edge({ from, to, back, width, flowing }: {
  from: { x: number; y: number }; to: { x: number; y: number };
  back?: boolean; width?: number; flowing?: boolean;
}) {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const u = { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
  const name = back ? styles.edgeActive : flowing ? `${styles.edge} ${styles.flowing}` : styles.edge;
  return <line
    className={name} style={width ? { strokeWidth: width } : undefined}
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
  // -1: idle (everything visible, nothing started). 0..TOTAL-1: that frame.
  // TOTAL: the film has ended on the final weights.
  const [at, setAt] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [fast, setFast] = useState(false);
  const [weight, setWeight] = useState<WeightId>('w1');
  const analytics = useRef<ReturnType<typeof createLabAnalytics> | null>(null);
  analytics.current ??= createLabAnalytics('backprop');

  useEffect(() => {
    analytics.current?.view();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setAt(frame => frame + 1), fast ? 450 : 900);
    return () => window.clearInterval(timer);
  }, [playing, fast]);

  useEffect(() => {
    if (at >= TOTAL) setPlaying(false);
  }, [at]);

  const idle = at < 0;
  const done = at >= TOTAL;
  const cycle = idle ? 0 : Math.min(Math.floor(at / FRAMES_PER_CYCLE), CYCLES - 1);
  const frame = idle ? -1 : done ? FRAMES_PER_CYCLE : at % FRAMES_PER_CYCLE;

  // What the film shows right now: the update frame reveals the next weights.
  const weights = done || frame === 6 ? SEQUENCE[cycle + 1] : SEQUENCE[cycle];
  const f = forward(weights);
  const g = gradients(SEQUENCE[cycle]);
  const topGrad = Math.max(...WEIGHT_IDS.map(id => Math.abs(gradientOf(g, id))));
  const blameWidth = (id: WeightId) => 1.75 + 2.5 * (Math.abs(gradientOf(g, id)) / topGrad);

  const measuring = frame === 3;
  const backOut = frame === 4 || frame === 5;
  const backIn = frame === 5;
  // Forward reveal: frame 0 shows the input side, 1 the hidden units, 2 the rest.
  const hidden = (tick: number) => !idle && !done && frame < tick;
  const vis = (tick: number) => (hidden(tick) ? ` ${styles.waiting}` : '');
  const flowing = !idle && !done && frame <= 2;

  const narration = idle ? 'ready'
    : done ? 'done'
    : frame <= 2 ? (cycle === 0 ? 'forwardFirst' : 'forwardAgain')
    : frame === 3 ? 'measure'
    : frame <= 5 ? 'blame'
    : 'update';

  function start() {
    analytics.current?.interact('play');
    if (reducedMotion()) {
      stepOnce();
      return;
    }
    if (at >= TOTAL) setAt(0);
    else if (at < 0) setAt(0);
    setPlaying(true);
  }

  function pause() {
    analytics.current?.interact('step');
    setPlaying(false);
  }

  function stepOnce() {
    analytics.current?.interact('step');
    setPlaying(false);
    setAt(frameNow => (frameNow >= TOTAL ? 0 : frameNow + 1));
  }

  function restart() {
    analytics.current?.interact('step');
    setPlaying(false);
    setAt(-1);
  }

  function chooseWeight(id: WeightId) {
    analytics.current?.interact('step');
    setWeight(id);
  }

  // The weight edges print the current weight; while the blame flows they
  // print each weight's gradient instead.
  const edgeText = (id: WeightId) => {
    const shown = id === 'v1' || id === 'v2' ? backOut : backIn;
    return shown ? `${GRAD_LABEL[id]} = ${fmt(gradientOf(g, id))}` : `${WEIGHT_LABEL[id]} = ${fmt(weights[id], 2)}`;
  };

  // The static chain-rule check below the film always uses the initial
  // weights, so its numbers never move while the film plays.
  const initialLoss = forward(INITIAL_WEIGHTS).loss;
  const initialGrads = gradients(INITIAL_WEIGHTS);
  const grad = gradientOf(initialGrads, weight);

  return <section id="backprop" className={styles.section} aria-label={t('title')}>
    <p className={styles.intro}>{t('intro')}</p>
    <div className={styles.experiment}>
      <p className={styles.goal}>{t('goal')}</p>

      <div className={styles.panel} aria-label={t('stage')}>
        <div className={styles.meter} role="img" aria-label={t('meterLabel')}>
          <svg viewBox="0 0 360 58" className={styles.meterScale}>
            <line className={styles.meterAxis} x1={16} y1={36} x2={344} y2={36} />
            <rect className={measuring ? `${styles.meterGap} ${styles.pulsing}` : styles.meterGap}
              x={Math.min(meterX(f.y), meterX(TARGET))} y={32}
              width={Math.abs(meterX(f.y) - meterX(TARGET))} height={8} rx={2} />
            <g className={styles.meterTarget}>
              <line x1={meterX(TARGET)} y1={28} x2={meterX(TARGET)} y2={44} />
              <text x={clampLabel(meterX(TARGET))} y={56} textAnchor="middle">{t('meterT')} t = {fmt(TARGET, 2)}</text>
            </g>
            <g className={styles.meterAnswer}>
              <line x1={meterX(f.y)} y1={28} x2={meterX(f.y)} y2={44} />
              <text x={clampLabel(meterX(f.y))} y={18} textAnchor="middle">{t('meterY')} y = {fmt(f.y, 2)}</text>
            </g>
          </svg>
          <div className={styles.lossRow}>
            <span>{t('meterLoss')}</span>
            <span className={styles.lossTrack}>
              <span className={measuring ? `${styles.lossFill} ${styles.pulsing}` : styles.lossFill}
                style={{ width: `${lossShare(f.loss) * 100}%` }} />
            </span>
            <strong>{fmt(f.loss)}</strong>
          </div>
        </div>

        <p className={styles.narration} role="status">{t(`narration.${narration}`)}</p>

        <svg viewBox="0 0 360 252" className={styles.net} role="img" aria-label={t(backOut ? 'netBackward' : 'netForward')}>
          <defs>
            <marker id="backprop-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0L8 4L0 8z" className={styles.arrowHead} />
            </marker>
          </defs>
          <g className={hidden(0) ? styles.waiting : undefined}>
            <Edge from={NX} to={NH1} flowing={flowing} />
            <Edge from={NX} to={NH2} flowing={flowing} />
          </g>
          <g className={hidden(1) ? styles.waiting : undefined}>
            <Edge from={NH1} to={NY} flowing={flowing} />
            <Edge from={NH2} to={NY} flowing={flowing} />
          </g>
          <g className={hidden(2) ? styles.waiting : undefined}>
            <Edge from={NY} to={LOSS} flowing={flowing} />
          </g>

          {/* The blame flowing backwards: reversed red edges, thickness = share of the blame. */}
          {backOut && <>
            <Edge from={LOSS} to={NY} back width={2.5} />
            <Edge from={NY} to={NH1} back width={blameWidth('v1')} />
            <Edge from={NY} to={NH2} back width={blameWidth('v2')} />
          </>}
          {backIn && <>
            <Edge from={NH1} to={NX} back width={blameWidth('w1')} />
            <Edge from={NH2} to={NX} back width={blameWidth('w2')} />
          </>}

          <text className={styles.edgeLabel + (backIn ? ` ${styles.blameLabel}` : vis(0))} x={106} y={80} textAnchor="middle">{edgeText('w1')}</text>
          <text className={styles.edgeLabel + (backIn ? ` ${styles.blameLabel}` : vis(0))} x={106} y={180} textAnchor="middle">{edgeText('w2')}</text>
          <text className={styles.edgeLabel + (backOut ? ` ${styles.blameLabel}` : vis(1))} x={248} y={80} textAnchor="middle">{edgeText('v1')}</text>
          <text className={styles.edgeLabel + (backOut ? ` ${styles.blameLabel}` : vis(1))} x={248} y={180} textAnchor="middle">{edgeText('v2')}</text>

          <g className={styles.node + vis(0)}>
            <circle cx={NX.x} cy={NX.y} r={R} />
            <text x={NX.x} y={NX.y + 4} textAnchor="middle">x</text>
          </g>
          <text className={styles.value + vis(0)} x={NX.x} y={NX.y + 36} textAnchor="middle">{`x = ${fmt(X, 2)}`}</text>

          <g className={styles.node + vis(1)} data-active={backOut || undefined}>
            <circle cx={NH1.x} cy={NH1.y} r={R} />
            <text x={NH1.x} y={NH1.y + 4} textAnchor="middle">h₁</text>
          </g>
          <text className={styles.value + vis(1)} x={NH1.x} y={22} textAnchor="middle">{`a₁ = ${fmt(f.a1)}`}</text>
          <text className={styles.value + vis(1)} x={NH1.x} y={34} textAnchor="middle">{`h₁ = tanh(a₁) = ${fmt(f.h1)}`}</text>

          <g className={styles.node + vis(1)} data-active={backOut || undefined}>
            <circle cx={NH2.x} cy={NH2.y} r={R} />
            <text x={NH2.x} y={NH2.y + 4} textAnchor="middle">h₂</text>
          </g>
          <text className={styles.value + vis(1)} x={NH2.x} y={226} textAnchor="middle">{`a₂ = ${fmt(f.a2)}`}</text>
          <text className={styles.value + vis(1)} x={NH2.x} y={238} textAnchor="middle">{`h₂ = tanh(a₂) = ${fmt(f.h2)}`}</text>

          <g className={styles.node + vis(2)} data-active={backOut || undefined}>
            <circle cx={NY.x} cy={NY.y} r={R} />
            <text x={NY.x} y={NY.y + 4} textAnchor="middle">y</text>
          </g>
          <text className={backOut ? `${styles.value} ${styles.blameLabel}` : styles.value + vis(2)} x={NY.x} y={90} textAnchor="middle">
            {backOut ? `∂L/∂y = ${fmt(g.dy)}` : `y = ${fmt(f.y)}`}
          </text>

          <g className={styles.loss + vis(2) + (measuring ? ` ${styles.pulsing}` : '')}>
            <rect x={NY.x - 44} y={214} width={88} height={34} rx={8} />
            <text x={NY.x} y={228} textAnchor="middle">L = (y − t)²</text>
            <text x={NY.x} y={242} textAnchor="middle">= {fmt(f.loss)}</text>
          </g>
        </svg>

        <div className={styles.controls} role="group" aria-label={t('controls')}>
          {playing
            ? <button type="button" className={styles.play} onClick={pause}>{t('pause')}</button>
            : <button type="button" className={styles.play} onClick={start}>{t('play')}</button>}
          <button type="button" className={styles.control} onClick={stepOnce}>{t('stepOne')}</button>
          <button type="button" className={styles.control} aria-pressed={fast} onClick={() => setFast(current => !current)}>{t('fast')}</button>
          <button type="button" className={styles.control} onClick={restart}>{t('restart')}</button>
          {!idle && <span className={styles.iterations}>{t('cycleCount', { n: done ? CYCLES : cycle + 1, total: CYCLES })}</span>}
        </div>
      </div>
    </div>

    <div className={styles.explanation}>
      <details className={styles.detail}>
        <summary>{t('detailTitle')}</summary>
        <div className={styles.detailBody}>
          <div className={styles.weights} role="group" aria-label={t('selectWeight')}>
            {WEIGHT_IDS.map(id =>
              <button key={id} type="button" aria-pressed={id === weight} onClick={() => chooseWeight(id)}>
                {WEIGHT_LABEL[id]}
              </button>)}
          </div>
          <table className={styles.table} aria-label={t('nudgeTitle', { weight: WEIGHT_LABEL[weight] })}>
            <tbody>
              <tr><th scope="row">{t('analytic')} {GRAD_LABEL[weight]}</th><td>{fmt(grad)}</td></tr>
              <tr><th scope="row">{t('predicted', { weight: WEIGHT_LABEL[weight] })}</th><td>{fmt(grad * NUDGE, 5)}</td></tr>
              <tr><th scope="row">{t('actual', { weight: WEIGHT_LABEL[weight] })}</th><td>{fmt(nudgedLoss(INITIAL_WEIGHTS, weight) - initialLoss, 5)}</td></tr>
            </tbody>
          </table>
          <p className={styles.readout}>{t('nudgeNote')}</p>
        </div>
      </details>
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
