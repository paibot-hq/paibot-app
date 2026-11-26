import { useState } from 'react';
import { DemoBar, DemoCard, DemoMetrics, DemoSlider, demoStyles as styles } from './shared';

function ValidationDemo() {
  const [n, setN] = useState(1000);
  const [k, setK] = useState(5);
  const valSize = Math.round(n / k);
  const trainSize = n - valSize;

  return (
    <DemoCard title="K 分割交差検証で K を変えると、学習データ量と計算回数はどう変わる？">
      <div className={styles.presets}>
        <button type="button" onClick={() => setK(5)}>5-fold（定番）</button>
        <button type="button" onClick={() => setK(10)}>10-fold</button>
        <button type="button" onClick={() => setK(2)}>2-fold</button>
      </div>
      <div className={styles.grid}>
        <DemoSlider label="全データ数 N" valueText={`${n} 件`} min={100} max={5000} step={100} value={n} onChange={setN} />
        <DemoSlider label="分割数 K" valueText={`${k} 分割`} min={2} max={20} value={k} onChange={setK} />
      </div>
      <DemoMetrics items={[
        { label: '1 回あたりの学習データ', value: `${trainSize} 件 (${Math.round((trainSize / n) * 100)}%)` },
        { label: '1 回あたりの検証データ', value: `${valSize} 件` },
        { label: 'モデル学習回数', value: `${k} 回`, accent: true },
      ]} />
      <p className={styles.hint}>
        K を増やすほど 1 回に使える学習データが増えバイアスは減りますが、学習を K 回繰り返すため計算時間が K 倍に増えます。
      </p>
    </DemoCard>
  );
}

function ClassificationMetricsDemo() {
  const [tp, setTp] = useState(8);
  const [fp, setFp] = useState(2);
  const [fn, setFn] = useState(2);
  const [tn, setTn] = useState(88);

  const total = tp + fp + fn + tn || 1;
  const acc = (tp + tn) / total;
  const prec = tp + fp > 0 ? tp / (tp + fp) : 0;
  const rec = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = prec + rec > 0 ? (2 * prec * rec) / (prec + rec) : 0;

  return (
    <DemoCard title="混同行列（TP / FP / FN / TN）を動かして、正解率の罠と F1 を体感">
      <div className={styles.presets}>
        <button type="button" onClick={() => { setTp(0); setFp(0); setFn(5); setTn(95); }}>全部「陰性」予測（正解率の罠）</button>
        <button type="button" onClick={() => { setTp(8); setFp(2); setFn(2); setTn(88); }}>バランス型</button>
        <button type="button" onClick={() => { setTp(10); setFp(20); setFn(0); setTn(70); }}>見逃しゼロ重視</button>
      </div>
      <div className={styles.grid}>
        <DemoSlider label="TP（正しく陽性）" valueText={`${tp}`} min={0} max={50} value={tp} onChange={setTp} />
        <DemoSlider label="FP（誤検知）" valueText={`${fp}`} min={0} max={50} value={fp} onChange={setFp} />
      </div>
      <div className={styles.grid}>
        <DemoSlider label="FN（見逃し）" valueText={`${fn}`} min={0} max={50} value={fn} onChange={setFn} />
        <DemoSlider label="TN（正しく陰性）" valueText={`${tn}`} min={0} max={100} value={tn} onChange={setTn} />
      </div>
      <DemoMetrics items={[
        { label: '正解率 Accuracy', value: `${(acc * 100).toFixed(1)}%` },
        { label: '適合率 Precision', value: `${(prec * 100).toFixed(1)}%` },
        { label: '再現率 Recall', value: `${(rec * 100).toFixed(1)}%` },
        { label: 'F1 スコア', value: `${(f1 * 100).toFixed(1)}%`, accent: true },
      ]} />
      <p className={styles.hint}>
        「全部陰性予測」ボタンを押してみてください。不均衡データでは正解率が 95% なのに F1 は 0% になるため、Precision・Recall・F1 の確認が不可欠です。
      </p>
    </DemoCard>
  );
}

