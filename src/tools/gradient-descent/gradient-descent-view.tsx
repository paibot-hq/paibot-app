import { useEffect, useId, useRef, useState } from 'react';
import { useFormatter, useTranslations } from 'use-intl';
import { MathTex } from '../../components/math-tex';
import { Link } from '../../i18n/navigation';
import { createLabAnalytics, type LabSettingChange } from '../../lib/analytics';
import { GRAPH_LIMIT, INITIAL_X, LEARNING_RATE, STEP_LIMIT, nextPoint, pointAt, stopReason, type DescentPoint } from './gradient-descent';
import styles from './gradient-descent-view.module.css';

const PRESETS = [
  { rate: 0.05, label: 'slow' },
  { rate: 0.25, label: 'steady' },
  { rate: 0.5, label: 'oneStep' },
  { rate: 0.75, label: 'crossing' },
  { rate: 1, label: 'cycle' },
  { rate: 1.1, label: 'diverging' },
] as const;

const plot = { left: 34, right: 342, top: 30, bottom: 200 };
const maxValue = GRAPH_LIMIT ** 2;
const plotX = (x: number) => plot.left + (x / GRAPH_LIMIT + 1) * (plot.right - plot.left) / 2;
const plotY = (value: number) => plot.bottom - value / maxValue * (plot.bottom - plot.top);
const ticksX = [-6, -4, -2, 0, 2, 4, 6];
const ticksY = [9, 18, 27, 36];

function DescentGraph({ history }: { history: readonly DescentPoint[] }) {
  const t = useTranslations('App.gradientDescent');
  const clip = useId();
  const current = history[history.length - 1];
  return <figure className={styles.figure}>
    <svg viewBox="0 0 360 238" className={styles.graph} role="img" aria-label={t('graphLabel')}>
      <defs><clipPath id={clip}>
        <rect x={plot.left - 1} y={plot.top - 1} width={plot.right - plot.left + 2} height={plot.bottom - plot.top + 2} />
      </clipPath></defs>
      <g className={styles.gridLines}>
        {ticksX.map(x => <line key={x} x1={plotX(x)} x2={plotX(x)} y1={plot.top} y2={plot.bottom} />)}
        {ticksY.map(value => <line key={value} x1={plot.left} x2={plot.right} y1={plotY(value)} y2={plotY(value)} />)}
      </g>
      <path className={styles.axis} d={`M${plot.left} ${plot.bottom}H${plot.right} M${plotX(0)} ${plot.bottom}V${plot.top}`} />
      <g className={styles.ticks}>
        {ticksX.map(x => <text key={x} x={plotX(x)} y={plot.bottom + 16} textAnchor="middle">{String(x).replace('-', '−')}</text>)}
        {ticksY.map(value => <text key={value} x={plot.left - 6} y={plotY(value) + 4} textAnchor="end">{value}</text>)}
        <text x={plot.left} y={plot.top - 10} textAnchor="end">f(x)</text>
        <text x={plot.right} y={plot.bottom + 31} textAnchor="end">x</text>
      </g>
      {/* With this control point the quadratic Bézier traces exactly f(x) = x². */}
      <path className={styles.curve} d={`M${plot.left} ${plot.top} Q${plotX(0)} ${plotY(-maxValue)} ${plot.right} ${plot.top}`} />
      <g clipPath={`url(#${clip})`}>
        <polyline className={styles.trail} points={history.map(point => `${plotX(point.x)},${plotY(point.value)}`).join(' ')} />
      </g>
      {history.slice(0, -1).map((point, index) =>
        <circle key={index} className={styles.previous} cx={plotX(point.x)} cy={plotY(point.value)} r="3" />)}
      {Math.abs(current.x) <= GRAPH_LIMIT &&
        <circle className={styles.current} cx={plotX(current.x)} cy={plotY(current.value)} r="5.5" />}
    </svg>
    <figcaption className={styles.legend}>
      <span><i className={styles.curveKey} aria-hidden="true" />f(x) = x²</span>
      <span><i className={styles.trailKey} aria-hidden="true" />{t('path')}</span>
      <span><i className={styles.pointKey} aria-hidden="true" />{t('current')}</span>
    </figcaption>
  </figure>;
}

