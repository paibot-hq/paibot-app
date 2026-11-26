import type { ReactNode } from 'react';
import styles from '../item-demos.module.css';

export function DemoCard({
  title,
  ariaLabel,
  children,
}: {
  title: string;
  ariaLabel?: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.card} aria-label={ariaLabel ?? title}>
      <div className={styles.head}>
        <span className={styles.badge}>動かして体感</span>
        <h3>{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function DemoSlider({
  label,
  valueText,
  min,
  max,
  step = 1,
  value,
  onChange,
}: {
  label: string;
  valueText: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className={styles.sliderLabel}>
      <span>{label}: <strong>{valueText}</strong></span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export function DemoBar({ label, pct, detail }: { label: string; pct: number; detail?: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className={styles.tokenRow}>
      <div className={styles.tokenHead}>
        <strong>{label}</strong>
        {detail && <span>{detail}</span>}
      </div>
      <div className={styles.barWrap}>
        <div className={styles.barFill} style={{ width: `${clamped}%` }} />
        <span className={styles.barText}>{Math.round(clamped)}%</span>
      </div>
    </div>
  );
}

export function DemoMetrics({ items }: { items: { label: string; value: string; accent?: boolean }[] }) {
  return (
    <div className={styles.flowRow}>
      {items.map(item => (
        <div key={item.label} className={styles.flowBox} data-grad={item.accent || undefined}>
          <small>{item.label}</small>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

export { styles as demoStyles };
