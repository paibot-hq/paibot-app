"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import styles from "./collector-view.module.css";
import { MAX_KINDS, chanceWithin, deviation, distribution, drawMany, emptyCollection, mean, normalize, quantile, trial, waits, type Collection, type Problem } from "./collector";

const PRESETS = [{ id: "dice", n: 6 }, { id: "zodiac", n: 12 }, { id: "prefectures", n: 47 }, { id: "cards", n: 100 }] as const;
// Above this many kinds the collection is shown as a bar, not a cell per kind.
const GRID_LIMIT = 200;
const TRIALS = 1000;

export default function CollectorView() {
  const t = useTranslations("App.collector");
  const locale = useLocale();
  const [kindsText, setKindsText] = useState("6");
  const [haveText, setHaveText] = useState("0");
  // Empty means "all of them", so the goal follows the number of kinds.
  const [goalText, setGoalText] = useState("");
  const [priceText, setPriceText] = useState("");
  const [drawsText, setDrawsText] = useState("20");
  const problem = normalize({ n: Number(kindsText), have: Number(haveText), goal: goalText.trim() === "" ? Number(kindsText) : Number(goalText) });
  const key = `${problem.n}/${problem.have}/${problem.goal}`;

  const answer = useMemo(() => {
    const cdf = distribution(problem);
    return { cdf, mean: mean(problem), deviation: deviation(problem), median: quantile(cdf, 0.5), p90: quantile(cdf, 0.9), p99: quantile(cdf, 0.99) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const number = (x: number, digits = 1) => new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(x);
  const percent = (p: number) => (p > 0 && p < 0.0001 ? "< 0.01%" : p < 1 && p > 0.9999 ? "> 99.99%" : new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 2 }).format(p));
  const price = Number(priceText);
  const draws = Math.max(0, Math.floor(Number(drawsText) || 0));
  const all = problem.goal === problem.n;

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <div className={styles.presets} role="group" aria-label={t("presets")}>
        {PRESETS.map(p => (
          <button key={p.id} type="button" className={styles.choice} aria-pressed={problem.n === p.n && problem.have === 0 && all} onClick={() => { setKindsText(String(p.n)); setHaveText("0"); setGoalText(""); }}>
            {t(`preset.${p.id}`, { n: p.n })}
          </button>
        ))}
      </div>
      <div className={styles.inputs}>
        <label className={styles.field}><span>{t("kinds")}</span><input type="number" inputMode="numeric" min={1} max={MAX_KINDS} value={kindsText} onChange={e => setKindsText(e.target.value)} data-collector="kinds" /></label>
        <label className={styles.field}><span>{t("have")}</span><input type="number" inputMode="numeric" min={0} max={problem.n - 1} value={haveText} onChange={e => setHaveText(e.target.value)} data-collector="have" /></label>
        <label className={styles.field}><span>{t("goal")}</span><input type="number" inputMode="numeric" min={1} max={problem.n} value={goalText} placeholder={t("goalAll", { n: problem.n })} onChange={e => setGoalText(e.target.value)} data-collector="goal" /></label>
        <label className={styles.field}><span>{t("price")}</span><input type="number" inputMode="decimal" min={0} value={priceText} placeholder={t("pricePlaceholder")} onChange={e => setPriceText(e.target.value)} data-collector="price" /></label>
      </div>
      <p className={styles.question} data-collector="question">
        {problem.have > 0 ? t("questionHave", { n: problem.n, have: problem.have, goal: problem.goal }) : all ? t("questionAll", { n: problem.n }) : t("questionSome", { n: problem.n, goal: problem.goal })}
      </p>

      <section className={styles.answer} aria-label={t("answer")}>
        <div className={styles.main}>
          <span className={styles.mainLabel}>{t("mean")}</span>
          <span className={styles.mainValue} data-collector="mean">{t("times", { n: number(answer.mean, 2) })}</span>
          {price > 0 && <span className={styles.cost} data-collector="cost">{t("cost", { cost: number(answer.mean * price, 0) })}</span>}
        </div>
        <dl className={styles.stats}>
          <div><dt>{t("median")}</dt><dd data-collector="median">{t("times", { n: number(answer.median) })}</dd></div>
          <div><dt>{t("p90")}</dt><dd data-collector="p90">{t("times", { n: number(answer.p90) })}</dd></div>
          <div><dt>{t("p99")}</dt><dd data-collector="p99">{t("times", { n: number(answer.p99) })}</dd></div>
          <div><dt>{t("deviation")}</dt><dd>{t("times", { n: number(answer.deviation, 2) })}</dd></div>
        </dl>
        {price > 0 && <p className={styles.costNote}>{t("costNote", { p90: number(answer.p90 * price, 0), p99: number(answer.p99 * price, 0) })}</p>}
      </section>

      <Chart cdf={answer.cdf} mean={answer.mean} median={answer.median} p90={answer.p90} label={t("chartLabel", { median: answer.median, p90: answer.p90 })} labels={{ x: t("chartX"), y: t("chartY"), mean: t("chartMean"), median: t("chartMedian"), p90: t("chartP90") }} />

      <label className={styles.within}>
        <span>{t("withinBefore")}</span>
        <input type="number" inputMode="numeric" min={0} value={drawsText} onChange={e => setDrawsText(e.target.value)} aria-label={t("withinLabel")} data-collector="draws" />
        <span>{t("withinAfter", { goal: problem.goal })}</span>
        <strong data-collector="within">{percent(chanceWithin(answer.cdf, draws))}</strong>
      </label>

      <Steps problem={problem} number={number} percent={percent} />
      <Simulator key={key} problem={problem} number={number} />

      <details className={styles.how}>
        <summary>{t("howTitle")}</summary>
        <p>{t("how1")}</p>
        <p>{t("how2")}</p>
        <p>{t("how3")}</p>
      </details>
    </ToolLayout>
  );
}

