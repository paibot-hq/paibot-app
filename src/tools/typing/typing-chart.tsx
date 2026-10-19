import { useTranslations } from "use-intl";
import styles from "./typing.module.css";
import { BIN, BINS, MAX_SCORE, binOf, type Distribution } from "./game";

const W = 600, H = 210, LEFT = 10, RIGHT = 10, TOP = 34, BOTTOM = 30;
const PLOT_W = W - LEFT - RIGHT, PLOT_H = H - TOP - BOTTOM;
const STEP = PLOT_W / BINS;
const GAP = 2;
const rangeOf = (bin: number) => (bin === BINS - 1 ? `${MAX_SCORE}` : `${bin * BIN}–${bin * BIN + BIN - 1}`);

// Everyone's scores, a bar for every 20 points, with the player's own (`mine`) marked. One series, so no legend: the
// heading names it. Each bar says its range and count on hover, and the numbers are in a table under the chart.
export default function TypingChart({ distribution, mine }: { distribution: Distribution; mine: number | null }) {
  const t = useTranslations("App.typing");
  const most = Math.max(1, ...distribution.counts);
  const mineBin = mine === null ? -1 : binOf(mine);
  const x = (bin: number) => LEFT + bin * STEP;
  return (
    <figure className={styles.chart} data-typing="chart">
      <figcaption className={styles.chartTitle}>{t("chartTitle", { total: distribution.total })}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("chartLabel", { total: distribution.total })}>
        <line className={styles.axis} x1={LEFT} x2={W - RIGHT} y1={TOP + PLOT_H} y2={TOP + PLOT_H} />
        {distribution.counts.map((n, bin) => {
          const h = n ? Math.max(3, (n / most) * PLOT_H) : 0;
          const bx = x(bin) + GAP / 2, bw = STEP - GAP, r = Math.min(3, bw / 2, h);
          return (
            <g key={bin} className={styles.barGroup}>
              <rect className={styles.hit} x={x(bin)} y={TOP} width={STEP} height={PLOT_H}><title>{t("barTitle", { range: rangeOf(bin), count: n })}</title></rect>
              {h > 0 && <path className={bin === mineBin ? styles.barMine : styles.bar} d={`M${bx},${TOP + PLOT_H}V${TOP + PLOT_H - h + r}Q${bx},${TOP + PLOT_H - h} ${bx + r},${TOP + PLOT_H - h}H${bx + bw - r}Q${bx + bw},${TOP + PLOT_H - h} ${bx + bw},${TOP + PLOT_H - h + r}V${TOP + PLOT_H}Z`} />}
            </g>
          );
        })}
        {[0, 200, 400, 600, 800, 1000].map(v => <text key={v} className={styles.tick} x={Math.min(W - 18, Math.max(14, x(v / BIN) + (v === MAX_SCORE ? STEP / 2 : 0)))} y={H - 6} textAnchor="middle">{v}</text>)}
        {mine !== null && (
          <g className={styles.you}>
            <line x1={x(mineBin) + STEP / 2} x2={x(mineBin) + STEP / 2} y1={TOP - 6} y2={TOP + PLOT_H} />
            <text x={Math.min(W - 70, Math.max(70, x(mineBin) + STEP / 2))} y={TOP - 12} textAnchor="middle">{t("you", { score: mine })}</text>
          </g>
        )}
      </svg>
      <details className={styles.table}>
        <summary>{t("tableView")}</summary>
        <table>
          <thead><tr><th scope="col">{t("tableRange")}</th><th scope="col">{t("tableCount")}</th></tr></thead>
          <tbody>{distribution.counts.map((n, bin) => n > 0 && <tr key={bin} data-mine={bin === mineBin || undefined}><td>{rangeOf(bin)}</td><td>{n}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}
