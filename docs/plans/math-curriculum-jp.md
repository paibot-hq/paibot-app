# 学習指導要領と学習項目の対応（日本）

<!-- node scripts/math-curriculum-doc.mjs が生成する。直接編集しない。 -->

数学ドリルの学習項目が、日本の学習指導要領（小中は2017年告示、高校は2018年告示）の内容をどこまで覆っているかのチェックリスト。学年は `src/lib/math-curriculum-jp.ts`、状態はカタログ（`src/lib/math-catalog.ts`）から作る。

## 使い方

- 学習項目を足すとき: カタログと学年表に足し、`node scripts/math-curriculum-doc.mjs` でこの表を作り直す（作り直していないと `npm test` が失敗する）。1つの学習項目が2学年にまたがるなら分ける。
- 抜けを探すとき: 学習指導要領（または教科書の目次）を学年ごとに上から読み、各内容がどの行に当たるかを確かめる。当たる行がなければ学習項目を足す。
- 証明と作図も4択にする（根拠や次の一手・手順を選ぶ、誤りを見つける、できる図形を選ぶ）。

状態の列:

| 状態 | 意味 |
| --- | --- |
| ✅ | 今すぐ問題を生成できる（出題ルールと生成の指示文がある） |
| A | 出題ルールと指示文を書けば作れる（今の問題の形で足りる） |
| B | 数式の書き方か問題の種類を広げる必要がある（関数、因数分解・不等式・微分積分の形 など） |
| C | 3言語の文章が必要（文章題、知識、証明や作図の手順） |
| D | 図やグラフの描画が必要 |

大学は学習指導要領がないため、理工系の一般的な順番（1・2年）を目安にしている。

## 小1（`e1`）

| 領域 | 学習項目 | 状態 | キー |
| --- | --- | --- | --- |
| 数と計算 | たし算・ひき算 / 10までのたし算・ひき算 | ✅ | `addition/within-10` |
| 数と計算 | たし算・ひき算 / 1桁のくり上がり・くり下がり | ✅ | `addition/carry` |
| 数と計算 | 大きな数 / 100までの数 | C | `place-value/to-100` |
| 図形と測定 | 時刻と時間 / 時計の読み方 | D | `time/reading` |
| 図形と測定 | 図形の基本 / 立体のかたち | D | `shapes/solids-basic` |

## 小2（`e2`）

| 領域 | 学習項目 | 状態 | キー |
| --- | --- | --- | --- |
| 数と計算 | たし算・ひき算 / 2桁のたし算・ひき算 | ✅ | `addition/two-digit` |
| 数と計算 | かけ算 / 九九 | ✅ | `multiplication/times-table` |
| 数と計算 | 計算の順序と文章題 / かんたん文章題 | ✅ | `arith/simple-word-problems` |
| 数と計算 | 大きな数 / 10000までの数 | C | `place-value/to-10000` |
| 数と計算 | 分数 / 分数の意味（1/2・1/4） | D | `fraction/unit-fractions` |
| 図形と測定 | 測定 / 長さとかさ | C | `measurement/length-capacity` |
| 図形と測定 | 図形の基本 / 長方形・正方形・直角三角形 | D | `shapes/basic-shapes` |
| 図形と測定 | 図形の基本 / 箱の形 | D | `shapes/boxes` |
| データと確率 | 表とグラフ / 表とグラフ | D | `graphs/tables` |

## 小3（`e3`）

