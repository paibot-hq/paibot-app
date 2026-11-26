import { useState } from 'react';
import { DemoBar, DemoCard, DemoMetrics, DemoSlider, demoStyles as styles } from './shared';

function PerceptronDemo() {
  const [w1, setW1] = useState(1.0);
  const [w2, setW2] = useState(1.0);
  const [b, setB] = useState(-1.5);

  const inputs: [number, number][] = [[0, 0], [0, 1], [1, 0], [1, 1]];
  const outputs = inputs.map(([x1, x2]) => (w1 * x1 + w2 * x2 + b >= 0 ? 1 : 0));

  return (
    <DemoCard title="重み w₁, w₂ とバイアス b を動かして AND / OR ゲートを作る">
      <div className={styles.presets}>
        <button type="button" onClick={() => { setW1(1); setW2(1); setB(-1.5); }}>AND ゲート</button>
        <button type="button" onClick={() => { setW1(1); setW2(1); setB(-0.5); }}>OR ゲート</button>
        <button type="button" onClick={() => { setW1(-1); setW2(-1); setB(1.5); }}>NAND ゲート</button>
      </div>
      <div className={styles.grid}>
        <DemoSlider label="w₁" valueText={w1.toFixed(1)} min={-2} max={2} step={0.5} value={w1} onChange={setW1} />
        <DemoSlider label="w₂" valueText={w2.toFixed(1)} min={-2} max={2} step={0.5} value={w2} onChange={setW2} />
      </div>
      <DemoSlider label="バイアス b" valueText={b.toFixed(1)} min={-2.5} max={2.5} step={0.5} value={b} onChange={setB} />
      <DemoMetrics items={inputs.map(([x1, x2], i) => ({
        label: `(${x1}, ${x2})`,
        value: `出力 ${outputs[i]}`,
        accent: outputs[i] === 1,
      }))} />
      <p className={styles.hint}>
        単層パーセプトロンは直線 1 本（w₁x₁ + w₂x₂ + b = 0）で 0/1 を分けるため、AND・OR・NAND は作れますが XOR（(0,1),(1,0) だけ 1）は 1 本の直線では分けられません。
      </p>
    </DemoCard>
  );
}

function ActivationsDemo() {
  const [x, setX] = useState(1.0);
  const relu = Math.max(0, x);
  const dRelu = x > 0 ? 1 : 0;
  const sig = 1 / (1 + Math.exp(-x));
  const dSig = sig * (1 - sig);
  const tanhVal = Math.tanh(x);
  const dTanh = 1 - tanhVal * tanhVal;

  return (
    <DemoCard title="入力 x を動かして、活性化関数の出力と微分（勾配）を比べる">
      <div className={styles.presets}>
        <button type="button" onClick={() => setX(-4)}>x = -4（負の大きい値）</button>
        <button type="button" onClick={() => setX(0)}>x = 0（中心）</button>
        <button type="button" onClick={() => setX(4)}>x = 4（正の大きい値）</button>
      </div>
      <DemoSlider label="入力 x" valueText={x.toFixed(1)} min={-6} max={6} step={0.2} value={x} onChange={setX} />
      <DemoMetrics items={[
        { label: 'ReLU(x) / 微分', value: `${relu.toFixed(2)} / ${dRelu.toFixed(2)}`, accent: dRelu === 1 },
        { label: 'Sigmoid(x) / 微分', value: `${sig.toFixed(2)} / ${dSig.toFixed(3)}` },
        { label: 'tanh(x) / 微分', value: `${tanhVal.toFixed(2)} / ${dTanh.toFixed(3)}` },
      ]} />
      <p className={styles.hint}>
        x = ±4 付近で Sigmoid と tanh の微分はほぼ 0 になり勾配消失が起きます。一方 ReLU は x &gt; 0 で微分が常に 1 のまま保たれます（ただし x &lt; 0 では 0 になる Dying ReLU に注意）。
      </p>
    </DemoCard>
  );
}

