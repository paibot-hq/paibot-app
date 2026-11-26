import { useState } from 'react';
import { DemoBar, DemoCard, DemoMetrics, DemoSlider, demoStyles as styles } from './shared';

function LearningTypesDemo() {
  const [mode, setMode] = useState<'supervised' | 'unsupervised' | 'rl'>('supervised');
  const info = {
    supervised: {
      label: '正解ラベルあり',
      goal: '入力 x から正解 y を予測',
      examples: '家賃予測（回帰）・スパム判定（分類）',
      hint: '「問題と答えのペア」を大量に見せてルールを学ばせます。E資格でも最頻出の枠組みです。',
    },
    unsupervised: {
      label: '正解ラベルなし',
      goal: 'データの構造やグループを発見',
      examples: '顧客セグメント分け（k-means）・PCA 次元削減',
      hint: '答えを教えずに「似ているもの同士をまとめる」「大事な軸を見つける」学習です。',
    },
    rl: {
      label: '報酬のみ（遅延あり）',
      goal: '累積報酬が最大になる行動方策を学習',
      examples: '囲碁 AI・ロボット制御・LLM の RLHF',
      hint: '1 手ごとの正解は教えず、結果のスコア（報酬）を手がかりに試行錯誤で賢くなります。',
    },
  }[mode];

  return (
    <DemoCard title="タスクの種類を切り替えて、学習に必要なものと代表例を比べる">
      <div className={styles.presets}>
        <button type="button" aria-pressed={mode === 'supervised'} onClick={() => setMode('supervised')}>教師あり学習</button>
        <button type="button" aria-pressed={mode === 'unsupervised'} onClick={() => setMode('unsupervised')}>教師なし学習</button>
        <button type="button" aria-pressed={mode === 'rl'} onClick={() => setMode('rl')}>強化学習</button>
      </div>
      <DemoMetrics items={[
        { label: '与える情報', value: info.label, accent: true },
        { label: '目的', value: info.goal },
        { label: '代表例', value: info.examples },
      ]} />
      <p className={styles.hint}>{info.hint}</p>
    </DemoCard>
  );
}

function LinearRegressionDemo() {
  const [a, setA] = useState(1.5);
  const [b, setB] = useState(0.5);
  const pts: [number, number][] = [[1, 2], [2, 4], [3, 5], [4, 8]];
  // Optimal OLS: a = 1.9, b = 0.0
  const sse = pts.reduce((acc, [x, y]) => acc + (y - (a * x + b)) ** 2, 0);
  const mse = sse / pts.length;

  return (
    <DemoCard title="傾き a と切片 b を動かして、最小二乗法（誤差の 2 乗和）を最小にする">
      <div className={styles.presets}>
        <button type="button" onClick={() => { setA(1.9); setB(0.0); }}>最適解 (a=1.9, b=0.0)</button>
        <button type="button" onClick={() => { setA(1.0); setB(1.0); }}>ズレた直線</button>
      </div>
      <div className={styles.grid}>
        <DemoSlider label="傾き a" valueText={a.toFixed(1)} min={0} max={3} step={0.1} value={a} onChange={setA} />
        <DemoSlider label="切片 b" valueText={b.toFixed(1)} min={-2} max={3} step={0.1} value={b} onChange={setB} />
      </div>
      <DemoMetrics items={[
        { label: '残差平方和 SSE', value: sse.toFixed(2), accent: sse < 1.0 },
        { label: '平均二乗誤差 MSE', value: mse.toFixed(2) },
      ]} />
      <p className={styles.hint}>
        4 点 (1,2), (2,4), (3,5), (4,8) に対して、傾き a=1.9・切片 b=0.0 のとき残差平方和が最小（0.70）になります。
      </p>
    </DemoCard>
  );
}

function LogisticRegressionDemo() {
  const [z, setZ] = useState(0.0);
  const p = 1 / (1 + Math.exp(-z));
  const odds = Math.exp(z);

  return (
    <DemoCard title="線形結合 z = w·x + b を動かして、シグモイド確率とオッズ比を確認">
      <DemoSlider label="ロジット z = w·x + b" valueText={z.toFixed(1)} min={-5} max={5} step={0.2} value={z} onChange={setZ} />
      <DemoBar label="陽性クラスである予測確率 σ(z)" pct={p * 100} detail={`${(p * 100).toFixed(1)}%`} />
      <DemoMetrics items={[
        { label: 'オッズ p/(1−p) = e^z', value: odds > 100 ? '> 100' : odds.toFixed(2) },
        { label: '判定 (しきい値 0.5)', value: p >= 0.5 ? '陽性 (1)' : '陰性 (0)', accent: p >= 0.5 },
      ]} />
      <p className={styles.hint}>
        z = 0 がちょうど確率 50% の決定境界です。z が 1 増えるごとにオッズは e 倍（約 2.72 倍）になります。
      </p>
    </DemoCard>
  );
}