| 領域 | 学習項目 | 状態 | キー |
| --- | --- | --- | --- |
| 数と計算 | たし算・ひき算 / 3〜4桁の筆算 | ✅ | `addition/column` |
| 数と計算 | かけ算 / 2〜3桁×1桁 | ✅ | `multiplication/by-one-digit` |
| 数と計算 | かけ算 / 2〜3桁×2桁 | ✅ | `multiplication/by-two-digit` |
| 数と計算 | わり算 / 九九を使うわり算 | ✅ | `division/basic` |
| 数と計算 | あまりのあるわり算 / あまりのあるわり算 | ✅ | `division-remainder/remainder` |
| 数と計算 | 大きな数 / 万の位の数 | C | `place-value/ten-thousands` |
| 数と計算 | 小数 / 小数のたし算・ひき算（1/10の位） | ✅ | `decimal/add-sub-tenths` |
| 数と計算 | 分数 / 分数の大きさ | D | `fraction/meaning` |
| 数と計算 | 分数 / 同分母の分数のたし算・ひき算 | ✅ | `fraction/add-sub-like` |
| 式と方程式 | □や文字を使った式 / □を使った式 | ✅ | `unknowns/box` |
| 図形と測定 | 時刻と時間 / 時刻と時間の計算 | C | `time/elapsed` |
| 図形と測定 | 測定 / 重さ | C | `measurement/weight` |
| 図形と測定 | 図形の基本 / 二等辺三角形と正三角形 | D | `shapes/triangles` |
| 図形と測定 | 図形の基本 / 円と球 | D | `shapes/circles` |
| 図形と測定 | 図形の基本 / コンパスを使った図のかき方 | D | `shapes/compass-drawing` |
| データと確率 | 表とグラフ / 棒グラフ | D | `graphs/bar-graph` |

扱わないもの: そろばん（計算の道具の扱いで、4択の計算問題とは別）

## 小4（`e4`）

| 領域 | 学習項目 | 状態 | キー |
| --- | --- | --- | --- |
| 数と計算 | わり算 / 2桁でわるわり算 | ✅ | `division/by-two-digit` |
| 数と計算 | 計算の順序と文章題 / 計算の順序 | ✅ | `arith/order-of-operations` |
| 数と計算 | 計算の順序と文章題 / 計算のきまり | ✅ | `arith/rules` |
| 数と計算 | 計算の順序と文章題 / 少し長い文章題 | ✅ | `arith/word-problems` |
| 数と計算 | 大きな数 / 万・億・兆 | C | `place-value/large-numbers` |
| 数と計算 | 小数 / 小数のたし算・ひき算（1/100の位） | ✅ | `decimal/add-sub` |
| 数と計算 | 小数 / 小数×整数・小数÷整数 | ✅ | `decimal/mul-div-whole` |
| 数と計算 | 分数 / 帯分数と仮分数 | ✅ | `fraction/mixed` |
| 数と計算 | 概数と四捨五入 / 四捨五入 | ✅ | `rounding/rounding` |
| 数と計算 | 概数と四捨五入 / 見積もり | ✅ | `rounding/estimate` |
| 関数・変化と関係 | 変わり方と比例 / 伴って変わる2つの量 | D | `relations/change` |
| 図形と測定 | 測定 / 面積の単位 | C | `measurement/area-units` |
| 図形と測定 | 測定 / 長方形と正方形の面積 | D | `measurement/rect-area` |
| 図形と測定 | 図形の基本 / 平行四辺形・台形・ひし形 | D | `shapes/quadrilaterals` |
| 図形と測定 | 図形の基本 / 角の大きさ | D | `shapes/angles` |
| 図形と測定 | 図形の基本 / 垂直と平行 | D | `shapes/perpendicular-parallel` |
| 図形と測定 | 図形の基本 / 平行線・垂線のかき方 | D | `shapes/parallel-drawing` |
| 図形と測定 | 図形の基本 / 直方体と立方体（展開図・見取図） | D | `shapes/cuboids` |
| データと確率 | 割合と比 / 簡単な割合（何倍か） | C | `ratio/simple-ratio` |
| データと確率 | 表とグラフ / 折れ線グラフ | D | `graphs/line-graph` |
| データと確率 | 表とグラフ / 二次元の表 | D | `graphs/two-way-table` |

扱わないもの: そろばん

## 小5（`e5`）