function LossesDemo() {
  const [err, setErr] = useState(1.5);
  const mse = err * err;
  const mae = Math.abs(err);
  const delta = 1.0;
  const huber = mae <= delta ? 0.5 * err * err : delta * (mae - 0.5 * delta);

  return (
    <DemoCard title="予測誤差 e = y − t が大きくなると、MSE・MAE・Huber はどう増える？">
      <div className={styles.presets}>
        <button type="button" onClick={() => setErr(0.5)}>小さな誤差 (0.5)</button>
        <button type="button" onClick={() => setErr(2.0)}>中くらいの誤差 (2.0)</button>
        <button type="button" onClick={() => setErr(5.0)}>外れ値 (5.0)</button>
      </div>
      <DemoSlider label="誤差 |y − t|" valueText={err.toFixed(1)} min={0} max={6} step={0.1} value={err} onChange={setErr} />
      <DemoMetrics items={[
        { label: 'MSE (e²)', value: mse.toFixed(2), accent: err >= 3 },
        { label: 'MAE (|e|)', value: mae.toFixed(2) },
        { label: 'Huber (δ=1)', value: huber.toFixed(2) },
      ]} />
      <p className={styles.hint}>
        外れ値（誤差 5.0）では MSE が 25.0 まで跳ね上がりますが、MAE は 5.0、Huber は 4.5 に抑えられます。外れ値に強くしたいときは MAE や Huber を使います。
      </p>
    </DemoCard>
  );
}

function BackpropDemo() {
  const [w, setW] = useState(1.0);
  const x = 2.0;
  const target = 6.0;
  const y = w * x;
  const loss = 0.5 * (y - target) ** 2;
  const dLdy = y - target;
  const dydw = x;
  const dLdw = dLdy * dydw;
  const nextW = w - 0.1 * dLdw;

  return (
    <DemoCard title="入力 x = 2、正解 t = 6 のとき、重み w を動かすと勾配はどう伝わる？">
      <DemoSlider label="重み w（正解は 3.00）" valueText={w.toFixed(2)} min={0} max={5} step={0.1} value={w} onChange={setW} />
      <DemoMetrics items={[
        { label: '順伝播 y = w·x', value: `y = ${y.toFixed(2)}` },
        { label: '損失 L = ½(y−6)²', value: `L = ${loss.toFixed(2)}` },
        { label: '連鎖律 ∂L/∂w = (y−6)·x', value: dLdw.toFixed(2), accent: true },
      ]} />
      <p className={styles.hint}>
        勾配 ∂L/∂w = ({dLdy.toFixed(2)}) × ({dydw}) = <strong>{dLdw.toFixed(2)}</strong>。
        学習率 0.1 で 1 歩更新すると w は {w.toFixed(2)} → <strong>{nextW.toFixed(2)}</strong> と正解（3.00）へ近づきます。
      </p>
    </DemoCard>
  );
}

function OptimizersDemo() {
  const [lr, setLr] = useState(0.1);
  const [beta, setBeta] = useState(0.9);
  const [grad, setGrad] = useState(2.0);
  const sgdStep = -lr * grad;
  // Steady-state velocity for constant gradient: v = g / (1 - beta)
  const momStep = -lr * (grad / Math.max(0.05, 1 - beta));
  // Adam normalized step ~ -lr * sign(grad)
  const adamStep = -lr * Math.sign(grad);

  return (
    <DemoCard title="同じ勾配 g に対して、SGD・Momentum・Adam の 1 歩の幅を比べる">
      <div className={styles.grid}>
        <DemoSlider label="学習率 η" valueText={lr.toFixed(2)} min={0.01} max={0.3} step={0.01} value={lr} onChange={setLr} />
        <DemoSlider label="勾配 g" valueText={grad.toFixed(1)} min={0.1} max={5} step={0.1} value={grad} onChange={setGrad} />
      </div>
      <DemoSlider label="Momentum 係数 β" valueText={beta.toFixed(2)} min={0} max={0.95} step={0.05} value={beta} onChange={setBeta} />
      <DemoMetrics items={[
        { label: 'SGD の更新幅', value: sgdStep.toFixed(3) },
        { label: 'Momentum（定常時）', value: momStep.toFixed(3) },
        { label: 'Adam（勾配正規化後）', value: adamStep.toFixed(3), accent: true },
      ]} />
      <p className={styles.hint}>
        Momentum は同じ向きの勾配が続くほど勢いがつき（最大 1/(1−β) 倍）、Adam は勾配の二乗移動平均で割るため勾配の大きさが変わっても 1 歩がほぼ ±η に安定します。
      </p>
    </DemoCard>
  );
}

