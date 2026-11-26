import { useState } from 'react';
import { DemoBar, DemoCard, DemoMetrics, DemoSlider, demoStyles as styles } from './shared';

function EntropyDemo() {
  const [p, setP] = useState(0.5);
  const q = 1 - p;
  const h = -(p > 0 ? p * Math.log2(p) : 0) - (q > 0 ? q * Math.log2(q) : 0);
  const infoHead = p > 0 ? -Math.log2(p) : 0;
  return (
    <DemoCard title="コインの表が出る確率 p を変えると、エントロピー（迷い度）はどう変わる？">
      <div className={styles.presets}>
        <button type="button" onClick={() => setP(0.5)}>半々 (50%)</button>
        <button type="button" onClick={() => setP(0.8)}>偏りあり (80%)</button>
        <button type="button" onClick={() => setP(0.99)}>ほぼ確実 (99%)</button>
      </div>
      <DemoSlider label="表の確率 p" valueText={`${Math.round(p * 100)}%（裏 ${Math.round(q * 100)}%）`} min={1} max={99} value={Math.round(p * 100)} onChange={v => setP(v / 100)} />
      <DemoMetrics items={[
        { label: 'エントロピー H(X)', value: `${h.toFixed(3)} bit`, accent: true },
        { label: '表が出たときの驚き −log₂p', value: `${infoHead.toFixed(2)} bit` },
      ]} />
      <p className={styles.hint}>
        50%・50% で最も予測しにくいときに最大（1.000 bit）になり、どちらかに偏るほど 0 に近づきます。
      </p>
    </DemoCard>
  );
}

function CrossEntropyDemo() {
  const [pCat, setPCat] = useState(0.9);
  const loss = -Math.log(pCat);
  const pOther = Math.max(0, 1 - pCat);
  const severity = loss < 0.3 ? 'good' : loss < 1.2 ? 'mid' : 'bad';
  const verdict =
    pCat >= 0.8 ? 'ほぼ当たり！罰（損失）はとても小さいです。'
      : pCat >= 0.4 ? '迷っています。中くらいの罰がかかります。'
        : '自信満々に大外し！罰（−ln q）が一気に跳ね上がります。';

  const W = 300;
  const H = 140;
  const padL = 32;
  const padR = 12;
  const padT = 12;
  const padB = 24;
  const maxLoss = 5.0;
  const toX = (q: number) => padL + q * (W - padL - padR);
  const toY = (l: number) => padT + (1 - Math.min(l, maxLoss) / maxLoss) * (H - padT - padB);
  const points = Array.from({ length: 100 }, (_, i) => {
    const q = (i + 1) / 100;
    return `${toX(q).toFixed(1)},${toY(-Math.log(q)).toFixed(1)}`;
  });

  return (
    <DemoCard title="正解が「猫」のとき、AI の予測確率で罰（損失）はどう変わる？">
      <div className={styles.presets}>
        <button type="button" onClick={() => setPCat(0.9)}>ほぼ当たり (90%)</button>
        <button type="button" onClick={() => setPCat(0.5)}>半信半疑 (50%)</button>
        <button type="button" onClick={() => setPCat(0.1)}>ほぼ外れ (10%)</button>
        <button type="button" onClick={() => setPCat(0.01)}>自信満々に大外し (1%)</button>
      </div>
      <div className={styles.grid}>
        <div className={styles.controls}>
          <DemoSlider label="AI の予測「猫」の確率 q" valueText={`${Math.round(pCat * 100)}%（犬 ${Math.round(pOther * 100)}%）`} min={1} max={99} value={Math.round(pCat * 100)} onChange={v => setPCat(v / 100)} />
          <div className={styles.metricRow} data-tone={severity}>
            <div>
              <span className={styles.metricLabel}>交差エントロピー損失 −ln(q)</span>
              <strong className={styles.metricValue}>{loss.toFixed(2)}</strong>
            </div>
            <p className={styles.verdict}>{verdict}</p>
          </div>
        </div>
        <svg className={styles.chart} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="y = -ln(q) のグラフ">
          <line x1={padL} y1={toY(0)} x2={W - padR} y2={toY(0)} className={styles.axis} />
          <line x1={padL} y1={padT} x2={padL} y2={toY(0)} className={styles.axis} />
          <text x={padL - 6} y={toY(0) + 4} textAnchor="end" className={styles.tick}>0</text>
          <text x={padL - 6} y={toY(4) + 4} textAnchor="end" className={styles.tick}>4</text>
          <text x={toX(0.5)} y={H - 4} textAnchor="middle" className={styles.tick}>正解への予測確率 q (0 → 1)</text>
          <polyline fill="none" points={points.join(' ')} className={styles.curve} />
          <line x1={toX(pCat)} y1={toY(0)} x2={toX(pCat)} y2={toY(loss)} className={styles.guide} />
          <circle cx={toX(pCat)} cy={toY(loss)} r={5.5} className={styles.dot} data-tone={severity} />
        </svg>
      </div>
    </DemoCard>
  );
}

