import { useState } from 'react';
import { DemoBar, DemoCard, DemoMetrics, DemoSlider, demoStyles as styles } from './shared';

function ConvolutionDemo() {
  const [h, setH] = useState(32);
  const [k, setK] = useState(3);
  const [p, setP] = useState(1);
  const [s, setS] = useState(1);
  const [cin, setCin] = useState(3);
  const [cout, setCout] = useState(16);
  const out = Math.floor((h + 2 * p - k) / s) + 1;
  const params = cin * cout * k * k + cout;
  return (
    <DemoCard title="畳み込みの出力サイズとパラメータ数をリアルタイム計算">
      <div className={styles.grid}>
        <div className={styles.controls}>
          <DemoSlider label="入力サイズ H" valueText={`${h}×${h}`} min={8} max={64} step={2} value={h} onChange={setH} />
          <DemoSlider label="カーネル K" valueText={`${k}×${k}`} min={1} max={7} step={2} value={k} onChange={setK} />
          <DemoSlider label="パディング p" valueText={`${p}`} min={0} max={3} value={p} onChange={setP} />
        </div>
        <div className={styles.controls}>
          <DemoSlider label="ストライド s" valueText={`${s}`} min={1} max={4} value={s} onChange={setS} />
          <DemoSlider label="入力チャネル C_in" valueText={`${cin}`} min={1} max={64} value={cin} onChange={setCin} />
          <DemoSlider label="出力チャネル C_out" valueText={`${cout}`} min={1} max={128} value={cout} onChange={setCout} />
        </div>
      </div>
      <DemoMetrics items={[
        { label: '出力サイズ H_out', value: `${out} × ${out}`, accent: true },
        { label: 'パラメータ総数（バイアス込）', value: `${params.toLocaleString()}` },
      ]} />
    </DemoCard>
  );
}

function PoolingDemo() {
  const [peak, setPeak] = useState(8);
  const vals = [1, 3, 2, peak];
  const maxV = Math.max(...vals);
  const avgV = vals.reduce((a, b) => a + b, 0) / vals.length;
  return (
    <DemoCard title="2×2 領域の 1 マスを変えたときの Max / Average Pooling の違い">
      <DemoSlider label="右下の値（他は 1, 3, 2）" valueText={`${peak}`} min={0} max={12} value={peak} onChange={setPeak} />
      <DemoMetrics items={[
        { label: 'Max Pooling', value: `${maxV}`, accent: true },
        { label: 'Average Pooling', value: avgV.toFixed(2) },
        { label: '学習パラメータ数', value: '0 個' },
      ]} />
      <p className={styles.hint}>Max Pooling は強い特徴（最大値）だけをそのまま通し、Average Pooling は領域全体の平均を取ります。</p>
    </DemoCard>
  );
}

function SkipConnectionsDemo() {
  const [depth, setDepth] = useState(20);
  const [factor, setFactor] = useState(0.8);
  const plain = factor ** depth;
  const residual = 1 + factor * 0.2;
  return (
    <DemoCard title="層が深くなったとき、スキップ結合の有無で勾配の届き方はどう変わる？">
      <div className={styles.grid}>
        <DemoSlider label="層の深さ L" valueText={`${depth} 層`} min={2} max={50} value={depth} onChange={setDepth} />
        <DemoSlider label="1 層あたりの勾配倍率" valueText={factor.toFixed(2)} min={0.5} max={0.98} step={0.02} value={factor} onChange={setFactor} />
      </div>
      <DemoMetrics items={[
        { label: 'スキップなし (r^L)', value: plain < 0.0001 ? plain.toExponential(1) : plain.toFixed(4) },
        { label: 'スキップあり（恒等経路 +1）', value: `≧ 1.00（例: ${residual.toFixed(2)}）`, accent: true },
      ]} />
      <p className={styles.hint}>スキップなしでは {depth} 層で勾配が {plain < 0.01 ? 'ほぼ 0 に消失' : '大きく減衰'} しますが、y = F(x) + x なら +1 の近道を通って必ず届きます。</p>
    </DemoCard>
  );
}