function RocAucDemo() {
  const [threshold, setThreshold] = useState(0.5);
  // Fixed scores for 5 positives and 5 negatives
  const pos = [0.92, 0.81, 0.68, 0.54, 0.35];
  const neg = [0.62, 0.44, 0.31, 0.19, 0.08];
  const tpr = pos.filter(s => s >= threshold).length / pos.length;
  const fpr = neg.filter(s => s >= threshold).length / neg.length;

  return (
    <DemoCard title="分類のしきい値 t を動かして、TPR（真陽性率）と FPR（偽陽性率）のトレードオフを見る">
      <DemoSlider label="しきい値 t" valueText={threshold.toFixed(2)} min={0.05} max={0.95} step={0.05} value={threshold} onChange={setThreshold} />
      <div className={styles.attGrid}>
        <DemoBar label="TPR（陽性を正しく拾えた割合）" pct={tpr * 100} detail={`${Math.round(tpr * 5)} / 5`} />
        <DemoBar label="FPR（陰性を誤って陽性にした割合）" pct={fpr * 100} detail={`${Math.round(fpr * 5)} / 5`} />
      </div>
      <p className={styles.hint}>
        しきい値を下げると TPR（拾い上げ）は上がりますが FPR（誤報）も増えます。すべてのしきい値での (FPR, TPR) を描いた曲線が ROC 曲線、その下の面積が AUC です。
      </p>
    </DemoCard>
  );
}

function RegressionMetricsDemo() {
  const [outlierErr, setOutlierErr] = useState(2);
  const errs = [1, 1, 1, 1, outlierErr];
  const mae = errs.reduce((a, b) => a + Math.abs(b), 0) / errs.length;
  const mse = errs.reduce((a, b) => a + b * b, 0) / errs.length;
  const rmse = Math.sqrt(mse);
  const ssTot = 100;
  const r2 = 1 - (errs.reduce((a, b) => a + b * b, 0) / ssTot);

  return (
    <DemoCard title="5 件中 1 件だけ外れ値の誤差を増やすと、MAE・RMSE・R² はどう変わる？">
      <DemoSlider label="外れ値 1 件の誤差" valueText={`${outlierErr}`} min={1} max={12} step={1} value={outlierErr} onChange={setOutlierErr} />
      <DemoMetrics items={[
        { label: 'MAE', value: mae.toFixed(2) },
        { label: 'RMSE', value: rmse.toFixed(2), accent: outlierErr >= 6 },
        { label: '決定係数 R²', value: r2.toFixed(2) },
      ]} />
      <p className={styles.hint}>
        誤差を 2 乗する RMSE は、1 件の大きな外れ値に強く引っ張られて MAE より大きく跳ね上がります。
      </p>
    </DemoCard>
  );
}

function OverfittingDemo() {
  const [deg, setDeg] = useState(3);
  const trainErr = Math.max(0.04, 1.2 * Math.exp(-0.35 * deg));
  const valErr = 0.25 + 0.045 * Math.pow(deg - 4, 2);
  const state = deg <= 2 ? '学習不足（高バイアス）' : deg <= 5 ? 'ちょうど良い汎化' : '過学習（高バリアンス）';

  return (
    <DemoCard title="モデルの複雑さ（多項式の次数）を上げると、訓練誤差と検証誤差はどう離れる？">
      <DemoSlider label="多項式の次数 d" valueText={`${deg} 次`} min={1} max={10} value={deg} onChange={setDeg} />
      <DemoMetrics items={[
        { label: '訓練誤差', value: trainErr.toFixed(2) },
        { label: '検証誤差', value: valErr.toFixed(2), accent: true },
        { label: '状態', value: state },
      ]} />
      <p className={styles.hint}>
        次数を上げると訓練誤差は下がり続けますが、検証誤差は 4 次付近を底に再び悪化します。この乖離が過学習のサインです。
      </p>
    </DemoCard>
  );
}

function TaskMetricsDemo() {
  const [overlap, setOverlap] = useState(60);
  const [ce, setCe] = useState(1.5);
  // Two 100-area boxes overlapping by `overlap`
  const iou = overlap / (200 - overlap);
  const ppl = Math.exp(ce);

  return (
    <DemoCard title="物体検出の IoU と、言語モデルの Perplexity を動かして体感">
      <div className={styles.grid}>
        <DemoSlider label="2 つの枠の重なり率" valueText={`${overlap}%`} min={0} max={100} value={overlap} onChange={setOverlap} />
        <DemoSlider label="言語モデルの交差エントロピー" valueText={ce.toFixed(2)} min={0.1} max={4.0} step={0.1} value={ce} onChange={setCe} />
      </div>
      <DemoMetrics items={[
        { label: 'IoU（重なり ÷ 和集合）', value: iou.toFixed(2), accent: iou >= 0.5 },
        { label: 'Perplexity = exp(CE)', value: `${ppl.toFixed(1)} 語相当` },
      ]} />
      <p className={styles.hint}>
        IoU は通常 0.5 以上で「検出成功」とみなされます。Perplexity は「次の単語を平均何択まで絞り込めているか」を表す指標で、小さいほど優秀です。
      </p>
    </DemoCard>
  );
}