function SvmDemo() {
  const [cVal, setCVal] = useState(1.0);
  const normW = 0.5 + 0.35 * Math.log10(cVal * 10);
  const margin = 2 / normW;
  const tendency =
    cVal < 0.5 ? 'マージン広め（外れ値を許容・汎化重視）'
      : cVal <= 5 ? 'バランス型'
        : 'ハードマージン寄り（誤分類を厳しく罰する・過学習注意）';

  return (
    <DemoCard title="ソフトマージン SVM のコストパラメータ C を動かして、マージン幅との関係を体感">
      <div className={styles.presets}>
        <button type="button" onClick={() => setCVal(0.1)}>C = 0.1（ゆるい）</button>
        <button type="button" onClick={() => setCVal(1.0)}>C = 1.0（標準）</button>
        <button type="button" onClick={() => setCVal(20)}>C = 20（厳しい）</button>
      </div>
      <DemoSlider label="ペナルティ C" valueText={cVal.toFixed(1)} min={0.1} max={25} step={0.1} value={cVal} onChange={setCVal} />
      <DemoMetrics items={[
        { label: 'マージン幅 2/‖w‖（相対）', value: margin.toFixed(2), accent: true },
        { label: 'モデルの傾向', value: tendency },
      ]} />
      <p className={styles.hint}>
        C が大きいほど訓練データの誤分類を許さなくなるため、マージンが狭くなり外れ値に引っ張られやすくなります。
      </p>
    </DemoCard>
  );
}

function TreesEnsemblesDemo() {
  const [p, setP] = useState(0.5);
  const q = 1 - p;
  const gini = 2 * p * q;
  const entropy = -(p > 0 ? p * Math.log2(p) : 0) - (q > 0 ? q * Math.log2(q) : 0);

  return (
    <DemoCard title="決定木のノード内のクラス比率を変えて、ジニ不純度とエントロピーを見る">
      <div className={styles.presets}>
        <button type="button" onClick={() => setP(0.5)}>半々（最も不純）</button>
        <button type="button" onClick={() => setP(0.8)}>8:2（やや純粋）</button>
        <button type="button" onClick={() => setP(1.0)}>100%（完全に純粋）</button>
      </div>
      <DemoSlider label="クラス A の割合 p" valueText={`${Math.round(p * 100)}%`} min={0} max={100} value={Math.round(p * 100)} onChange={v => setP(v / 100)} />
      <DemoMetrics items={[
        { label: 'ジニ不純度 1−p²−(1−p)²', value: gini.toFixed(3), accent: gini === 0 },
        { label: 'エントロピー H(p)', value: entropy.toFixed(3) },
      ]} />
      <p className={styles.hint}>
        決定木は分割後にこの不純度が最も大きく下がる特徴量としきい値を選びます。100% 単一クラスになると不純度は 0 です。
      </p>
    </DemoCard>
  );
}

function KnnDemo() {
  const [k, setK] = useState(3);
  // 7 nearest neighbors sorted by distance: 1st & 2nd are '赤', 3rd-7th are mostly '青'
  const neighbors: ('赤' | '青')[] = ['赤', '赤', '青', '青', '青', '赤', '青'];
  const picked = neighbors.slice(0, k);
  const red = picked.filter(c => c === '赤').length;
  const blue = k - red;
  const pred = red > blue ? '赤' : '青';

  return (
    <DemoCard title="近傍数 k を変えると、多数決の予測結果はどう変わる？">
      <div className={styles.presets}>
        {[1, 3, 5, 7].map(val => (
          <button key={val} type="button" aria-pressed={k === val} onClick={() => setK(val)}>k = {val}</button>
        ))}
      </div>
      <DemoMetrics items={[
        { label: `近い順 ${k} 件の内訳`, value: `赤 ${red} 票 / 青 ${blue} 票` },
        { label: '多数決の予測', value: `${pred} クラス`, accent: true },
      ]} />
      <p className={styles.hint}>
        k = 1 だとすぐ隣のノイズ（赤）に引っ張られてしまいますが、k = 5 にすると周囲の多数派（青）を安定して予測できます。
      </p>
    </DemoCard>
  );
}

function ClusteringDemo() {
  const [k, setK] = useState(3);
  // Typical elbow curve WCSS where true clusters = 3
  const wcssTable = [0, 420, 195, 62, 51, 44, 39, 36];
  const wcss = wcssTable[k];

  return (
    <DemoCard title="k-means のクラスタ数 K とクラスタ内誤差平方和（エルボー法）を見る">
      <DemoSlider label="クラスタ数 K" valueText={`K = ${k}`} min={1} max={7} value={k} onChange={setK} />
      <DemoBar label="クラスタ内誤差平方和 WCSS（低いほど密）" pct={(wcss / 420) * 100} detail={`${wcss}`} />
      <p className={styles.hint}>
        K = 1→2→3 で誤差が急激に下がり、K = 3 以降は下がり幅が急に緩やかになります。この「肘（エルボー）」のように折れ曲がる K = 3 が適切なクラスタ数の目安です。
      </p>
    </DemoCard>
  );
}