function RnnDemo() {
  const [steps, setSteps] = useState(10);
  const [w, setW] = useState(0.7);
  const grad = w ** steps;
  const status = w < 0.95 ? '勾配消失（遠い過去が届かない）' : w > 1.05 ? '勾配爆発（値が発散）' : 'ちょうど維持';
  return (
    <DemoCard title="BPTT でステップ数をさかのぼると、勾配はどう減衰・爆発する？">
      <div className={styles.presets}>
        <button type="button" onClick={() => setW(0.5)}>消失 (w=0.5)</button>
        <button type="button" onClick={() => setW(1.0)}>維持 (w=1.0)</button>
        <button type="button" onClick={() => setW(1.3)}>爆発 (w=1.3)</button>
      </div>
      <div className={styles.grid}>
        <DemoSlider label="さかのぼるステップ数 T" valueText={`${steps} ステップ`} min={1} max={30} value={steps} onChange={setSteps} />
        <DemoSlider label="1 ステップの倍率 w" valueText={w.toFixed(2)} min={0.3} max={1.5} step={0.05} value={w} onChange={setW} />
      </div>
      <DemoMetrics items={[
        { label: 'T ステップ前の勾配倍率 w^T', value: grad > 1000 || grad < 0.001 ? grad.toExponential(2) : grad.toFixed(3), accent: true },
        { label: '状態', value: status },
      ]} />
    </DemoCard>
  );
}

function LstmGruDemo() {
  const [f, setF] = useState(0.8);
  const [i, setI] = useState(0.5);
  const cPrev = 4.0;
  const cCand = 1.0;
  const cNext = f * cPrev + i * cCand;
  return (
    <DemoCard title="LSTM の忘却ゲート f と入力ゲート i でセル状態（記憶）を操作する">
      <div className={styles.grid}>
        <DemoSlider label="忘却ゲート f（昔の記憶を残す割合）" valueText={f.toFixed(2)} min={0} max={1} step={0.05} value={f} onChange={setF} />
        <DemoSlider label="入力ゲート i（新しい情報を入れる割合）" valueText={i.toFixed(2)} min={0} max={1} step={0.05} value={i} onChange={setI} />
      </div>
      <DemoMetrics items={[
        { label: '前の記憶 c_{t-1}', value: cPrev.toFixed(1) },
        { label: '新候補 c̃_t', value: cCand.toFixed(1) },
        { label: '更新後の記憶 c_t = f·c_{t-1} + i·c̃_t', value: cNext.toFixed(2), accent: true },
      ]} />
      <p className={styles.hint}>f=1, i=0 にすると昔の記憶が一切減衰せずそのまま保持されます。</p>
    </DemoCard>
  );
}

function AttentionSimpleDemo() {
  const [s1, setS1] = useState(3);
  const [s2, setS2] = useState(1);
  const [s3, setS3] = useState(0);
  const exps = [Math.exp(s1), Math.exp(s2), Math.exp(s3)];
  const sum = exps[0] + exps[1] + exps[2];
  const w = exps.map(e => e / sum);
  const vals = [10, 5, 0];
  const ctx = w[0] * vals[0] + w[1] * vals[1] + w[2] * vals[2];
  return (
    <DemoCard title="Query と各 Key のスコアから、Attention 重みと文脈ベクトルを作る">
      <div className={styles.grid}>
        <DemoSlider label="単語1 スコア (Value=10)" valueText={`${s1}`} min={-2} max={5} step={0.5} value={s1} onChange={setS1} />
        <DemoSlider label="単語2 スコア (Value=5)" valueText={`${s2}`} min={-2} max={5} step={0.5} value={s2} onChange={setS2} />
      </div>
      <DemoSlider label="単語3 スコア (Value=0)" valueText={`${s3}`} min={-2} max={5} step={0.5} value={s3} onChange={setS3} />
      <div className={styles.attGrid}>
        <DemoBar label="単語1 の重み α₁" pct={w[0] * 100} />
        <DemoBar label="単語2 の重み α₂" pct={w[1] * 100} />
        <DemoBar label="単語3 の重み α₃" pct={w[2] * 100} />
      </div>
      <DemoMetrics items={[{ label: '出力（加重平均 Σ α_i v_i）', value: ctx.toFixed(2), accent: true }]} />
    </DemoCard>
  );
}