function MutualInfoDemo() {
  const [agree, setAgree] = useState(0.5);
  // Symmetric 2x2 joint table with marginals 0.5, 0.5: P(0,0)=P(1,1)=agree/2, P(0,1)=P(1,0)=(1-agree)/2
  const pSame = agree / 2;
  const pDiff = (1 - agree) / 2;
  const term = (p: number) => (p > 0 ? p * Math.log2(p / 0.25) : 0);
  const mi = 2 * term(pSame) + 2 * term(pDiff);
  return (
    <DemoCard title="天気 X と傘 Y の一致率を変えると、相互情報量 I(X; Y) はどう変わる？">
      <div className={styles.presets}>
        <button type="button" onClick={() => setAgree(0.5)}>無関係・独立 (50%)</button>
        <button type="button" onClick={() => setAgree(0.85)}>強い関係 (85%)</button>
        <button type="button" onClick={() => setAgree(0.99)}>ほぼ完全一致 (99%)</button>
      </div>
      <DemoSlider label="X と Y が一致する割合" valueText={`${Math.round(agree * 100)}%`} min={50} max={99} value={Math.round(agree * 100)} onChange={v => setAgree(v / 100)} />
      <DemoMetrics items={[
        { label: '元の迷い H(X)', value: '1.000 bit' },
        { label: '相互情報量 I(X; Y)', value: `${mi.toFixed(3)} bit`, accent: true },
        { label: '残る迷い H(X|Y)', value: `${Math.max(0, 1 - mi).toFixed(3)} bit` },
      ]} />
      <p className={styles.hint}>独立（50%）なら Y を知っても何も分からず I(X;Y)=0。一致率が上がるほど H(X|Y) が減り I(X;Y) が 1 bit に近づきます。</p>
    </DemoCard>
  );
}

function MatricesDemo() {
  const [a1, setA1] = useState(2);
  const [a2, setA2] = useState(1);
  const [b1, setB1] = useState(3);
  const [b2, setB2] = useState(-1);
  const dot = a1 * b1 + a2 * b2;
  const l1 = Math.abs(a1) + Math.abs(a2);
  const l2 = Math.hypot(a1, a2);
  return (
    <DemoCard title="2つのベクトル a, b を動かして内積・ノルム・アダマール積を比べる">
      <div className={styles.grid}>
        <div className={styles.controls}>
          <DemoSlider label="a₁" valueText={`${a1}`} min={-5} max={5} value={a1} onChange={setA1} />
          <DemoSlider label="a₂" valueText={`${a2}`} min={-5} max={5} value={a2} onChange={setA2} />
        </div>
        <div className={styles.controls}>
          <DemoSlider label="b₁" valueText={`${b1}`} min={-5} max={5} value={b1} onChange={setB1} />
          <DemoSlider label="b₂" valueText={`${b2}`} min={-5} max={5} value={b2} onChange={setB2} />
        </div>
      </div>
      <DemoMetrics items={[
        { label: '内積 a · b', value: `${dot}`, accent: true },
        { label: 'アダマール積 a ⊙ b', value: `(${a1 * b1}, ${a2 * b2})` },
        { label: 'a の L1 / L2 ノルム', value: `${l1} / ${l2.toFixed(2)}` },
      ]} />
    </DemoCard>
  );
}

