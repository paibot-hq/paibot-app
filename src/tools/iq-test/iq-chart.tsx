import { useTranslations } from "use-intl";
import styles from "./iq-test.module.css";
import { QUESTIONS, type Distribution } from "./matrix";

const W = 600, H = 210, LEFT = 10, RIGHT = 10, TOP = 34, BOTTOM = 30;
const PLOT_W = W - LEFT - RIGHT, PLOT_H = H - TOP - BOTTOM;
const BARS = QUESTIONS + 1;
const STEP = PLOT_W / BARS;
const GAP = 4;

// Everyone's scores, a bar for each number right (0 to 16), with the visitor's own (`mine`) marked. One series, so no
// legend: the heading names it. Each bar says its count on hover, and the numbers are in a table under the chart.
export default function IqChart({ distribution, mine }: { distribution: Distribution; mine: number | null }) {
  const t = useTranslations("App.iqTest");
  const most = Math.max(1, ...distribution.counts);
  const x = (score: number) => LEFT + score * STEP;
  return (
    <figure className={styles.chart} data-iq="chart">
      <figcaption className={styles.chartTitle}>{t("chartTitle", { total: distribution.total })}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("chartLabel", { total: distribution.total })}>
        <line className={styles.axis} x1={LEFT} x2={W - RIGHT} y1={TOP + PLOT_H} y2={TOP + PLOT_H} />
        {distribution.counts.map((n, score) => {
          const h = n ? Math.max(3, (n / most) * PLOT_H) : 0;
          const bx = x(score) + GAP / 2, bw = STEP - GAP, r = Math.min(4, bw / 2, h);
          return (
            <g key={score} className={styles.barGroup}>
              <rect className={styles.hit} x={x(score)} y={TOP} width={STEP} height={PLOT_H}><title>{t("barTitle", { score, count: n })}</title></rect>
              {h > 0 && <path className={score === mine ? styles.barMine : styles.bar} d={`M${bx},${TOP + PLOT_H}V${TOP + PLOT_H - h + r}Q${bx},${TOP + PLOT_H - h} ${bx + r},${TOP + PLOT_H - h}H${bx + bw - r}Q${bx + bw},${TOP + PLOT_H - h} ${bx + bw},${TOP + PLOT_H - h + r}V${TOP + PLOT_H}Z`} />}
            </g>
          );
        })}
        {[0, 4, 8, 12, 16].map(score => <text key={score} className={styles.tick} x={x(score) + STEP / 2} y={H - 6} textAnchor="middle">{score}</text>)}
        {mine !== null && (
          <g className={styles.you}>
            <line x1={x(mine) + STEP / 2} x2={x(mine) + STEP / 2} y1={TOP - 6} y2={TOP + PLOT_H} />
            <text x={Math.min(W - 80, Math.max(80, x(mine) + STEP / 2))} y={TOP - 12} textAnchor="middle">{t("you", { score: mine })}</text>
          </g>
        )}
      </svg>
      <details className={styles.table}>
        <summary>{t("tableView")}</summary>
        <table>
          <thead><tr><th scope="col">{t("tableScore")}</th><th scope="col">{t("tableCount")}</th></tr></thead>
          <tbody>{distribution.counts.map((n, score) => n > 0 && <tr key={score} data-mine={score === mine || undefined}><td>{t("scoreOf", { score, total: QUESTIONS })}</td><td>{n}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}