export default function GradientDescent() {
  const t = useTranslations('App.gradientDescent');
  const format = useFormatter();
  const [initial, setInitial] = useState(INITIAL_X.defaultValue);
  const [rate, setRate] = useState(LEARNING_RATE.defaultValue);
  const [history, setHistory] = useState(() => [pointAt(INITIAL_X.defaultValue)]);
  const [playing, setPlaying] = useState(false);
  const analytics = useRef<ReturnType<typeof createLabAnalytics> | null>(null);
  analytics.current ??= createLabAnalytics('gradient-descent');
  const steps = history.length - 1;
  const current = history[steps];
  const finished = stopReason(current, steps);
  const running = playing && !finished;

  useEffect(() => {
    analytics.current?.view();
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => {
      setHistory(points => [...points, nextPoint(points[points.length - 1], rate)]);
    }, 420);
    return () => window.clearTimeout(timer);
  }, [current, rate, running]);

  function reset(start = initial) {
    setPlaying(false);
    setHistory([pointAt(start)]);
  }

  function changeRate(value: number, source: Extract<LabSettingChange, 'rate' | 'preset'>) {
    analytics.current?.changeSetting(source);
    setRate(value);
    reset();
  }

  function number(value: number) {
    return format.number(value, { maximumSignificantDigits: 5, notation: value !== 0 && Math.abs(value) < 0.001 ? 'scientific' : 'standard' });
  }

  const status = finished ?? (running ? 'running' : steps === 0 ? 'ready' : 'paused');
  const change = steps ? current.x - history[steps - 1].x : null;

  return <section id="gradient-descent" className={styles.section} aria-label={t('title')}>
    <p className={styles.intro}>{t('intro')}</p>
    <div className={styles.experiment}>
      <DescentGraph history={history} />
      <div className={styles.controls}>
        <label className={styles.range}>
          <span>{t('initial')}</span><span className={styles.value} aria-hidden="true">{number(initial)}</span>
          <input type="range" min={INITIAL_X.min} max={INITIAL_X.max} step={INITIAL_X.step} value={initial}
            onChange={event => { const value = event.currentTarget.valueAsNumber; analytics.current?.changeSetting('initial'); setInitial(value); reset(value); }} />
        </label>
        <label className={styles.range}>
          <span>{t('rate')}</span><span className={styles.value} aria-hidden="true">{number(rate)}</span>
          <input type="range" min={LEARNING_RATE.min} max={LEARNING_RATE.max} step={LEARNING_RATE.step} value={rate}
            onChange={event => changeRate(event.currentTarget.valueAsNumber, 'rate')} />
        </label>
        <div className={styles.presets} role="group" aria-label={t('presets')}>
          {PRESETS.map(preset => <button key={preset.rate} type="button" aria-pressed={rate === preset.rate} onClick={() => changeRate(preset.rate, 'preset')}>
            <strong>{number(preset.rate)}</strong><span>{t(`examples.${preset.label}`)}</span>
          </button>)}
        </div>
        <div className={styles.actions}>
          <button type="button" data-primary disabled={Boolean(finished) || running} onClick={() => { analytics.current?.interact('step'); setHistory([...history, nextPoint(current, rate)]); }}>{t('step')}</button>
          <button type="button" disabled={Boolean(finished)} onClick={() => { if (!running) analytics.current?.interact('play'); setPlaying(!running); }}>{t(running ? 'pause' : 'play')}</button>
          <button type="button" onClick={() => reset()}>{t('reset')}</button>
        </div>
        <p className={styles.status} data-state={status} role="status">{t(`status.${status}`, { limit: STEP_LIMIT })}</p>
      </div>
      <dl className={styles.readouts} aria-label={t('readouts')}>
        <div><dt>{t('iteration')}</dt><dd>{number(steps)}</dd></div>
        <div><dt>{t('position')}</dt><dd>{number(current.x)}</dd></div>
        <div><dt>{t('loss')}</dt><dd>{number(current.value)}</dd></div>
        <div><dt>{t('slope')}</dt><dd>{number(current.slope)}</dd></div>
        <div><dt>{t('change')}</dt><dd>{change === null ? '—' : number(change)}</dd></div>
      </dl>
    </div>
    <div className={styles.explanation}>
      <h3>{t('ruleTitle')}</h3>
      <div className={styles.formula}><MathTex tex={String.raw`\begin{aligned}
        f'(x) &= 2x \\
        x_{k+1} &= x_k-\eta f'(x_k) \\
                &= (1-2\eta)x_k
      \end{aligned}`} block /></div>
      <p>{t('rule')}</p>
      <p>{t('compare')}</p>
      <p>{t('adam')}</p>
      <div className={styles.lessons}>
        <Link href="/math/derivative/tangent" onClick={() => analytics.current?.lessonClick('math')}>{t('mathLesson')} <span aria-hidden="true">→</span></Link>
        <Link href="/ai-ds/nn/optimizers" onClick={() => analytics.current?.lessonClick('ai-ds')}>{t('aiLesson')} <span aria-hidden="true">→</span></Link>
        <Link href="/approx" onClick={() => analytics.current?.lessonClick('approx')}>{t('comparison')} <span aria-hidden="true">→</span></Link>
      </div>
    </div>
  </section>;
}
