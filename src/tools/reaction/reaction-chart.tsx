import { useTranslations } from "use-intl";
import styles from "./reaction-test.module.css";
import { BIN_MS, BINS, MIN_MS, TOP_MS, binOf, type Distribution } from "./reaction";

const W = 600, H = 220, LEFT = 10, RIGHT = 10, TOP = 34, BOTTOM = 30;
const PLOT_W = W - LEFT - RIGHT, PLOT_H = H - TOP - BOTTOM;
const STEP = PLOT_W / BINS;
// Bars a 2px surface gap apart, as the chart guide asks.
const GAP = 2;

const rangeOf = (bin: number) => (bin === BINS - 1 ? `${TOP_MS}+` : `${MIN_MS + bin * BIN_MS}–${MIN_MS + bin * BIN_MS + BIN_MS - 1}`);

// Everyone's round averages, 10 ms to a bar, with the visitor's own result (`mine`) marked. One series, so no legend: the
// heading names it. Each bar says its range and count on hover, and the same numbers are in a table under the chart.
export default function ReactionChart({ distribution, mine }: { distribution: Distribution; mine: number | null }) {
  const t = useTranslations("App.reaction");
  const most = Math.max(1, ...distribution.counts);
  const mineBin = mine === null ? -1 : binOf(mine);
  const x = (bin: number) => LEFT + bin * STEP;
  return (
    <figure className={styles.chart} data-reaction="chart">
      <figcaption className={styles.chartTitle}>{t("chartTitle", { total: distribution.total })}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("chartLabel", { total: distribution.total })}>
        <line className={styles.axis} x1={LEFT} x2={W - RIGHT} y1={TOP + PLOT_H} y2={TOP + PLOT_H} />
        {distribution.counts.map((n, bin) => {
          const h = n ? Math.max(3, (n / most) * PLOT_H) : 0;
          return (
            <g key={bin} className={styles.barGroup}>
              {/* The hit area is the whole column, taller and wider than the bar. */}
              <rect className={styles.hit} x={x(bin)} y={TOP} width={STEP} height={PLOT_H}><title>{t("barTitle", { range: rangeOf(bin), count: n })}</title></rect>
              {h > 0 && <path className={bin === mineBin ? styles.barMine : styles.bar} d={roundedTop(x(bin) + GAP / 2, TOP + PLOT_H - h, STEP - GAP, h, Math.min(2, (STEP - GAP) / 2))} />}
            </g>
          );
        })}
        {[100, 200, 300, 400, 500, 600].map(ms => (
          <text key={ms} className={styles.tick} x={Math.min(W - 22, x((ms - MIN_MS) / BIN_MS) + (ms === TOP_MS ? STEP / 2 : 0))} y={H - 6} textAnchor="middle">{ms === TOP_MS ? `${ms}+` : ms}</text>
        ))}
        {mine !== null && (
          <g className={styles.you}>
            <line x1={x(mineBin) + STEP / 2} x2={x(mineBin) + STEP / 2} y1={TOP - 6} y2={TOP + PLOT_H} />
            <text x={Math.min(W - 90, Math.max(90, x(mineBin) + STEP / 2))} y={TOP - 12} textAnchor="middle">{t("you", { ms: mine })}</text>
          </g>
        )}
      </svg>
      <details className={styles.table}>
        <summary>{t("tableView")}</summary>
        <table>
          <thead><tr><th scope="col">{t("tableRange")}</th><th scope="col">{t("tableCount")}</th></tr></thead>
          <tbody>
            {distribution.counts.map((n, bin) => n > 0 && <tr key={bin} data-mine={bin === mineBin || undefined}><td>{rangeOf(bin)} ms</td><td>{n}</td></tr>)}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

// A bar with its top corners rounded and its foot square on the baseline.
function roundedTop(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}