| 領域 | 学習項目 | 状態 | キー |
| --- | --- | --- | --- |
| 数と計算 | 小数 / 小数×小数・小数÷小数 | ✅ | `decimal/mul-div` |
| 数と計算 | 分数 / 約分・通分 | ✅ | `fraction/simplify` |
| 数と計算 | 分数 / 分数と小数・整数の関係 | ✅ | `fraction/fraction-decimal` |
| 数と計算 | 分数 / 異分母の分数のたし算・ひき算 | ✅ | `fraction/add-sub` |
| 数と計算 | 約数と倍数 / 約数と倍数 | ✅ | `divisors/divisors` |
| 数と計算 | 約数と倍数 / 最大公約数・最小公倍数 | ✅ | `divisors/gcd-lcm` |
| 関数・変化と関係 | 速さと単位量あたり / 速さ・時間・道のり | C | `rate/speed` |
| 関数・変化と関係 | 速さと単位量あたり / 単位量あたりの大きさ | C | `rate/per-unit` |
| 関数・変化と関係 | 変わり方と比例 / 簡単な比例 | C | `relations/simple-proportion` |
| 図形と測定 | 測定 / 三角形・平行四辺形・台形の面積 | D | `measurement/area` |
| 図形と測定 | 測定 / 直方体と立方体の体積 | D | `measurement/volume` |
| 図形と測定 | 測定 / 円周 | D | `measurement/circumference` |
| 図形と測定 | 図形の基本 / 図形の合同 | D | `shapes/congruent` |
| 図形と測定 | 図形の基本 / 合同な図形のかき方 | D | `shapes/congruent-drawing` |
| 図形と測定 | 図形の基本 / 三角形・四角形の角の和 | D | `shapes/angle-sum` |
| 図形と測定 | 図形の基本 / 角柱と円柱 | D | `shapes/prisms` |
| データと確率 | 割合と比 / 百分率 | C | `ratio/percent` |
| データと確率 | 割合と比 / 割合の文章題 | C | `ratio/word-problems` |
| データと確率 | データの活用 / 平均 | ✅ | `data/average` |
| データと確率 | 表とグラフ / 帯グラフと円グラフ | D | `graphs/pie-band` |

## 小6（`e6`）

| 領域 | 学習項目 | 状態 | キー |
| --- | --- | --- | --- |
| 数と計算 | 分数 / 分数のかけ算・わり算 | ✅ | `fraction/mul-div` |
| 式と方程式 | □や文字を使った式 / 文字を使った式 | ✅ | `unknowns/letters` |
| 関数・変化と関係 | 変わり方と比例 / 比例と反比例 | C | `relations/proportion` |
| 図形と測定 | 測定 / 円の面積 | D | `measurement/circle-area` |
| 図形と測定 | 測定 / 角柱・円柱の体積 | D | `measurement/prism-volume` |
| 図形と測定 | 対称と拡大・縮小 / 線対称と点対称 | D | `symmetry/symmetry` |
| 図形と測定 | 対称と拡大・縮小 / 拡大図と縮図 | D | `symmetry/scale` |
| データと確率 | 割合と比 / 比を簡単にする | C | `ratio/ratio` |
| データと確率 | データの活用 / 中央値・範囲 | ✅ | `data/median-range` |
| データと確率 | 表とグラフ / 柱状グラフ | D | `graphs/histogram` |
| データと確率 | 並べ方と組み合わせ / 並べ方 | C | `counting/arrangements` |
| データと確率 | 並べ方と組み合わせ / 組み合わせ | C | `counting/combinations` |

## 中1（`m1`）