type Format = (x: number, digits?: number) => string;

// Why the mean is what it is: one geometric wait per new kind, longer and longer as the collection fills up.
function Steps({ problem, number, percent }: { problem: Problem; number: Format; percent: (p: number) => string }) {
  const t = useTranslations("App.collector");
  const rows = waits(problem);
  const shown = rows.length > 12 ? [...rows.slice(0, 5), null, ...rows.slice(-5)] : rows;
  const all = problem.have === 0 && problem.goal === problem.n;
  return (
    <details className={styles.steps}>
      <summary>{t("stepsTitle")}</summary>
      <p>{t("stepsIntro", { n: problem.n })}</p>
      <table className={styles.table} data-collector="steps">
        <thead><tr><th>{t("stepsKinds")}</th><th>{t("stepsChance")}</th><th>{t("stepsWait")}</th></tr></thead>
        <tbody>
          {shown.map((row, i) => row === null
            ? <tr key="gap"><td colSpan={3} className={styles.gap}>⋮</td></tr>
            : <tr key={i}><td>{t("stepsRow", { kinds: row.kinds, next: row.kinds + 1 })}</td><td>{`${problem.n - row.kinds}/${problem.n} (${percent(row.chance)})`}</td><td>{number(row.mean, 3)}</td></tr>)}
        </tbody>
      </table>
      <p className={styles.formula}>{all ? t("formulaAll", { n: problem.n, mean: number(mean(problem), 3) }) : t("formulaSum", { mean: number(mean(problem), 3) })}</p>
    </details>
  );
}