function InitializationDemo() {
  const [depth, setDepth] = useState(10);
  const [scheme, setScheme] = useState<'small' | 'xavier' | 'he'>('he');
  const fanIn = 256;
  // ReLU keeps ~half the variance per layer: Var(out) = (fanIn/2) * Var(w) * Var(in)
  const varW =
    scheme === 'small' ? 0.01 * 0.01 : scheme === 'xavier' ? 1 / fanIn : 2 / fanIn;
  const factor = (fanIn / 2) * varW;
  const finalStd = Math.pow(factor, depth / 2);

  return (
    <DemoCard title="ReLU ネットワークを深くしたとき、初期値の選び方で信号の大きさはどうなる？">
      <div className={styles.presets}>
        <button type="button" aria-pressed={scheme === 'small'} onClick={() => setScheme('small')}>小さい定数 (σ=0.01)</button>
        <button type="button" aria-pressed={scheme === 'xavier'} onClick={() => setScheme('xavier')}>Xavier (1/n)</button>
        <button type="button" aria-pressed={scheme === 'he'} onClick={() => setScheme('he')}>He 初期化 (2/n)</button>
      </div>
      <DemoSlider label="層数 L" valueText={`${depth} 層`} min={1} max={30} value={depth} onChange={setDepth} />
      <DemoMetrics items={[
        { label: '1 層あたりの分散倍率', value: `${factor.toFixed(3)} 倍` },
        { label: `${depth} 層後の標準偏差`, value: finalStd < 0.0001 ? '< 0.0001（消失）' : finalStd.toFixed(3), accent: scheme === 'he' },
      ]} />
      <p className={styles.hint}>
        ReLU は負の領域を 0 にするため分散が半分になります。He 初期化（分散 2/n）にすると 1 層ごとの倍率がちょうど 1.0 になり、30 層でも信号が消えません。
      </p>
    </DemoCard>
  );
}

function RegularizationDemo() {
  const [lam, setLam] = useState(0.5);
  const [dropout, setDropout] = useState(0.2);
  const wRaw = 1.2;
  const wL2 = wRaw / (1 + lam);
  const wL1 = Math.max(0, wRaw - lam);
  const scale = 1 / Math.max(0.1, 1 - dropout);

  return (
    <DemoCard title="正則化強度 λ と Dropout 率を動かして、重みとスケーリングの変化を見る">
      <div className={styles.grid}>
        <DemoSlider label="正則化 λ" valueText={lam.toFixed(2)} min={0} max={1.5} step={0.1} value={lam} onChange={setLam} />
        <DemoSlider label="Dropout 率 p" valueText={`${Math.round(dropout * 100)}%`} min={0} max={0.8} step={0.1} value={dropout} onChange={setDropout} />
      </div>
      <DemoMetrics items={[
        { label: 'L2 正則化後の重み', value: wL2.toFixed(2) },
        { label: 'L1 正則化後の重み', value: wL1 === 0 ? '0.00（スパース化）' : wL1.toFixed(2), accent: wL1 === 0 },
        { label: 'Inverted Dropout 倍率', value: `${scale.toFixed(2)} 倍` },
      ]} />
      <p className={styles.hint}>
        L1 は λ が大きいと重みをちょうど 0 にして不要な特徴を削り（スパース化）、L2 は 0 にはせず全体を滑らかに縮めます。Dropout では学習時に出力を 1/(1−p) 倍して推論時と期待値を揃えます。
      </p>
    </DemoCard>
  );
}

function NormalizationDemo() {
  const [shift, setShift] = useState(10);
  const [spread, setSpread] = useState(4);
  const [gamma, setGamma] = useState(1.0);
  const [beta, setBeta] = useState(0.0);

  const raw = [-1, 0, 1].map(z => shift + spread * z);
  const mean = raw.reduce((a, b) => a + b, 0) / raw.length;
  const std = Math.sqrt(raw.reduce((a, v) => a + (v - mean) ** 2, 0) / raw.length) || 1;
  const norm = raw.map(v => gamma * ((v - mean) / std) + beta);

  return (
    <DemoCard title="入力分布がズレても、正規化＋γ, β でどう整えられるか試す">
      <div className={styles.grid}>
        <DemoSlider label="元の平均" valueText={shift.toFixed(0)} min={-20} max={20} value={shift} onChange={setShift} />
        <DemoSlider label="元の広がり" valueText={spread.toFixed(1)} min={0.5} max={10} step={0.5} value={spread} onChange={setSpread} />
      </div>
      <div className={styles.grid}>
        <DemoSlider label="学習パラメータ γ" valueText={gamma.toFixed(1)} min={0.5} max={3} step={0.1} value={gamma} onChange={setGamma} />
        <DemoSlider label="学習パラメータ β" valueText={beta.toFixed(1)} min={-3} max={3} step={0.5} value={beta} onChange={setBeta} />
      </div>
      <DemoMetrics items={[
        { label: '元の値 (3 サンプル)', value: raw.map(v => v.toFixed(1)).join(', ') },
        { label: '正規化後の値', value: norm.map(v => v.toFixed(2)).join(', '), accent: true },
      ]} />
      <p className={styles.hint}>
        元の平均や広がりがどれだけ変わっても、一度「平均 0・分散 1」に揃えたあと学習可能な γ・β で最適なスケールに戻すため、深い層でも学習が安定します。
      </p>
    </DemoCard>
  );
}