| 領域 | 学習項目 | 状態 | キー |
| --- | --- | --- | --- |
| 数と計算 | 正負の数 / 正負の数 | ✅ | `signed/four-operations` |
| 数と計算 | 累乗と指数法則 / 累乗と指数法則 | ✅ | `exponents/powers` |
| 数と計算 | 累乗と指数法則 / 科学的表記と有効数字 | ✅ | `exponents/scientific` |
| 数と計算 | 素因数分解 / 素因数分解 | ✅ | `prime/prime` |
| 式と方程式 | 文字式 / 式の値 | ✅ | `expression/value` |
| 式と方程式 | 文字式 / 同類項をまとめる | ✅ | `expression/like-terms` |
| 式と方程式 | 文字式 / 分配法則 | ✅ | `expression/distribute` |
| 式と方程式 | 一次方程式 / 移項の基本 | ✅ | `linear-equation/basic` |
| 式と方程式 | 一次方程式 / かっこを含む | ✅ | `linear-equation/parentheses` |
| 式と方程式 | 一次方程式 / 分数を含む | ✅ | `linear-equation/fraction` |
| 式と方程式 | 一次方程式 / 比例式 | ✅ | `linear-equation/proportion` |
| 式と方程式 | 一次方程式 / 文章題 | C | `linear-equation/word-problems` |
| 関数・変化と関係 | 比例・一次関数 / 比例・反比例 | ✅ | `linear-function/proportion` |
| 図形と測定 | 円と立体の計量 / 見取図・展開図・投影図 | D | `circle-solid/solid-views` |
| 図形と測定 | 円と立体の計量 / おうぎ形 | D | `circle-solid/sector` |
| 図形と測定 | 円と立体の計量 / 錐体・球の体積と表面積 | D | `circle-solid/solid` |
| 図形と測定 | 図形の移動 / 平行移動・回転・対称移動 | D | `transformations/moves` |
| 図形と測定 | 作図と証明 / 基本の作図 | C | `geometric-reasoning/construction` |
| データと確率 | 確率 / 多数回の試行と確率 | C | `probability/relative-frequency` |
| データと確率 | 度数分布 / 度数分布と相対度数 | D | `frequency/frequency` |

## 中2（`m2`）

| 領域 | 学習項目 | 状態 | キー |
| --- | --- | --- | --- |
| 式と方程式 | 文字式 / 単項式・多項式の計算 | ✅ | `expression/polynomials` |
| 式と方程式 | 文字式 / 等式の変形 | ✅ | `expression/rearrange` |
| 式と方程式 | 連立方程式 / 加減法 | ✅ | `simultaneous/elimination` |
| 式と方程式 | 連立方程式 / 代入法 | ✅ | `simultaneous/substitution` |
| 式と方程式 | 連立方程式 / 文章題 | C | `simultaneous/word-problems` |
| 関数・変化と関係 | 比例・一次関数 / 傾きと切片 | ✅ | `linear-function/slope` |
| 関数・変化と関係 | 比例・一次関数 / 2点を通る直線 | ✅ | `linear-function/two-points` |
| 関数・変化と関係 | 比例・一次関数 / 一次関数と方程式 | ✅ | `linear-function/equations` |
| 図形と測定 | 平面図形と角 / 平行線と角 | D | `angles/parallel` |
| 図形と測定 | 平面図形と角 / 多角形の内角・外角 | D | `angles/polygon` |
| 図形と測定 | 合同と図形の性質 / 三角形の合同条件 | D | `congruence/conditions` |
| 図形と測定 | 合同と図形の性質 / 二等辺三角形と直角三角形 | D | `congruence/triangles` |
| 図形と測定 | 合同と図形の性質 / 平行四辺形になる条件 | D | `congruence/parallelogram` |
| 図形と測定 | 作図と証明 / 合同の証明 | C | `geometric-reasoning/congruence-proof` |
| データと確率 | 確率 / 確率の基本 | C | `probability/basic` |
| データと確率 | 四分位数と箱ひげ図 / 四分位数 | D | `quartiles/quartiles` |
| データと確率 | 四分位数と箱ひげ図 / 箱ひげ図 | D | `quartiles/boxplot` |

## 中3（`m3`）