function DescriptiveDemo() {
  const [outlier, setOutlier] = useState(500);
  const data = [300, 350, 400, 450, outlier].sort((a, b) => a - b);
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const median = data[2];

  return (
    <DemoCard title="5 人の年収のうち 1 人だけ超高額にすると、平均値と中央値はどう違う？">
      <div className={styles.presets}>
        <button type="button" onClick={() => setOutlier(500)}>普通 (500万)</button>
        <button type="button" onClick={() => setOutlier(2000)}>富裕層 (2000万)</button>
        <button type="button" onClick={() => setOutlier(10000)}>超富裕層 (1億円)</button>
      </div>
      <DemoSlider label="5 人目の年収" valueText={`${outlier.toLocaleString()} 万円`} min={300} max={10000} step={100} value={outlier} onChange={setOutlier} />
      <DemoMetrics items={[
        { label: '平均値（Mean）', value: `${Math.round(mean).toLocaleString()} 万円`, accent: outlier >= 2000 },
        { label: '中央値（Median）', value: `${median.toLocaleString()} 万円` },
      ]} />
      <p className={styles.hint}>
        1 人が 1 億円になっても中央値は 400 万円のまま動きませんが、平均値は一気に 2,300 万円まで跳ね上がります。歪んだ分布では中央値や四分位範囲が重要です。
      </p>
    </DemoCard>
  );
}

function CorrelationDemo() {
  const [r, setR] = useState(0.7);
  const r2 = r * r;
  const label =
    Math.abs(r) >= 0.7 ? '強い相関' : Math.abs(r) >= 0.4 ? '中程度の相関' : Math.abs(r) >= 0.2 ? '弱い相関' : 'ほぼ無相関';

  return (
    <DemoCard title="相関係数 r を動かして、強さ（R²）と符号の意味を確認">
      <DemoSlider label="相関係数 r" valueText={r.toFixed(2)} min={-1} max={1} step={0.05} value={r} onChange={setR} />
      <DemoMetrics items={[
        { label: '判定の目安', value: `${r >= 0 ? '正の' : '負の'}${label}` },
        { label: '決定係数 r²（説明できる分散）', value: `${Math.round(r2 * 100)}%`, accent: true },
      ]} />
      <p className={styles.hint}>
        r = 0.7 のとき説明できる分散の割合 r² は約 49% です。また相関が 0.9 でも「因果関係」とは限らず、背後に交絡因子がある可能性に注意が必要です。
      </p>
    </DemoCard>
  );
}

function ProbabilityDemo() {
  const [pa, setPa] = useState(0.4);
  const [pb, setPb] = useState(0.5);
  const [pab, setPab] = useState(0.2);
  const maxAb = Math.min(pa, pb);
  const clampedAb = Math.min(pab, maxAb);
  const union = Math.min(1, pa + pb - clampedAb);
  const cond = pb > 0 ? clampedAb / pb : 0;

  return (
    <DemoCard title="P(A), P(B), 重なり P(A∩B) から和事象と条件付き確率を計算">
      <div className={styles.grid}>
        <DemoSlider label="P(A)" valueText={pa.toFixed(2)} min={0.1} max={0.9} step={0.05} value={pa} onChange={setPa} />
        <DemoSlider label="P(B)" valueText={pb.toFixed(2)} min={0.1} max={0.9} step={0.05} value={pb} onChange={setPb} />
      </div>
      <DemoSlider label="重なり P(A∩B)" valueText={clampedAb.toFixed(2)} min={0} max={Number(maxAb.toFixed(2))} step={0.05} value={clampedAb} onChange={setPab} />
      <DemoMetrics items={[
        { label: '和事象 P(A∪B)', value: union.toFixed(2) },
        { label: '条件付き P(A|B)', value: cond.toFixed(2), accent: true },
        { label: '独立なら P(A)P(B)', value: (pa * pb).toFixed(2) },
      ]} />
      <p className={styles.hint}>
        P(A∩B) が P(A)P(B) と一致するとき A と B は独立で、このとき条件付き確率 P(A|B) は P(A) と一致します。
      </p>
    </DemoCard>
  );
}