function Simulator({ problem, number }: { problem: Problem; number: Format }) {
  const t = useTranslations("App.collector");
  const [collection, setCollection] = useState<Collection>(() => emptyCollection(problem.n, problem.have));
  const [results, setResults] = useState<number[] | null>(null);
  const done = collection.kinds >= problem.goal;
  const run = (count: number) => setCollection(c => drawMany(c, count, Math.random, problem.goal));
  const many = () => {
    const out: number[] = [];
    for (let i = 0; i < TRIALS; i++) out.push(trial(problem, Math.random));
    setResults(out);
  };
  const duplicates = collection.draws - (collection.kinds - problem.have);
  const average = results ? results.reduce((a, b) => a + b, 0) / results.length : 0;
  return (
    <section className={styles.sim} aria-labelledby="collector-sim">
      <h2 id="collector-sim" className={styles.heading}>{t("simTitle")}</h2>
      <p className={styles.simNote}>{t("simIntro")}</p>
      <div className={styles.buttons}>
        <button type="button" className={styles.button} disabled={done} onClick={() => run(1)} data-collector="draw1">{t("draw1")}</button>
        <button type="button" className={styles.button} disabled={done} onClick={() => run(10)} data-collector="draw10">{t("draw10")}</button>
        <button type="button" className={styles.button} disabled={done} onClick={() => run(Number.MAX_SAFE_INTEGER)} data-collector="drawAll">{t("drawAll")}</button>
        <button type="button" className={styles.button} onClick={() => setCollection(emptyCollection(problem.n, problem.have))} data-collector="reset">{t("reset")}</button>
      </div>
      <p className={styles.status} data-collector="status" data-done={done || undefined}>
        {t("status", { draws: collection.draws, kinds: collection.kinds, n: problem.n, duplicates })}
        {done && <> <strong>{t("complete", { draws: collection.draws })}</strong></>}
      </p>
      {problem.n <= GRID_LIMIT ? (
        <ol className={styles.grid} aria-label={t("gridLabel")} data-collector="grid">
          {collection.counts.map((count, i) => (
            <li key={i} className={styles.cell} data-got={count > 0 || undefined} data-last={collection.last === i || undefined} title={t("cellTitle", { kind: i + 1, count })}>
              <span className={styles.cellNo}>{i + 1}</span>
              {count > 1 && <span className={styles.cellCount}>×{count}</span>}
            </li>
          ))}
        </ol>
      ) : (
        <div className={styles.progress} role="progressbar" aria-valuemin={0} aria-valuemax={problem.n} aria-valuenow={collection.kinds} aria-label={t("gridLabel")}>
          <span style={{ width: `${(collection.kinds / problem.n) * 100}%` }} />
        </div>
      )}
      <div className={styles.buttons}>
        <button type="button" className={styles.button} onClick={many} data-collector="trials">{t("trials", { n: number(TRIALS) })}</button>
      </div>
      {results && (
        <p className={styles.status} data-collector="trialResult">
          {t("trialResult", { n: number(TRIALS), average: number(average, 2), min: Math.min(...results), max: Math.max(...results), mean: number(mean(problem), 2) })}
        </p>
      )}
    </section>
  );
}

// The chance of being done after t draws, as a curve, with the mean, the median and the 90% point marked.
function Chart({ cdf, mean, median, p90, label, labels }: { cdf: number[]; mean: number; median: number; p90: number; label: string; labels: Record<"x" | "y" | "mean" | "median" | "p90", string> }) {
  const W = 600, H = 260, left = 44, right = 12, top = 14, bottom = 34;
  const maxT = Math.max(1, quantile(cdf, 0.999));
  const sx = (x: number) => left + (x / maxT) * (W - left - right);
  const sy = (y: number) => top + (1 - y) * (H - top - bottom);
  const stride = Math.max(1, Math.ceil(maxT / 300));
  let d = "";
  for (let x = 0; x <= maxT; x += stride) d += `${d ? "L" : "M"}${sx(x).toFixed(1)},${sy(cdf[Math.min(x, cdf.length - 1)]).toFixed(1)}`;
  d += `L${sx(maxT).toFixed(1)},${sy(cdf[Math.min(maxT, cdf.length - 1)]).toFixed(1)}`;
  const tickStep = niceStep(maxT / 5);
  const ticks = [];
  for (let x = 0; x <= maxT; x += tickStep) ticks.push(x);
  const marks = [{ x: mean, text: labels.mean, kind: "mean" }, { x: median, text: labels.median, kind: "median" }, { x: p90, text: labels.p90, kind: "p90" }];
  return (
    <figure className={styles.chart}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} data-collector="chart">
        {[0, 0.25, 0.5, 0.75, 1].map(y => (
          <g key={y}>
            <line className={styles.grid1} x1={left} x2={W - right} y1={sy(y)} y2={sy(y)} />
            <text className={styles.axisText} x={left - 6} y={sy(y) + 4} textAnchor="end">{`${y * 100}%`}</text>
          </g>
        ))}
        {ticks.map(x => <text key={x} className={styles.axisText} x={sx(x)} y={H - bottom + 16} textAnchor="middle">{x}</text>)}
        <text className={styles.axisText} x={W - right} y={H - 4} textAnchor="end">{labels.x}</text>
        <path className={styles.curve} d={d} />
        {marks.map((m, i) => (
          <g key={m.kind} data-mark={m.kind}>
            <line className={styles.mark} data-kind={m.kind} x1={sx(m.x)} x2={sx(m.x)} y1={top} y2={H - bottom} />
            <text className={styles.markText} data-kind={m.kind} x={sx(m.x) + 4} y={top + 12 + i * 14}>{m.text}</text>
          </g>
        ))}
      </svg>
      <figcaption className={styles.caption}>{labels.y}</figcaption>
    </figure>
  );
}

function niceStep(raw: number): number {
  const power = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  for (const m of [1, 2, 5, 10]) if (m * power >= raw) return Math.max(1, m * power);
  return 10 * power;
}