| 領域 | 学習項目 | 状態 | キー |
| --- | --- | --- | --- |
| 数と計算 | 平方根 / 有理数と無理数 | C | `sqrt/rational-irrational` |
| 数と計算 | 平方根 / 根号を簡単にする | ✅ | `sqrt/simplify` |
| 数と計算 | 平方根 / 平方根のたし算・ひき算 | ✅ | `sqrt/add-sub` |
| 数と計算 | 平方根 / 分母の有理化 | ✅ | `sqrt/rationalize` |
| 式と方程式 | 展開 / 乗法公式 | ✅ | `expansion/formulas` |
| 式と方程式 | 展開 / 平方の展開 | ✅ | `expansion/square` |
| 式と方程式 | 展開 / 和と差の積 | ✅ | `expansion/sum-difference` |
| 式と方程式 | 因数分解 / 二次三項式の因数分解 | ✅ | `factorization/trinomial` |
| 式と方程式 | 因数分解 / 完全平方式の因数分解 | ✅ | `factorization/perfect-square` |
| 式と方程式 | 因数分解 / 平方の差の因数分解 | ✅ | `factorization/difference-of-squares` |
| 式と方程式 | 因数分解（高校） / 共通因数のくくり出し | ✅ | `factoring/common-factor` |
| 式と方程式 | 二次方程式 / 因数分解で解く | ✅ | `quadratic/factoring` |
| 式と方程式 | 二次方程式 / 解の公式 | ✅ | `quadratic/formula` |
| 関数・変化と関係 | 関数 y=ax² / グラフと式 | D | `square-function/graph` |
| 関数・変化と関係 | 関数 y=ax² / 変化の割合 | ✅ | `square-function/rate-of-change` |
| 関数・変化と関係 | 関数 y=ax² / 放物線と直線 | ✅ | `square-function/intersection` |
| 図形と測定 | 三平方の定理 / 辺の長さ | ✅ | `pythagoras/sides` |
| 図形と測定 | 三平方の定理 / 三平方の定理の応用（座標・空間図形） | D | `pythagoras/applications` |
| 図形と測定 | 相似と円 / 相似 | D | `similarity/similarity` |
| 図形と測定 | 相似と円 / 円周角の定理 | D | `similarity/inscribed-angle` |
| 図形と測定 | 作図と証明 / 相似の証明 | C | `geometric-reasoning/similarity-proof` |
| 図形と測定 | 作図と証明 / 円周角を使った証明 | C | `geometric-reasoning/circle-proof` |
| データと確率 | 標本調査 / 母集団と標本 | C | `sampling/population-sample` |
| データと確率 | 標本調査 / 標本からの推定 | C | `sampling/estimate` |

## 数学I（`h-i`）

| 領域 | 学習項目 | 状態 | キー |
| --- | --- | --- | --- |
| 数と計算 | 平方根 / 二重根号 | ✅ | `sqrt/double-radical` |
| 式と方程式 | 不等式 / 一次不等式 | ✅ | `inequality/linear` |
| 式と方程式 | 不等式 / 二次不等式 | ✅ | `inequality/quadratic` |
| 式と方程式 | 不等式 / 絶対値を含む式 | ✅ | `inequality/absolute` |
| 式と方程式 | 展開 / 3つの項の展開 | ✅ | `expansion/three-terms` |
| 式と方程式 | 因数分解（高校） / たすき掛け | ✅ | `factoring/ac-method` |
| 式と方程式 | 因数分解（高校） / 2つの文字を含む式の因数分解 | ✅ | `factoring/two-variables` |
| 式と方程式 | 因数分解（高校） / おきかえ・複二次式 | ✅ | `factoring/substitution` |
| 式と方程式 | 二次方程式 / 判別式 | ✅ | `quadratic/discriminant` |
| 関数・変化と関係 | 二次関数 / 頂点 | ✅ | `quadratic-function/vertex` |
| 関数・変化と関係 | 二次関数 / グラフと式 | ✅ | `quadratic-function/graph` |
| 関数・変化と関係 | 二次関数 / 最大・最小 | ✅ | `quadratic-function/max-min` |
| 図形と測定 | 三角形の計量 / 三角比 | ✅ | `triangle-trig/ratios` |
| 図形と測定 | 三角形の計量 / 正弦定理 | ✅ | `triangle-trig/sine-law` |
| 図形と測定 | 三角形の計量 / 余弦定理 | ✅ | `triangle-trig/cosine-law` |
| 図形と測定 | 三角形の計量 / 三角形の面積 | ✅ | `triangle-trig/area` |
| データと確率 | 分散と相関 / 分散・標準偏差 | ✅ | `statistics/variance` |
| データと確率 | 分散と相関 / 相関係数 | ✅ | `statistics/correlation` |
| データと確率 | 分散と相関 / 仮説検定の考え方 | C | `statistics/hypothesis` |
| 集合と論理 | 集合 / 和集合・共通部分・補集合 | C | `sets/operations` |
| 集合と論理 | 集合 / ベン図と要素の個数 | C | `sets/venn` |
| 集合と論理 | 命題と論理 / 否定と対偶 | C | `logic/negation` |
| 集合と論理 | 命題と論理 / 必要条件・十分条件 | C | `logic/conditions` |