function DimReductionDemo() {
  const [dims, setDims] = useState(2);
  // Variance ratios of 4 principal components summing to 100%
  const ratios = [58, 29, 9, 4];
  const cum = ratios.slice(0, dims).reduce((a, b) => a + b, 0);

  return (
    <DemoCard title="PCA で残す主成分の数を選ぶと、元の情報（累積寄与率）は何%残る？">
      <DemoSlider label="残す主成分の数（元は 4 次元）" valueText={`${dims} 次元に圧縮`} min={1} max={4} value={dims} onChange={setDims} />
      <DemoBar label="累積寄与率（残せた分散の割合）" pct={cum} detail={`${cum}%（内訳: ${ratios.slice(0, dims).join('% + ')}%）`} />
      <p className={styles.hint}>
        4 次元データを半分の 2 次元に圧縮しても、第 1・第 2 主成分だけで全体の 87% の情報（分散）を保持できます。
      </p>
    </DemoCard>
  );
}

function RecommendationDemo() {
  const [bAction, setBAction] = useState(5);
  const [bRomance, setBRomance] = useState(1);
  // User A likes Action (5) and dislikes Romance (1)
  const a = [5, 1];
  const b = [bAction, bRomance];
  const dot = a[0] * b[0] + a[1] * b[1];
  const sim = dot / (Math.hypot(a[0], a[1]) * Math.hypot(b[0], b[1]));

  return (
    <DemoCard title="協調フィルタリング：ユーザー A（アクション 5・恋愛 1）との好みが近いほど類似度が上がる">
      <div className={styles.grid}>
        <DemoSlider label="ユーザー B のアクション評価" valueText={`★${bAction}`} min={1} max={5} value={bAction} onChange={setBAction} />
        <DemoSlider label="ユーザー B の恋愛評価" valueText={`★${bRomance}`} min={1} max={5} value={bRomance} onChange={setBRomance} />
      </div>
      <DemoBar label="ユーザー A と B のコサイン類似度" pct={sim * 100} detail={sim.toFixed(3)} />
      <p className={styles.hint}>
        好みが似ているユーザー（類似度が高い人）が高評価している未視聴アイテムを優先的に推薦するのがユーザーベース協調フィルタリングです。
      </p>
    </DemoCard>
  );
}

function RlDemo() {
  const [gamma, setGamma] = useState(0.9);
  // Rewards: +1 immediately, +10 at step 4
  const rewards = [1, 0, 0, 0, 10];
  const discountedReturn = rewards.reduce((acc, r, t) => acc + r * Math.pow(gamma, t), 0);
  const futureVal = 10 * Math.pow(gamma, 4);

  return (
    <DemoCard title="割引率 γ を動かして、「目の前の +1」と「4 手先の +10」の価値を比べる">
      <div className={styles.presets}>
        <button type="button" onClick={() => setGamma(0.2)}>近視眼的 (γ=0.2)</button>
        <button type="button" onClick={() => setGamma(0.9)}>標準 (γ=0.9)</button>
        <button type="button" onClick={() => setGamma(0.99)}>長期重視 (γ=0.99)</button>
      </div>
      <DemoSlider label="割引率 γ" valueText={gamma.toFixed(2)} min={0} max={0.99} step={0.01} value={gamma} onChange={setGamma} />
      <DemoMetrics items={[
        { label: '4 手先の +10 の現在価値', value: futureVal.toFixed(2), accent: futureVal > 1 },
        { label: '累積割引報酬 G₀', value: discountedReturn.toFixed(2) },
      ]} />
      <p className={styles.hint}>
        γ が小さいと将来の大報酬がほぼ無視されて目先の報酬だけを追うようになり、γ を 1 に近づけるほど長期的なゴールを見据えた行動を学習します。
      </p>
    </DemoCard>
  );
}

export function renderMlDemo(key: string) {
  switch (key) {
    case 'ml/learning-types': return <LearningTypesDemo />;
    case 'ml/linear-regression': return <LinearRegressionDemo />;
    case 'ml/logistic-regression': return <LogisticRegressionDemo />;
    case 'ml/svm': return <SvmDemo />;
    case 'ml/trees-ensembles': return <TreesEnsemblesDemo />;
    case 'ml/knn': return <KnnDemo />;
    case 'ml/clustering': return <ClusteringDemo />;
    case 'ml/dimensionality-reduction': return <DimReductionDemo />;
    case 'ml/recommendation': return <RecommendationDemo />;
    case 'ml/reinforcement-learning': return <RlDemo />;
    default: return null;
  }
}