function TransformerDemo() {
  const [scores, setScores] = useState<[number, number, number]>([6, 2, 0]);
  const [dk, setDk] = useState(64);
  const [useScale, setUseScale] = useState(true);
  const tokens = ['猫（主語）', '魚（目的語）', '昨日（時間）'];
  const scale = useScale ? Math.sqrt(dk) : 1;
  const scaled = scores.map(s => s / scale);
  const maxS = Math.max(...scaled);
  const exps = scaled.map(s => Math.exp(s - maxS));
  const sumExp = exps.reduce((a, b) => a + b, 0);
  const weights = exps.map(e => e / sumExp);

  function updateScore(idx: number, val: number) {
    setScores(prev => {
      const next: [number, number, number] = [...prev];
      next[idx] = val;
      return next;
    });
  }

  return (
    <DemoCard title="「食べた」がどの単語に注目する？ √d_k スケーリングの効果を試す">
      <div className={styles.presets}>
        <button type="button" aria-pressed={useScale} className={useScale ? styles.toggleOn : undefined} onClick={() => setUseScale(v => !v)}>
          √d_k で割る：{useScale ? 'ON（標準）' : 'OFF（張り付き注意）'}
        </button>
        <button type="button" onClick={() => setDk(4)} aria-pressed={dk === 4}>d_k = 4</button>
        <button type="button" onClick={() => setDk(64)} aria-pressed={dk === 64}>d_k = 64</button>
      </div>
      <div className={styles.attGrid}>
        {tokens.map((label, i) => (
          <div key={label} className={styles.tokenRow}>
            <div className={styles.tokenHead}>
              <strong>{label}</strong>
              <span>内積 q·k = {scores[i].toFixed(1)} → スコア {scaled[i].toFixed(2)}</span>
            </div>
            <input type="range" min={-4} max={12} step={0.5} value={scores[i]} onChange={e => updateScore(i, Number(e.target.value))} />
            <div className={styles.barWrap}>
              <div className={styles.barFill} style={{ width: `${Math.round(weights[i] * 100)}%` }} />
              <span className={styles.barText}>注目度 {Math.round(weights[i] * 100)}%</span>
            </div>
          </div>
        ))}
      </div>
      <p className={styles.hint}>
        {useScale
          ? `√d_k = ${Math.sqrt(dk)} で割ることで極端な偏りが和らぎ、他の単語にも勾配が流れやすくなります。`
          : '√d_k で割らないと、内積が大きいときに Softmax がほぼ 100% / 0% に張り付き、勾配がほぼ 0 になって学習が止まりやすくなります。'}
      </p>
    </DemoCard>
  );
}

function AugmentationDemo() {
  const [lam, setLam] = useState(0.7);
  return (
    <DemoCard title="MixUp の混合率 λ を動かしてソフトラベルの変化を見る">
      <DemoSlider label="混合率 λ（猫の割合）" valueText={`${Math.round(lam * 100)}%（犬 ${Math.round((1 - lam) * 100)}%）`} min={0} max={100} value={Math.round(lam * 100)} onChange={v => setLam(v / 100)} />
      <div className={styles.attGrid}>
        <DemoBar label="教師ラベル：猫" pct={lam * 100} />
        <DemoBar label="教師ラベル：犬" pct={(1 - lam) * 100} />
      </div>
      <p className={styles.hint}>画像だけでなく正解ラベルも ({lam.toFixed(2)}, {(1 - lam).toFixed(2)}) のソフトラベルに混ぜることで、過信を抑え決定境界が滑らかになります。</p>
    </DemoCard>
  );
}

export function renderArchDemo(key: string) {
  switch (key) {
    case 'arch/convolution': return <ConvolutionDemo />;
    case 'arch/pooling': return <PoolingDemo />;
    case 'arch/skip-connections': return <SkipConnectionsDemo />;
    case 'arch/rnn': return <RnnDemo />;
    case 'arch/lstm-gru': return <LstmGruDemo />;
    case 'arch/attention': return <AttentionSimpleDemo />;
    case 'arch/transformer': return <TransformerDemo />;
    case 'arch/augmentation': return <AugmentationDemo />;
    default: return null;
  }
}