## 数学A（`h-a`）

| 領域 | 学習項目 | 状態 | キー |
| --- | --- | --- | --- |
| 数と計算 | 整数の性質 / ユークリッドの互除法 | ✅ | `integers/euclid` |
| 数と計算 | 整数の性質 / 不定方程式 | ✅ | `integers/diophantine` |
| 数と計算 | 整数の性質 / n進法 | ✅ | `integers/base-n` |
| 数と計算 | 整数の性質 / 合同式 | ✅ | `integers/congruence` |
| 図形と測定 | 図形の性質 / 三角形の五心 | D | `triangle-properties/centers` |
| 図形と測定 | 図形の性質 / 方べきの定理 | D | `triangle-properties/power` |
| 図形と測定 | 図形の性質 / チェバ・メネラウスの定理 | D | `triangle-properties/ceva-menelaus` |
| 図形と測定 | 図形の性質 / 多面体 | D | `triangle-properties/polyhedra` |
| 図形と測定 | 図形の性質 / 作図 | D | `triangle-properties/construction` |
| データと確率 | 場合の数と確率 / 順列 | ✅ | `combinatorics/permutations` |
| データと確率 | 場合の数と確率 / 組合せ | ✅ | `combinatorics/combinations` |
| データと確率 | 場合の数と確率 / 確率 | C | `combinatorics/probability` |
| データと確率 | 場合の数と確率 / 独立な試行・反復試行 | C | `combinatorics/independent` |
| データと確率 | 場合の数と確率 / 条件付き確率 | C | `combinatorics/conditional` |
| データと確率 | 場合の数と確率 / 期待値 | ✅ | `combinatorics/expectation` |

## 数学II（`h-ii`）

| 領域 | 学習項目 | 状態 | キー |
| --- | --- | --- | --- |
| 数と計算 | 複素数 / 複素数の計算 | ✅ | `complex/arithmetic` |
| 数と計算 | 複素数 / 二次方程式の虚数解 | ✅ | `complex/quadratic-roots` |
| 式と方程式 | 展開 / 3次の展開 | ✅ | `expansion/cubic` |
| 式と方程式 | 因数分解（高校） / 3乗の和と差 | ✅ | `factoring/cubes` |
| 式と方程式 | 式と証明 / 二項定理 | ✅ | `identities/binomial` |
| 式と方程式 | 式と証明 / 恒等式 | ✅ | `identities/identity` |
| 式と方程式 | 式と証明 / 不等式の証明 | ✅ | `identities/inequality-proof` |
| 式と方程式 | 高次方程式 / 剰余の定理・因数定理 | ✅ | `polynomial-equations/remainder` |
| 式と方程式 | 高次方程式 / 高次方程式 | ✅ | `polynomial-equations/higher-degree` |
| 関数・変化と関係 | 三角比・三角関数 / 三角関数の値 | ✅ | `trig/values` |
| 関数・変化と関係 | 三角比・三角関数 / 弧度法 | ✅ | `trig/radian` |
| 関数・変化と関係 | 三角比・三角関数 / 加法定理 | ✅ | `trig/addition` |
| 関数・変化と関係 | 三角比・三角関数 / 倍角・半角の公式 | ✅ | `trig/double-angle` |
| 関数・変化と関係 | 三角比・三角関数 / 三角関数の合成 | ✅ | `trig/synthesis` |
| 関数・変化と関係 | 三角比・三角関数 / 三角関数のグラフ | ✅ | `trig/graph` |
| 関数・変化と関係 | 指数・対数 / 指数法則 | ✅ | `exp-log/exponent` |
| 関数・変化と関係 | 指数・対数 / 対数の計算 | ✅ | `exp-log/log` |
| 関数・変化と関係 | 指数・対数 / 常用対数 | ✅ | `exp-log/common-log` |
| 図形と測定 | 図形と方程式 / 直線の方程式 | ✅ | `coordinate-geometry/line` |
| 図形と測定 | 図形と方程式 / 円の方程式 | ✅ | `coordinate-geometry/circle` |
| 図形と測定 | 図形と方程式 / 軌跡 | ✅ | `coordinate-geometry/locus` |
| 図形と測定 | 図形と方程式 / 不等式の表す領域 | ✅ | `coordinate-geometry/region` |
| 微分積分 | 微分 / 多項式の微分 | ✅ | `derivative/polynomial` |
| 微分積分 | 微分 / 微分係数と接線 | ✅ | `derivative/tangent` |
| 微分積分 | 微分 / 極値 | ✅ | `derivative/extrema` |
| 微分積分 | 積分 / 不定積分 | ✅ | `integral/indefinite` |
| 微分積分 | 積分 / 定積分 | ✅ | `integral/definite` |
| 微分積分 | 積分 / 面積 | ✅ | `integral/area` |

