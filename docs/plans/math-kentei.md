# 数検(実用数学技能検定)の出題範囲と学習項目の対応

数検の各級の出題範囲に対して、数学ドリルの学習項目(`src/lib/math-catalog.ts`)が、どこまで覆っているかのチェックリスト。級と学年の対応は `src/lib/math-kentei.ts`、学年は `src/lib/math-curriculum-jp.ts`。

- 作成: 2026年10月5日。出題範囲は、公式サイトの各級のページ([検定の概要](https://www.su-gaku.net/suken/examination/summary/))に載っている「出題範囲」の項目名を、短い言葉にまとめた。
- **暫定**: 公式の「検定基準」の本文とは、1つずつ突き合わせていない(ページの要約から作った)。対応は、**学習項目の名前と説明からの判断**で、問題の中身までは確認していない。数検対策と名乗る前に、公式の検定基準(PDF)で、確かめること。
- **各級は、その級の学年に加えて、下の学年の内容も含む**(各級のページの「検定の内容」が、複数の学年の区分を持つ)。下の表のとおり。以降の表は、その級の学年で新しく出る項目を挙げる。下の学年の抜けは、その学年の級の表を見る(たとえば、2級の範囲は、2級の表と準2級の表)。

| 級 | その級の学年 | 加えて含む学年 |
| --- | --- | --- |
| 11級 | 小1 | - |
| 10級 | 小2 | 小1 |
| 9級 | 小3 | 小2 |
| 8級 | 小4 | 小3 |
| 7級 | 小5 | 小4 |
| 6級 | 小6 | 小5 |
| 5級 | 中1 | 小6、小5 |
| 4級 | 中2 | 中1、小6 |
| 3級 | 中3 | 中2、中1 |
| 準2級 | 高1(数学I・A) | 中3 |
| 2級 | 高2(数学II・B) | 高1(数学I・A) |
| 準1級 | 高3(数学III・C) | 高2(数学II・B) |
| 1級 | 大学 | - |

この対応は、コードの `src/lib/math-kentei.ts`(`grades` と `below`)に持ち、数学の一覧の「数検の級」の絞り込みが使う。
- 数検の解答は、計算や記述が中心で、このドリルは4択。範囲を覆っていても、同じ形式の対策ではない。

状態: ✅ 対応する項目がある / △ 一部(項目はあるが、範囲の一部、または確かめきれていない) / ❌ 対応する項目がない

## 抜けのまとめ

| 級 | 抜け(❌) | 一部(△) |
| --- | --- | --- |
| 11級 | 量の比較(長さ・広さ・かさ)、位置と方向(前後・左右)、個数の簡単なグラフ | 形の構成 |
| 8・7級 | そろばん(4択に向かないので、対象外にしてよい) | - |
| 5級 | 空間の直線と平面の位置関係、直角座標(座標平面の基本) | 柱体の表面積 |
| 4級 | - | 文字式の利用(説明する問題) |
| 2級 | 分数式 | 高次関数(3次関数のグラフ) |
| 準1級 | 分数関数・無理関数、逆関数、合成関数(関数としての扱い) | 一次変換 |
| 1級 | 複素解析、曲線と曲面、二次形式、代数方程式、回帰分析、数値解析、アルゴリズムの基礎、自然科学への応用 | 線形計画法、多項式、初等整数論 |

小学校から準2級までは、抜けが少ない。抜けが集中するのは、**11級(最初の入門)**と、**2級から1級**。

## 11級(小1)

| 出題範囲 | 学習項目 | 状態 |
| --- | --- | --- |
| 個数と順番、整数の意味と表し方 | `place-value/to-100` | ✅ |
| 整数のたし算・ひき算 | `addition/within-10`、`addition/carry` | ✅ |
| 長さ・広さ・水のかさの比較 | - | ❌ |
| 時計の読み方 | `time/reading` | ✅ |
| 身の回りの形、物の分類 | `shapes/solids-basic` | ✅ |
| 形の構成 | `shapes/solids-basic` | △ |
| 位置と方向(前後・左右) | - | ❌ |
| 個数を表す簡単なグラフ | - | ❌ |

## 10級(小2)

| 出題範囲 | 学習項目 | 状態 |
| --- | --- | --- |
| 百の位までのたし算・ひき算 | `addition/two-digit` | ✅ |
| かけ算の意味、九九 | `multiplication/times-table` | ✅ |
| 簡単な分数 | `fraction/unit-fractions` | ✅ |
| 長さ・かさと単位 | `measurement/length-capacity` | ✅ |
| 時間と時計 | `time/reading`(11級の項目) | △ |
| 三角形・四角形・正方形・長方形・直角三角形 | `shapes/basic-shapes` | ✅ |
| 箱の形 | `shapes/boxes` | ✅ |
| 表とグラフ | `graphs/tables` | ✅ |
| 代金・おつりなどの文章題 | `arith/simple-word-problems` | ✅ |

## 9級(小3)

| 出題範囲 | 学習項目 | 状態 |
| --- | --- | --- |
| 整数の表し方 | `place-value/ten-thousands` | ✅ |
| 整数のたし算・ひき算、かけ算、1けたのわり算 | `addition/column`、`multiplication/*`、`division/*` | ✅ |
| 小数・分数の意味と加減 | `decimal/add-sub-tenths`、`fraction/meaning`、`fraction/add-sub-like` | ✅ |
| 長さ・重さ・時間の単位と計算 | `measurement/weight`、`time/elapsed` | ✅ |
| 円と球、二等辺・正三角形 | `shapes/circles`、`shapes/triangles` | ✅ |
| 式で表す(□を使う) | `unknowns/box` | ✅ |
| 表と棒グラフ | `graphs/bar-graph` | ✅ |

## 8級(小4)

| 出題範囲 | 学習項目 | 状態 |
| --- | --- | --- |
| 整数の四則混合計算 | `arith/order-of-operations`、`arith/rules` | ✅ |
| 小数の加減、同分母分数の加減 | `decimal/add-sub`、`fraction/add-sub-like` | ✅ |
| 概数 | `rounding/rounding`、`rounding/estimate` | ✅ |
| 単位と計算、面積 | `measurement/area-units`、`measurement/rect-area` | ✅ |
| 角の大きさ、平行・垂直 | `shapes/angles`、`shapes/perpendicular-parallel` | ✅ |
| 平行四辺形・ひし形・台形 | `shapes/quadrilaterals` | ✅ |
| 基本的な立体 | `shapes/cuboids` | ✅ |
| 表と折れ線グラフ、伴って変わる2つの量 | `graphs/line-graph`、`relations/change` | ✅ |
| そろばん | - | ❌(対象外) |

## 7級(小5)

| 出題範囲 | 学習項目 | 状態 |
| --- | --- | --- |
| 小数の四則混合計算 | `decimal/mul-div` | ✅ |
| 約数・倍数、分数の加減 | `divisors/*`、`fraction/add-sub` | ✅ |
| 三角形・四角形の面積、体積、円周 | `measurement/area`、`measurement/volume`、`measurement/circumference` | ✅ |
| 単位量あたりの大きさ | `rate/per-unit` | ✅ |
| 内角の和、合同、角柱・円柱 | `shapes/angle-sum`、`shapes/congruent`、`shapes/prisms` | ✅ |
| 多角形 | `shapes/angle-sum`(三角形・四角形まで) | △ |
| 平均、簡単な比例、割合・百分率 | `data/average`、`relations/simple-proportion`、`ratio/percent` | ✅ |
| 帯グラフ・円グラフ | `graphs/pie-band` | ✅ |
| そろばん | - | ❌(対象外) |

## 6級(小6)

| 出題範囲 | 学習項目 | 状態 |
| --- | --- | --- |
| 分数を含む四則混合計算 | `fraction/mul-div`、`arith/order-of-operations` | △ |
| 円の面積、角柱・円柱の体積 | `measurement/circle-area`、`measurement/prism-volume` | ✅ |
| 縮図・拡大図、対称 | `symmetry/*` | ✅ |
| 比、比例・反比例 | `ratio/ratio`、`relations/proportion` | ✅ |
| 資料の整理、グラフ | `data/median-range`、`graphs/histogram` | ✅ |
| 割合・百分率 | `ratio/percent`、`ratio/word-problems` | ✅ |
| 簡単な文字と式 | `unknowns/letters` | ✅ |

## 5級(中1)

| 出題範囲 | 学習項目 | 状態 |
| --- | --- | --- |
| 正負の数を含む四則混合計算 | `signed/four-operations` | ✅ |
| 文字を用いた式、一次式の加減 | `expression/*` | ✅ |
| 一元一次方程式 | `linear-equation/*` | ✅ |
| 基本的な作図、平行・対称・回転移動 | `geometric-reasoning/construction`、`transformations/moves` | ✅ |
| 空間における直線・平面の位置関係 | - | ❌ |
| 扇形の弧の長さと面積 | `circle-solid/sector` | ✅ |
| 空間図形の構成、投影・展開 | `circle-solid/solid-views` | ✅ |
| 柱体・錐体・球の表面積と体積 | `circle-solid/solid`、`measurement/prism-volume` | △ |
| 直角座標 | - | ❌ |
| 負の数を含む比例・反比例 | `linear-function/proportion` | ✅ |
| 度数分布とヒストグラム | `frequency/frequency` | ✅ |

## 4級(中2)

| 出題範囲 | 学習項目 | 状態 |
| --- | --- | --- |
| 文字式の四則混合計算、等式の変形 | `expression/polynomials`、`expression/rearrange` | ✅ |
| 文字式の利用(説明する問題) | `expression/*`(文章からの立式は、一次方程式のみ) | △ |
| 連立方程式 | `simultaneous/*` | ✅ |
| 平行線の性質、三角形の合同条件、四角形の性質 | `angles/parallel`、`congruence/*` | ✅ |
| 一次関数 | `linear-function/*` | ✅ |
| 確率の基礎、統計 | `probability/basic`、`quartiles/*` | ✅ |

## 3級(中3)

| 出題範囲 | 学習項目 | 状態 |
| --- | --- | --- |
| 平方根 | `sqrt/*` | ✅ |
| 展開、因数分解 | `expansion/*`、`factorization/*`、`factoring/common-factor` | ✅ |
| 二次方程式 | `quadratic/*` | ✅ |
| 三平方の定理 | `pythagoras/sides`、`pythagoras-applications/applications` | ✅ |
| 円の性質、相似、面積比・体積比 | `similarity/*` | ✅ |
| 簡単な二次関数 | `square-function/*` | ✅ |
| 標本調査・統計 | `sampling/*` | ✅ |

## 準2級(高1: 数学I・A)

| 出題範囲 | 学習項目 | 状態 |
| --- | --- | --- |
| 数と集合 | `sets/*` | ✅ |
| 数と式、展開・因数分解 | `expansion/three-terms`、`factoring/*`、`sqrt/double-radical` | ✅ |
| 二次方程式、二次関数、二次不等式 | `quadratic/discriminant`、`quadratic-function/*`、`inequality/quadratic` | ✅ |
| 三角比 | `triangle-trig/*` | ✅ |
| 円の性質、図形の性質、相似と比 | `triangle-properties/*` | ✅ |
| 順列・組合せ、確率 | `combinatorics/*` | ✅ |
| 整数の性質、n進法 | `integers/*` | ✅ |
| データの分析 | `statistics/*` | ✅ |

## 2級(高2: 数学II・B)

| 出題範囲 | 学習項目 | 状態 |
| --- | --- | --- |
| 式と証明 | `identities/*` | ✅ |
| 分数式 | - | ❌ |
| 高次方程式 | `polynomial-equations/*` | ✅ |
| 指数関数・対数関数 | `exp-log/*` | ✅ |
| 三角関数 | `trig/*` | ✅ |
| 高次関数 | `derivative/extrema`(極値) | △ |
| 点と直線、円の方程式、軌跡と領域 | `coordinate-geometry/*` | ✅ |
| 微分係数と導関数、不定積分と定積分 | `derivative/*`、`integral/*` | ✅ |
| 複素数と方程式 | `complex/arithmetic`、`complex/quadratic-roots` | ✅ |
| 確率分布と統計的な推測 | `distributions/*`、`inference/*` | ✅ |
| (数列) | `sequence/*` | ✅ |

## 準1級(高3: 数学III・C。2級の内容を含む)

| 出題範囲 | 学習項目 | 状態 |
| --- | --- | --- |
| 数列と極限、関数と極限 | `limit/*` | ✅ |
| 分数関数・無理関数 | - | ❌ |
| 合成関数・逆関数 | `derivative/chain-rule`(微分としてのみ) | ❌(関数としての扱い) |
| 微分法・積分法 | `derivative/*`、`integral/*` | ✅ |
| 行列の演算 | `matrix/operations` | ✅ |
| 一次変換 | `linear-map/matrix-rep`(大学2年の項目) | △ |
| いろいろな曲線 | `conic/*` | ✅ |
| 複素数平面 | `complex/plane` | ✅ |
| 基礎的統計処理 | `statistics/*`、`distributions/*` | ✅ |

## 1級(大学程度)

| 出題範囲 | 学習項目 | 状態 |
| --- | --- | --- |
| 微分法・積分法、微分方程式 | `derivative/*`、`integral/*`、`ode/*`、`improper-integral/*`、`series/*` | ✅ |
| 多変数関数(偏微分・重積分) | `multivariable/*` | ✅ |
| 複素解析 | - | ❌ |
| 線形方程式、行列、行列式 | `linear-system/*`、`matrix/*` | ✅ |
| 線形変換、線形空間、計量線形空間 | `linear-map/*`、`vector-space/*`、`inner-product/*` | ✅ |
| 固有値 | `eigen/*` | ✅ |
| 曲線と曲面 | - | ❌ |
| 線形計画法 | `coordinate-geometry/region`(領域のみ) | △ |
| 二次形式 | - | ❌ |
| 多項式、代数方程式 | `polynomial-equations/*`(高校の範囲) | △ / ❌ |
| 初等整数論 | `integers/*`(高校の範囲) | △ |
| 確率、確率分布、相関係数 | `inference/random-variables`、`statistics/correlation` | ✅ |
| 回帰分析 | - | ❌ |
| 数値解析、アルゴリズムの基礎 | - | ❌ |
| 自然科学への応用 | - | ❌ |

## 次の一手(案)

1. **公式の検定基準(PDF)と、1つずつ突き合わせる**。この表は、ページの要約から作ったもの。
2. **抜けを埋める優先順位**: 利用が多い級(小学校から中学校)に抜けは少ない。足すなら、2級の分数式、準1級の分数関数・無理関数と逆関数、5級の座標と空間の位置関係が、現実的。1級は、範囲が広く、別の計画が要る。
3. 11級の「量の比較」「位置と方向」「簡単なグラフ」は、図の描画が要る(`math-shape` で描ける範囲か、確認が必要)。