function HyperparametersDemo() {
  const [dataset, setDataset] = useState(10000);
  const [batch, setBatch] = useState(64);
  const [epochs, setEpochs] = useState(10);
  const stepsPerEpoch = Math.ceil(dataset / batch);
  const totalSteps = stepsPerEpoch * epochs;

  return (
    <DemoCard title="データ数・バッチサイズ・エポック数から、重みの更新回数（ステップ数）を計算">
      <div className={styles.presets}>
        <button type="button" onClick={() => setBatch(32)}>バッチ 32</button>
        <button type="button" onClick={() => setBatch(64)}>バッチ 64</button>
        <button type="button" onClick={() => setBatch(256)}>バッチ 256</button>
      </div>
      <div className={styles.grid}>
        <DemoSlider label="データ数 N" valueText={`${dataset.toLocaleString()} 件`} min={1000} max={50000} step={1000} value={dataset} onChange={setDataset} />
        <DemoSlider label="エポック数" valueText={`${epochs} epoch`} min={1} max={50} value={epochs} onChange={setEpochs} />
      </div>
      <DemoMetrics items={[
        { label: '1 エポックの更新回数', value: `${stepsPerEpoch} step` },
        { label: '合計更新回数', value: `${totalSteps.toLocaleString()} step`, accent: true },
      ]} />
      <p className={styles.hint}>
        バッチサイズを大きくすると 1 エポックあたりの更新回数が減り、GPU 並列効率は上がりますが、汎化性能を保つには学習率の調整（Linear Scaling など）が必要になります。
      </p>
    </DemoCard>
  );
}

function HardwareDemo() {
  const [paramsB, setParamsB] = useState(7);
  const [bits, setBits] = useState<32 | 16 | 8 | 4>(16);
  const bytesPerParam = bits / 8;
  const weightsGb = paramsB * bytesPerParam;
  const pct24 = Math.min(100, (weightsGb / 24) * 100);

  return (
    <DemoCard title="モデル規模と量子化（FP32 / FP16 / INT8 / 4bit）で必要な GPU メモリはどう変わる？">
      <div className={styles.presets}>
        <button type="button" aria-pressed={bits === 32} onClick={() => setBits(32)}>FP32 (4B)</button>
        <button type="button" aria-pressed={bits === 16} onClick={() => setBits(16)}>FP16/BF16 (2B)</button>
        <button type="button" aria-pressed={bits === 8} onClick={() => setBits(8)}>INT8 (1B)</button>
        <button type="button" aria-pressed={bits === 4} onClick={() => setBits(4)}>4bit (0.5B)</button>
      </div>
      <DemoSlider label="パラメータ数" valueText={`${paramsB}B（${paramsB * 10}億）`} min={1} max={70} value={paramsB} onChange={setParamsB} />
      <DemoBar label="RTX 4090 (VRAM 24GB) に対する重みの占有率" pct={pct24} detail={`${weightsGb.toFixed(1)} GB / 24 GB`} />
      <p className={styles.hint}>
        推論時の重みだけで {weightsGb.toFixed(1)} GB 必要です（学習時は勾配や Adam の状態でさらに 3〜4 倍かかります）。精度を半分の bit にすると VRAM 使用量も半分になります。
      </p>
    </DemoCard>
  );
}

export function renderNnDemo(key: string) {
  switch (key) {
    case 'nn/perceptron': return <PerceptronDemo />;
    case 'nn/activations': return <ActivationsDemo />;
    case 'nn/losses': return <LossesDemo />;
    case 'nn/backpropagation': return <BackpropDemo />;
    case 'nn/optimizers': return <OptimizersDemo />;
    case 'nn/initialization': return <InitializationDemo />;
    case 'nn/regularization': return <RegularizationDemo />;
    case 'nn/normalization': return <NormalizationDemo />;
    case 'nn/hyperparameters': return <HyperparametersDemo />;
    case 'nn/hardware': return <HardwareDemo />;
    default: return null;
  }
}