## 数学B（`h-b`）

| 領域 | 学習項目 | 状態 | キー |
| --- | --- | --- | --- |
| 関数・変化と関係 | 数列 / 等差数列 | ✅ | `sequence/arithmetic` |
| 関数・変化と関係 | 数列 / 等比数列 | ✅ | `sequence/geometric` |
| 関数・変化と関係 | 数列 / Σ の計算 | ✅ | `sequence/sigma` |
| 関数・変化と関係 | 数列 / 漸化式 | ✅ | `sequence/recurrence` |
| 関数・変化と関係 | 数列 / 数学的帰納法 | ✅ | `sequence/induction` |
| データと確率 | 確率分布 / 確率変数と期待値・分散 | ✅ | `distributions/random-variables` |
| データと確率 | 確率分布 / 二項分布 | ✅ | `distributions/binomial` |
| データと確率 | 確率分布 / 正規分布 | ✅ | `distributions/normal` |
| データと確率 | 統計的推定と検定 / 推定 | ✅ | `inference/estimation` |
| データと確率 | 統計的推定と検定 / 検定 | ✅ | `inference/testing` |

扱わないもの: 数学と社会生活（課題学習）

## 数学III（`h-iii`）

| 領域 | 学習項目 | 状態 | キー |
| --- | --- | --- | --- |
| 微分積分 | 極限 / 数列の極限 | ✅ | `limit/sequence` |
| 微分積分 | 極限 / 関数の極限 | ✅ | `limit/function` |
| 微分積分 | 微分 / 三角・指数・対数関数の微分 | ✅ | `derivative/transcendental` |
| 微分積分 | 微分 / 合成関数・積・商の微分 | ✅ | `derivative/chain-rule` |
| 微分積分 | 微分 / 媒介変数表示の関数の微分 | ✅ | `derivative/parametric` |
| 微分積分 | 微分 / 速度と加速度 | ✅ | `derivative/motion` |
| 微分積分 | 積分 / 置換積分 | ✅ | `integral/substitution` |
| 微分積分 | 積分 / 部分積分 | ✅ | `integral/by-parts` |
| 微分積分 | 積分 / 体積と曲線の長さ | ✅ | `integral/volume` |

## 数学C（`h-c`）