function EigenDemo() {
  const [diag, setDiag] = useState(5);
  const [off, setOff] = useState(3);
  // Symmetric [[diag, off], [off, diag]]: eigenvalues are diag + |off| and diag - |off|
  const l1 = diag + Math.abs(off);
  const l2 = diag - Math.abs(off);
  const ratio = l1 + l2 > 0 ? (l1 / (l1 + l2)) * 100 : 50;
  return (
    <DemoCard title="共分散行列の相関（非対角成分）を変えると、固有値と PCA 寄与率はどう変わる？">
      <DemoSlider label="対角成分（各軸の分散）" valueText={`${diag}`} min={2} max={10} value={diag} onChange={setDiag} />
      <DemoSlider label="非対角成分（共分散）" valueText={`${off}`} min={0} max={diag - 1} value={Math.min(off, diag - 1)} onChange={setOff} />
      <DemoMetrics items={[
        { label: '最大固有値 λ₁', value: `${l1}`, accent: true },
        { label: '最小固有値 λ₂', value: `${l2}` },
        { label: '第1主成分 寄与率', value: `${ratio.toFixed(1)}%` },
      ]} />
      <p className={styles.hint}>共分散が大きいほどデータが1方向に伸び、第1主成分だけで説明できる割合（寄与率）が一気に高まります。</p>
    </DemoCard>
  );
}

function GradientsDemo() {
  const [w1, setW1] = useState(5);
  const [w2, setW2] = useState(0);
  const [lr, setLr] = useState(0.2);
  const loss = (w1 - 3) ** 2 + 2 * (w2 + 1) ** 2;
  const g1 = 2 * (w1 - 3);
  const g2 = 4 * (w2 + 1);
  return (
    <DemoCard title="2変数関数 L(w₁, w₂) = (w₁−3)² + 2(w₂+1)² の勾配と 1 歩更新">
      <div className={styles.grid}>
        <DemoSlider label="w₁（正解は 3）" valueText={w1.toFixed(1)} min={-2} max={8} step={0.5} value={w1} onChange={setW1} />
        <DemoSlider label="w₂（正解は −1）" valueText={w2.toFixed(1)} min={-5} max={4} step={0.5} value={w2} onChange={setW2} />
      </div>
      <DemoSlider label="学習率 η" valueText={lr.toFixed(2)} min={0.05} max={0.6} step={0.05} value={lr} onChange={setLr} />
      <DemoMetrics items={[
        { label: '現在の損失 L', value: loss.toFixed(2) },
        { label: '勾配 ∇L = (∂L/∂w₁, ∂L/∂w₂)', value: `(${g1.toFixed(1)}, ${g2.toFixed(1)})`, accent: true },
        { label: '1歩更新後 w − η∇L', value: `(${(w1 - lr * g1).toFixed(2)}, ${(w2 - lr * g2).toFixed(2)})` },
      ]} />
    </DemoCard>
  );
}

function DistancesDemo() {
  const [scale, setScale] = useState(1);
  const [angleDeg, setAngleDeg] = useState(30);
  const rad = (angleDeg * Math.PI) / 180;
  const u = [3, 0];
  const v = [3 * scale * Math.cos(rad), 3 * scale * Math.sin(rad)];
  const l2 = Math.hypot(u[0] - v[0], u[1] - v[1]);
  const l1 = Math.abs(u[0] - v[0]) + Math.abs(u[1] - v[1]);
  const cos = Math.cos(rad);
  return (
    <DemoCard title="ベクトルの「角度」と「長さ」を変えると、距離とコサイン類似度はどう違う？">
      <div className={styles.grid}>
        <DemoSlider label="なす角 θ" valueText={`${angleDeg}°`} min={0} max={180} step={5} value={angleDeg} onChange={setAngleDeg} />
        <DemoSlider label="長さの倍率" valueText={`${scale.toFixed(1)}倍`} min={0.5} max={3} step={0.1} value={scale} onChange={setScale} />
      </div>
      <DemoMetrics items={[
        { label: 'コサイン類似度', value: cos.toFixed(2), accent: true },
        { label: 'ユークリッド距離 (L2)', value: l2.toFixed(2) },
        { label: 'マンハッタン距離 (L1)', value: l1.toFixed(2) },
      ]} />
      <p className={styles.hint}>「長さの倍率」を動かしてもコサイン類似度は一切変わりません（向きだけで決まるため）。</p>
    </DemoCard>
  );
}

export function renderInfoLinalgDemo(key: string) {
  switch (key) {
    case 'info/entropy': return <EntropyDemo />;
    case 'info/cross-entropy': return <CrossEntropyDemo />;
    case 'info/mutual-information': return <MutualInfoDemo />;
    case 'linalg/matrices': return <MatricesDemo />;
    case 'linalg/eigen': return <EigenDemo />;
    case 'linalg/gradients': return <GradientsDemo />;
    case 'linalg/distances': return <DistancesDemo />;
    default: return null;
  }
}