function BayesDemo() {
  const [prior, setPrior] = useState(0.01);
  const [sens, setSens] = useState(0.95);
  const [fpr, setFpr] = useState(0.05);

  const pPosGivenSick = sens;
  const pPos = prior * pPosGivenSick + (1 - prior) * fpr;
  const posterior = pPos > 0 ? (prior * pPosGivenSick) / pPos : 0;

  return (
    <DemoCard title="ベイズの定理：有病率 1% の病気で検査が陽性だったとき、本当に病気の確率は？">
      <div className={styles.presets}>
        <button type="button" onClick={() => { setPrior(0.01); setSens(0.95); setFpr(0.05); }}>珍しい病気 (1%)</button>
        <button type="button" onClick={() => { setPrior(0.2); setSens(0.95); setFpr(0.05); }}>流行期 (20%)</button>
      </div>
      <div className={styles.grid}>
        <DemoSlider label="事前確率（有病率）" valueText={`${(prior * 100).toFixed(1)}%`} min={0.5} max={50} step={0.5} value={prior * 100} onChange={v => setPrior(v / 100)} />
        <DemoSlider label="偽陽性率（誤検知）" valueText={`${(fpr * 100).toFixed(0)}%`} min={1} max={20} value={fpr * 100} onChange={v => setFpr(v / 100)} />
      </div>
      <DemoBar label="事後確率 P(本当に病気 | 検査陽性)" pct={posterior * 100} detail={`${(posterior * 100).toFixed(1)}%`} />
      <p className={styles.hint}>
        精度 95% の検査でも、有病率が 1% だと「健康な人からの誤検知」の人数の方が多くなり、陽性でも本当に病気の確率は約 16% にとどまります。これが事前確率の威力です。
      </p>
    </DemoCard>
  );
}

function DistributionsDemo() {
  const [x, setX] = useState(70);
  const [mu, setMu] = useState(50);
  const [sigma, setSigma] = useState(10);
  const z = (x - mu) / sigma;
  const absZ = Math.abs(z);
  const band = absZ <= 1 ? '±1σ 内（約 68%）' : absZ <= 2 ? '±2σ 内（約 95%）' : absZ <= 3 ? '±3σ 内（約 99.7%）' : '±3σ 超（極めて稀）';

  return (
    <DemoCard title="正規分布 N(μ, σ²) の標準化（z スコア）と 68-95-99.7 ルールを試す">
      <div className={styles.grid}>
        <DemoSlider label="観測値 x" valueText={`${x}`} min={10} max={90} value={x} onChange={setX} />
        <DemoSlider label="標準偏差 σ" valueText={`${sigma}`} min={2} max={25} value={sigma} onChange={setSigma} />
      </div>
      <DemoMetrics items={[
        { label: 'z スコア = (x−μ)/σ', value: z.toFixed(2), accent: true },
        { label: '偏差値 (50 + 10z)', value: (50 + 10 * z).toFixed(1) },
        { label: '位置の目安', value: band },
      ]} />
      <p className={styles.hint}>
        平均 μ={mu}・標準偏差 σ={sigma} の分布は、z=(x−μ)/σ で変換すると必ず標準正規分布 N(0, 1) に揃います。
      </p>
    </DemoCard>
  );
}

function SamplingDemo() {
  const [n, setN] = useState(25);
  const popSigma = 20;
  const se = popSigma / Math.sqrt(n);

  return (
    <DemoCard title="サンプルサイズ n を増やすと、標本平均のブレ（標準誤差 σ/√n）はどう縮む？">
      <div className={styles.presets}>
        <button type="button" onClick={() => setN(16)}>n = 16</button>
        <button type="button" onClick={() => setN(64)}>n = 64（4倍）</button>
        <button type="button" onClick={() => setN(256)}>n = 256（16倍）</button>
      </div>
      <DemoSlider label="サンプルサイズ n" valueText={`${n} 件`} min={4} max={400} step={4} value={n} onChange={setN} />
      <DemoMetrics items={[
        { label: '母標準偏差 σ', value: `${popSigma}` },
        { label: '標本平均の標準誤差 σ/√n', value: se.toFixed(2), accent: true },
      ]} />
      <p className={styles.hint}>
        標準誤差を半分にするには、サンプル数を 2 倍ではなく「4 倍」にする必要があります（√n の法則）。
      </p>
    </DemoCard>
  );
}