| 領域 | 学習項目 | 状態 | キー |
| --- | --- | --- | --- |
| 数と計算 | 複素数 / 複素数平面 | ✅ | `complex/plane` |
| 関数・変化と関係 | 二次曲線 / 放物線 | ✅ | `conic/parabola` |
| 関数・変化と関係 | 二次曲線 / 楕円と双曲線 | ✅ | `conic/ellipse-hyperbola` |
| 関数・変化と関係 | 二次曲線 / 媒介変数と極座標 | ✅ | `conic/polar` |
| 線形代数 | ベクトル / 成分と大きさ | ✅ | `vector/components` |
| 線形代数 | ベクトル / 内積 | ✅ | `vector/dot-product` |
| 線形代数 | ベクトル / なす角 | ✅ | `vector/angle` |
| 線形代数 | ベクトル / 空間ベクトル | ✅ | `vector/space` |

## 大学1年（`u1`）

| 領域 | 学習項目 | 状態 | キー |
| --- | --- | --- | --- |
| データと確率 | 統計的推定と検定 / 確率変数と確率分布 | C | `inference/random-variables` |
| 集合と論理 | 命題と論理 / 真理値表 | C | `logic/truth-table` |
| 集合と論理 | 写像と関係 / 単射・全射 | C | `mapping/injective` |
| 集合と論理 | 写像と関係 / 同値関係 | C | `mapping/equivalence` |
| 線形代数 | 行列 / 行列の和と積 | ✅ | `matrix/operations` |
| 線形代数 | 行列 / 2×2 の行列式 | ✅ | `matrix/determinant` |
| 線形代数 | 行列 / n次の行列式（余因子展開・クラメルの公式） | ✅ | `matrix/general-determinant` |
| 線形代数 | 行列 / 逆行列 | ✅ | `matrix/inverse` |
| 線形代数 | 連立一次方程式と行列 / 掃き出し法 | ✅ | `linear-system/elimination` |
| 線形代数 | 連立一次方程式と行列 / 解の個数 | ✅ | `linear-system/solutions` |
| 線形代数 | ベクトル空間 / 1次独立 | ✅ | `vector-space/independence` |
| 線形代数 | ベクトル空間 / 基底と次元 | ✅ | `vector-space/basis` |
| 線形代数 | ベクトル空間 / 階数 | ✅ | `vector-space/rank` |
| 線形代数 | 固有値と固有ベクトル / 2×2 の固有値 | ✅ | `eigen/eigenvalues` |
| 線形代数 | 固有値と固有ベクトル / 固有ベクトル | ✅ | `eigen/eigenvectors` |
| 線形代数 | 固有値と固有ベクトル / 対角化 | ✅ | `eigen/diagonalize` |
| 微分積分 | 大学の微分積分 / 平均値の定理・ロピタルの定理 | C | `univ-calculus/mean-value` |
| 微分積分 | 級数とテイラー展開 / 級数の和と収束 | ✅ | `series/series` |
| 微分積分 | 級数とテイラー展開 / テイラー展開 | ✅ | `series/taylor` |
| 微分積分 | 広義積分 / 広義積分 | ✅ | `improper-integral/improper` |
| 微分積分 | 偏微分と重積分 / 偏微分 | ✅ | `multivariable/partial` |
| 微分積分 | 偏微分と重積分 / 重積分 | ✅ | `multivariable/double-integral` |
| 微分積分 | 偏微分と重積分 / 極座標変換 | ✅ | `multivariable/polar` |

## 大学2年（`u2`）

| 領域 | 学習項目 | 状態 | キー |
| --- | --- | --- | --- |
| 線形代数 | 線形写像 / 表現行列 | ✅ | `linear-map/matrix-rep` |
| 線形代数 | 線形写像 / 核と像 | ✅ | `linear-map/kernel-image` |
| 線形代数 | 内積と直交化 / 直交と正規直交基底 | ✅ | `inner-product/orthogonal` |
| 線形代数 | 内積と直交化 / グラム・シュミットの直交化 | ✅ | `inner-product/gram-schmidt` |
| 微分積分 | 微分方程式 / 変数分離形 | ✅ | `ode/separable` |
| 微分積分 | 微分方程式 / 一階線形 | ✅ | `ode/linear-first` |
| 微分積分 | 微分方程式 / 定数係数の二階線形 | ✅ | `ode/second-order` |
