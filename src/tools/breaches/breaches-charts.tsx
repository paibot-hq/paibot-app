"use client";

import { compact, decades, KINDS, monthly, niceTicks, records, type Kind, type Month, type Point, type StatItem } from "./breaches-stats";

import styles from "./breaches-charts.module.css";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "use-intl";

const KIND_KEYS = { leak: "typeLeak", ransomware: "typeRansomware", outage: "typeOutage", fraud: "typeFraud", other: "typeOther" } as const;
const GAP = 2; // the surface-coloured gap between stacked segments

// A column with only its top corners rounded, so that it grows from the baseline.
function topRounded(x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + radius}Q${x},${y} ${x + radius},${y}H${x + w - radius}Q${x + w},${y} ${x + w},${y + radius}V${y + h}Z`;
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(Math.max(280, Math.round(el.getBoundingClientRect().width)));
    const observer = new ResizeObserver(entries => setWidth(Math.max(280, Math.round(entries[0].contentRect.width))));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

type Tip = { x: number; y: number; title: string; total?: string; rows: { key?: Kind; label: string; value?: string }[] };

function Tooltip({ tip, width }: { tip: Tip; width: number }) {
  const left = Math.min(Math.max(tip.x, 90), width - 90);
  return (
    <div className={styles.tip} style={{ left, top: tip.y }} role="status" data-chart="tip">
      <div className={styles.tipHead}><strong>{tip.title}</strong>{tip.total && <strong>{tip.total}</strong>}</div>
      {tip.rows.map(row => (
        <div key={row.label} className={styles.tipRow}>
          {row.key && <span className={styles.key} data-kind={row.key} aria-hidden="true" />}
          <span lang="ja">{row.label}</span>
          {row.value && <strong>{row.value}</strong>}
        </div>
      ))}
    </div>
  );
}

function monthLabel(month: Month, locale: string) {
  return locale === "en"
    ? new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(month.year, month.month - 1, 1)))
    : `${month.year}年${month.month}月`;
}

function MonthlyChart({ months, width }: { months: Month[]; width: number }) {
  const t = useTranslations("App");
  const locale = useLocale();
  const [active, setActive] = useState<number | null>(null);
  const margin = { top: 10, right: 8, bottom: 24, left: 30 };
  const height = 230;
  const innerW = width - margin.left - margin.right, innerH = height - margin.top - margin.bottom;
  const top = Math.max(1, ...months.map(m => m.total));
  const ticks = niceTicks(top, 5);
  const yMax = ticks[ticks.length - 1];
  const y = (value: number) => margin.top + innerH - (value / yMax) * innerH;
  const band = innerW / Math.max(1, months.length);
  const barW = Math.min(band * 0.64, 44);
  const every = band < 34 ? 2 : 1;
  const shortMonth = (m: Month) => (locale === "en" ? new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(m.year, m.month - 1, 1))) : `${m.month}月`);

  const tip = (index: number): Tip => {
    const m = months[index];
    return {
      x: margin.left + band * index + band / 2,
      y: Math.max(0, y(m.total) - 20),
      title: monthLabel(m, locale),
      total: t("breaches.incidents", { count: m.total }),
      rows: KINDS.filter(k => m.byType[k] > 0).map(k => ({ key: k, label: t(`breaches.${KIND_KEYS[k]}`), value: String(m.byType[k]) })),
    };
  };

  return (
    <div className={styles.plot}>
      <svg width={width} height={height} role="img" aria-label={t("breaches.chartMonthly")} data-chart="monthly">
        {ticks.map(value => (
          <g key={value}>
            <line x1={margin.left} x2={width - margin.right} y1={y(value)} y2={y(value)} className={value === 0 ? styles.axis : styles.grid} />
            <text x={margin.left - 6} y={y(value)} dy="0.32em" textAnchor="end" className={styles.tick}>{value}</text>
          </g>
        ))}
        {months.map((m, index) => {
          const x = margin.left + band * index + (band - barW) / 2;
          let acc = 0;
          const present = KINDS.filter(k => m.byType[k] > 0);
          return (
            <g key={m.key} data-month={m.key} data-active={active === index || undefined}>
              {present.map((k, i) => {
                const h = (m.byType[k] / yMax) * innerH;
                const yTop = y(acc + m.byType[k]);
                acc += m.byType[k];
                const isTop = i === present.length - 1;
                const drawH = Math.max(1, h - (i === 0 ? 0 : GAP));
                return isTop
                  ? <path key={k} d={topRounded(x, yTop, barW, drawH, 4)} className={styles.seg} data-kind={k} />
                  : <rect key={k} x={x} y={yTop + (i === 0 ? 0 : GAP)} width={barW} height={drawH} className={styles.seg} data-kind={k} />;
              })}
              {m.total > 0 && <text x={x + barW / 2} y={y(m.total) - 4} textAnchor="middle" className={styles.value}>{m.total}</text>}
              {index % every === 0 && <text x={margin.left + band * index + band / 2} y={height - 6} textAnchor="middle" className={styles.tick}>{shortMonth(m)}</text>}
              <rect
                x={margin.left + band * index} y={margin.top} width={band} height={innerH} className={styles.hit} tabIndex={0}
                aria-label={`${monthLabel(m, locale)}: ${t("breaches.incidents", { count: m.total })}`}
                onPointerEnter={() => setActive(index)} onPointerMove={() => setActive(index)} onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(index)} onBlur={() => setActive(null)} data-chart="column"
              />
            </g>
          );
        })}
      </svg>
      {active !== null && <Tooltip tip={tip(active)} width={width} />}
    </div>
  );
}

function RecordsChart({ points, from, to, width }: { points: Point[]; from: number; to: number; width: number }) {
  const t = useTranslations("App");
  const locale = useLocale();
  const [active, setActive] = useState<string | null>(null);
  const margin = { top: 14, right: 12, bottom: 24, left: 44 };
  const height = 260;
  const innerW = width - margin.left - margin.right, innerH = height - margin.top - margin.bottom;
  const low = 10, high = 1e8;
  const y = (count: number) => margin.top + innerH - ((Math.log10(Math.max(count, low)) - Math.log10(low)) / (Math.log10(high) - Math.log10(low))) * innerH;
  const x = (position: number) => margin.left + ((position - from) / (to - from)) * innerW;
  // The biggest are named on the chart (one on a phone). A name goes to the left of its dot when another named dot is just to its right, so that
  // two names never sit on each other.
  const named = [...points].sort((a, b) => b.count - a.count).slice(0, width < 560 ? 1 : 3).sort((a, b) => a.t - b.t);
  const labelled = new Set(named.map(p => p.id));
  const toTheLeft = new Set(named.filter((p, i) => named[i + 1] && x(named[i + 1].t) - x(p.t) < 110).map(p => p.id));
  const monthTicks = Array.from({ length: Math.round(to - from) }, (_, i) => from + i);
  const every = innerW / monthTicks.length < 34 ? 2 : 1;
  const shortName = (name: string) => name.split(/[()（）・\s]/).find(part => part.length >= 2) ?? name;

  return (
    <div className={styles.plot}>
      <svg width={width} height={height} role="img" aria-label={t("breaches.chartRecords")} data-chart="records">
        {decades(low, high).map(value => (
          <g key={value}>
            <line x1={margin.left} x2={width - margin.right} y1={y(value)} y2={y(value)} className={value === low ? styles.axis : styles.grid} />
            <text x={margin.left - 6} y={y(value)} dy="0.32em" textAnchor="end" className={styles.tick}>{compact(value, locale)}</text>
          </g>
        ))}
        {monthTicks.map((position, index) => index % every === 0 && (
          <text key={position} x={x(position + 0.5)} y={height - 6} textAnchor="middle" className={styles.tick}>
            {locale === "en" ? new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2026, (position % 12), 1))) : `${(position % 12) + 1}月`}
          </text>
        ))}
        {points.map(p => {
          const anchorEnd = x(p.t) > width * 0.7 || toTheLeft.has(p.id);
          return (
            <g key={p.id} data-point={p.id}>
              <circle cx={x(p.t)} cy={y(p.count)} r={active === p.id ? 7 : 5} className={styles.dot} />
              {labelled.has(p.id) && (
                <text x={x(p.t) + (anchorEnd ? -9 : 9)} y={y(p.count)} dy="0.32em" textAnchor={anchorEnd ? "end" : "start"} className={styles.label} lang="ja">{shortName(p.name)}</text>
              )}
              <circle
                cx={x(p.t)} cy={y(p.count)} r={10} className={styles.hit} tabIndex={0} aria-label={`${p.name}: ${p.countNote}`}
                onPointerEnter={() => setActive(p.id)} onPointerLeave={() => setActive(null)} onFocus={() => setActive(p.id)} onBlur={() => setActive(null)} data-chart="point"
              />
            </g>
          );
        })}
      </svg>
      {active && (() => {
        const p = points.find(point => point.id === active)!;
        return <Tooltip width={width} tip={{ x: x(p.t), y: Math.max(0, y(p.count) - 12), title: p.name, rows: [{ label: p.date }, { label: p.countNote }] }} />;
      })()}
    </div>
  );
}

// `items` are the ones shown (after the filters); `first` is the earliest date of the whole list and `until` the day it was last checked, so the axis stays.
export default function BreachesCharts({ items, first, until }: { items: StatItem[]; first: string; until: string }) {
  const t = useTranslations("App");
  const [ref, width] = useWidth();
  const months = useMemo(() => monthly(items, until, first), [items, until, first]);
  const points = useMemo(() => records(items), [items]);
  const start = months.length ? months[0].year * 12 + months[0].month - 1 : 0;
  const end = start + months.length;

  return (
    <section className={styles.charts} ref={ref} aria-label={t("breaches.chartsTitle")} data-chart="root">
      <h2 className={styles.title}>{t("breaches.chartMonthly")}</h2>
      <div className={styles.legend}>
        {KINDS.map((k: Kind) => (
          <span key={k} className={styles.legendItem}><span className={styles.key} data-kind={k} aria-hidden="true" />{t(`breaches.${KIND_KEYS[k]}`)}</span>
        ))}
      </div>
      <MonthlyChart months={months} width={width} />
      <h2 className={styles.title}>{t("breaches.chartRecords")}</h2>
      <p className={styles.help}>{t("breaches.chartRecordsHelp")}</p>
      <RecordsChart points={points} from={start} to={end} width={width} />
      <p className={styles.help}>{t("breaches.chartNote")}</p>
      <details className={styles.table}>
        <summary>{t("breaches.tableView")}</summary>
        <table>
          <thead>
            <tr><th scope="col">{t("breaches.month")}</th>{KINDS.map(k => <th key={k} scope="col">{t(`breaches.${KIND_KEYS[k]}`)}</th>)}<th scope="col">{t("breaches.total")}</th></tr>
          </thead>
          <tbody>
            {months.map(m => (
              <tr key={m.key}><th scope="row">{m.key}</th>{KINDS.map(k => <td key={k}>{m.byType[k]}</td>)}<td>{m.total}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