function TestingDemo() {
  const [pVal, setPVal] = useState(0.03);
  const [alpha, setAlpha] = useState(0.05);
  const reject = pVal < alpha;

  return (
    <DemoCard title="p 値と有意水準 α を比べて、帰無仮説 H₀ の棄却判定を試す">
      <div className={styles.presets}>
        <button type="button" aria-pressed={alpha === 0.05} onClick={() => setAlpha(0.05)}>α = 0.05 (5%)</button>
        <button type="button" aria-pressed={alpha === 0.01} onClick={() => setAlpha(0.01)}>α = 0.01 (1%)</button>
      </div>
      <DemoSlider label="観測された p 値" valueText={pVal.toFixed(3)} min={0.001} max={0.15} step={0.002} value={pVal} onChange={setPVal} />
      <DemoMetrics items={[
        { label: '判定 (p < α)', value: reject ? '帰無仮説 H₀ を棄却（有意差あり）' : '棄却できない（有意差なし）', accent: reject },
      ]} />
      <p className={styles.hint}>
        p 値は「もし本当に差がない（H₀ が正しい）のに、偶然これ以上の差が出る確率」です。「H₀ が正しい確率」ではない点に注意しましょう。
      </p>
    </DemoCard>
  );
}

function EstimationDemo() {
  const [n, setN] = useState(100);
  const [conf, setConf] = useState<90 | 95 | 99>(95);
  const z = conf === 90 ? 1.645 : conf === 95 ? 1.96 : 2.576;
  const mean = 50;
  const sigma = 10;
  const margin = z * (sigma / Math.sqrt(n));

  return (
    <DemoCard title="信頼水準とサンプル数 n を変えると、信頼区間の幅はどう変わる？">
      <div className={styles.presets}>
        <button type="button" aria-pressed={conf === 90} onClick={() => setConf(90)}>90% (z=1.645)</button>
        <button type="button" aria-pressed={conf === 95} onClick={() => setConf(95)}>95% (z=1.96)</button>
        <button type="button" aria-pressed={conf === 99} onClick={() => setConf(99)}>99% (z=2.576)</button>
      </div>
      <DemoSlider label="サンプル数 n" valueText={`${n} 件`} min={16} max={400} step={4} value={n} onChange={setN} />
      <DemoMetrics items={[
        { label: `${conf}% 信頼区間`, value: `[${(mean - margin).toFixed(2)}, ${(mean + margin).toFixed(2)}]`, accent: true },
        { label: '誤差幅 ±margin', value: `±${margin.toFixed(2)}` },
      ]} />
      <p className={styles.hint}>
        信頼水準を 95%→99% に上げると区間は広がり（慎重になり）、サンプル数 n を増やすと区間は狭く（精密に）なります。
      </p>
    </DemoCard>
  );
}

function TimeSeriesDemo() {
  const [windowK, setWindowK] = useState(3);
  const raw = [10, 14, 11, 18, 15, 22, 19, 25];
  const ma: number[] = [];
  for (let i = windowK - 1; i < raw.length; i++) {
    let sum = 0;
    for (let j = 0; j < windowK; j++) sum += raw[i - j];
    ma.push(sum / windowK);
  }

  return (
    <DemoCard title="移動平均の窓幅 k を変えて、ノイズ平滑化と遅れ（ラグ）のバランスを見る">
      <DemoSlider label="窓幅 k" valueText={`${windowK} 時点`} min={1} max={5} value={windowK} onChange={setWindowK} />
      <DemoMetrics items={[
        { label: '元データ（直近 4 点）', value: raw.slice(-4).join(' → ') },
        { label: `${windowK} 点移動平均（直近 4 点）`, value: ma.slice(-4).map(v => v.toFixed(1)).join(' → '), accent: true },
      ]} />
      <p className={styles.hint}>
        窓幅 k を大きくするとギザギザしたノイズは滑らかになりますが、最新の急上昇への反応が遅れる（ラグが大きくなる）トレードオフがあります。
      </p>
    </DemoCard>
  );
}

export function renderEvalStatsDemo(key: string) {
  switch (key) {
    case 'eval/validation': return <ValidationDemo />;
    case 'eval/classification-metrics': return <ClassificationMetricsDemo />;
    case 'eval/roc-auc': return <RocAucDemo />;
    case 'eval/regression-metrics': return <RegressionMetricsDemo />;
    case 'eval/overfitting': return <OverfittingDemo />;
    case 'eval/task-metrics': return <TaskMetricsDemo />;
    case 'stats/descriptive': return <DescriptiveDemo />;
    case 'stats/correlation': return <CorrelationDemo />;
    case 'stats/probability': return <ProbabilityDemo />;
    case 'stats/bayes': return <BayesDemo />;
    case 'stats/distributions': return <DistributionsDemo />;
    case 'stats/sampling': return <SamplingDemo />;
    case 'stats/testing': return <TestingDemo />;
    case 'stats/estimation': return <EstimationDemo />;
    case 'stats/time-series': return <TimeSeriesDemo />;
    default: return null;
  }
}
