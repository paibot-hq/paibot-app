式は次の書き方だけを使う（画面ではこの文字列から数式を表示し、SymPy で答えを確かめる）。
- 数は整数か小数（0.25）。負の数は -3。文字は a〜z の1文字（x, y など）。ただし i は虚数単位なので文字として使わない。pi は円周率。
- 演算は + - * / : ^ と ( )。かけ算は必ず * を書く（2x ではなく 2*x、2π は 2*pi）。/ は分数として表示、: は ÷ として表示される。^ は累乗（x^2）。分数の指数はかっこで書く（8^(2/3)、2^(-1)）。
- 関数は sqrt(2)、sin(x)、cos(x)、tan(x)、abs(x)、log(真数, 底)（log(8, 2) = 3）、C(n, k)（組合せ）、P(n, k)（順列）、sum(項, 文字, 初め, 終わり)（sum(k^2, k, 1, 10)）。角は弧度法（sin(pi/6)）。
- 分数の分子・分母が式のときはかっこで囲む（(x + 1)/2）。それ以外の関数や記号（°、√、全角文字）は使わない。
問題の形式 kind は次のどれか。使うフィールドだけ書き、使わない given は null にする。
- "calc": question の値。given があれば代入して計算（例 "x = 3"）。
- "expand": question を展開・整理した式を選ぶ。正解の choice は展開した形。
- "transform": question と等しい式を選ぶ（三角関数の合成など）。
- "factor": question を因数分解した式を選ぶ。正解の choice は積の形。
- "solve": question は方程式（"2*x + 3 = 7"、連立は ; 区切り）。choices は解: 文字が1つなら値をコンマ区切り（"-2, 5"）、虚数解は i を使う（"-1 + 2*i, -1 - 2*i"）、連立なら "x = 1, y = 2"。
- "remainder": question を divisor（"x - 2" など）で割った余り。
- "derivative": question を x で微分した式。given（"x = 1"）があればその点での微分係数（値）。
- "tangent": 曲線 y = question の given（"x = 1"）における接線。choices は "y = 2*x - 1" の形。
- "extremum": 関数 question の極大値（which: "max"）または極小値（which: "min"）。対象の極値はちょうど1つにする。
- "integral": question の不定積分（積分定数なし）。bounds（"0, 2"）があればその定積分の値。
- "area": 曲線 y = question と x 軸（"f; g" なら2曲線）、直線 x = a, x = b（bounds "a, b"）で囲まれた部分の面積。
- "term": question は数列の初めの項をコンマ区切りで3つ以上（"3, 7, 11, 15"）、progression は "arithmetic"（等差）か "geometric"（等比）。given（"n = 10"）があれば第 n 項の値、null なら一般項 a_n（n の式、"4*n - 1"、"3*2^(n - 1)"）。
- "series": term と同じ形で、初項から第 n 項までの和。given（"n = 10"）があればその値、null なら S_n（n の式）。
- "radian": question は度数の数（"150"）。答えは弧度法の式（"5*pi/6"）。"degree": question は弧度（"5*pi/6"）、答えは度数の数（"150"）。
- "recurrence": question は "初項; 次の項の式"（"2; 3*a - 1" は a_1 = 2、a_(n+1) = 3a_n - 1。文字 a が前の項、n も使える）。given が "n = 5" なら第5項の値、null なら一般項 a_n（n の式、"(3^n + 1)/2" など）。
- "distribution": which で種類を決める。"mean"/"variance": question は "値1, 値2, 値3; 確率1, 確率2, 確率3"（確率の和は1）で期待値・分散。"binomialMean"/"binomialVariance": question は "n, p"（"12, 1/3"）で二項分布 B(n, p) の期待値・分散。"binomialProb": question は "n, p"、given は "k = 2"、ちょうど k 回の確率。"zscore": question は "x, m, s"（"76, 60, 8"）で正規分布 N(m, s^2) のとき X = x を標準化した値。
- "geometry" の which には locus-equidistant（question "x1, y1; x2, y2"、2点から等しい距離にある点 P の軌跡の方程式）と locus-ratio（question "x1, y1; x2, y2; m, n"、PA : PB = m : n となる点 P の軌跡の方程式。m ≠ n）もある。choices は "x + y = 3" のように 左辺 = 右辺 の方程式。
- "geometry": which で種類を決める。"line-two-points": question "x1, y1; x2, y2" の2点を通る直線（choices は "y = 3*x - 1"）。"line-slope": "x1, y1; 傾き" の点を通る直線。"line-parallel"/"line-perpendicular": "f; x1, y1"（直線 y = f に平行/垂直で点を通る直線）。"circle-center": "cx, cy; r" の円の方程式（choices は "(x - 2)^2 + (y + 3)^2 = 25" の形）。"circle-diameter": "x1, y1; x2, y2" を直径の両端とする円の方程式。"distance": "a, b, c; px, py" の点と直線 ax + by + c = 0 の距離（値）。直線は垂直にならないものだけ。
- "identity": question は x についての等式で未知の定数（a, b, c など）を含む（"a*(x + 1) + b*(x - 2) = 3*x + 3"）。choices は恒等式になる定数の組（"a = 3, b = 0"）。
- "inequality": which で種類を決める。"amgm-min": question は x の式（"x + 4/x"）、x > 0 のときの最小値。"amgm-equal": 同じ式で最小になる x の値。"product-sum": question は正の数 k（"16"）、a > 0, b > 0, ab = k のときの a + b の最小値。式は x > 0 でちょうど1つの最小値をもつ相加・相乗平均型（"x + 9/x"、"2*x + 8/x"、"x + 1/x + 2"）にする。
- "induction": 数学的帰納法で "g(1) + ... + g(n) = f(n)" を示す場面。question は "g; f"（g は k の式、f は n の式。例 "k*(k + 1); n*(n + 1)*(n + 2)/3"）。等式は実際に成り立つものにする（f(1) = g(1) かつ f(k) + g(k + 1) = f(k + 1)）。which: "base" は n = 1 の左辺の値、"add" は n = k のとき n = k + 1 で左辺に加わる項 g(k + 1)（k の式）、"target" は n = k + 1 のときの右辺 f(k + 1)（k の式）、"combine" は仮定を使って左辺を計算した結果（f(k + 1) を因数分解などで整理した形、k の式）。
- "inference": which で種類を決める。"mean-interval": question は "標本平均, 母標準偏差, n"（"50, 10, 100"）、given は "z = 1.96"（95%）などで、母平均の信頼区間 [x - z*s/sqrt(n), x + z*s/sqrt(n)]。choices は "48.04, 51.96" の形（小さい方, 大きい方）。"ratio-interval": question は "標本比率, n"（"0.4, 600"）、given は "z = 1.96"、母比率の信頼区間 p ± z*sqrt(p*(1 - p)/n)。"test-z": question は "標本平均, 帰無仮説の母平均, 母標準偏差, n"（"52, 50, 10, 100"）、検定統計量 Z = (x - m)/(s/sqrt(n))（given は null）。答えは有限小数か分数で表せる値になる数を選ぶ。
- "region": question は "左辺; 右辺; 不等号"（"x + 2*y; 4; >="、不等号は < > <= >=）。which "in" は領域に含まれる点、"out" は含まれない点を選ぶ。choices は点 "x, y"（"1, 2"）。"in" は4点のうちちょうど1つだけ領域に含まれ、"out" はちょうど1つだけ含まれない。境界線上の点は不等号が < か > のときは含まれない。
- "graph": 学習者がグラフを見て答える問題。question は描かれるグラフの元の式（学習者には表示されない）。which: "line"（question は一次式 "2*x - 1"、choices は "y = 2*x - 1" の形）、"parabola"（二次式、choices は "y = ..."、頂点と少なくとも3つの格子点が -6〜6 の範囲に入る）、"vertex"（二次式、choices は頂点 "1, -4"）、"circle"（question は "cx, cy; r"（整数の中心と半径）、choices は "(x - 1)^2 + (y + 2)^2 = 9" の形）、"region"（question は "y; g(x); 不等号" か "x^2 + y^2; r2; 不等号"、choices は同じ形の不等式 "y; x^2 - 1; >"、4つは互いに異なる領域）、"trig"（question は sin か cos を使った式 "2*sin(x)"、"cos(2*x)"、"sin(x) + 1"、choices は "y = ..."）。座標の範囲は x, y とも -6〜6（trig は x が -2π〜2π、y が -3〜3）に収まるようにし、傾き・頂点などが格子点にのる整数にする。誤答は符号、係数、平行移動の取り違えから作る。
- "number": which で種類を決める（すべて自然数）。"gcd"/"lcm": question は "12, 18"（2〜3個）で最大公約数・最小公倍数。"divisor-count": question は "24" で約数の個数。"nth-multiple": question は "7, 5"（7の倍数の小さい方から5番目、答えは35）。"prime-factorization": question は "120"、choices は素数だけの積 "2^3 * 3 * 5"（4つとも素数の積で、値は互いに異なる）。"round-ones|ten|hundred|thousand|tenth|hundredth": question は四捨五入する数（"3456"、"2.45"）で、位はその名前の位まで。"estimate": question は "398 * 52"（+ - * のどれか、整数2つ）で、各数を上から1けたに四捨五入してから計算した値。"scientific": question は "35000" や "0.00042"、choices は "3.5 * 10^4"、"4.2 * 10^(-4)" の形（a は1以上10未満、値は互いに異なる）。"to-improper": question は帯分数 "2 + 3/5"、style "mixed"、choices は仮分数 "13/5"。"to-mixed": question は仮分数 "17/5"、style "mixed"、choices は帯分数 "3 + 2/5"（分数部分は真分数）。
- "stat": which "median"（中央値）/"range"（範囲）/"mode"（最頻値、ちょうど1つで2回以上）。question は "3, 8, 5, 8, 2"（データを3〜9個コンマ区切り）。
- "function": which で種類を決める。"proportion"/"inverse": question は "x0, y0"（x = x0 のとき y = y0）、choices は "y = 3*x"（比例）・"y = 12/x"（反比例）。"slope"/"intercept"/"xintercept": question は一次式 "3*x + 2"（y = 3x + 2 のグラフ）、答えは傾き・y切片・x切片の数。"rate": question は "x^2; 1, 3"（関数; a, b）で、x が a から b まで増加するときの変化の割合。"intersect-lines": question は "2*x + 1; -x + 4"（2直線）、choices は交点 "1, 3"（x, y）。"intersect-parabola": question は "x^2; 2*x + 3"（放物線; 直線）、choices は交点の x 座標 "-1, 3"（小さい順の2つ）。"rewrite": question は "2*x + y = 5"、y について解いた "y = -2*x + 5" を選ぶ。
- "rearrange": 等式を which の文字について解く。question は "3*a + 2*b = 12"、which は "a"、choices は "(12 - 2*b)/3" のような式（その文字の一次式であること）。
- style（描き方）: "box"（文字 x を □ で表示、「□にあてはまる数」）、"ratio"（: を比の記号として表示、比例式 "x : 4 = 6 : 8"）、"mixed"（帯分数の表示）、"times"（かけ算の × を省略しない、小6）。必要な問題にだけ書く。
- "inequality" の which "solve": question は "不等式の左辺; 右辺; 不等号"（"3*x - 5; 4; >"、"abs(x - 2); 3; <"、"x^2 - 5*x + 6; 0; >"。不等号は < > <= >=）。choices は解を「関係の連なり」で書く: "x > 3"、"-1 < x < 5"、"x <= 2, x >= 3"（2つの範囲はコンマ区切り）。文字は x だけ。steps は境界の等式（"3*x - 5 = 4"、"3*x = 9"、"x = 3"）で、不等号は steps に書かない。
- "quadratic": which "discriminant"（question は x の二次式 "x^2 - 6*x + 5"、= 0 の方程式として表示、答えは判別式 D の値）、"root-count"（異なる実数解の個数 0/1/2）、"krange"（question は k を含む "x^2 - 6*x + k"、異なる2つの実数解をもつ k の範囲を "k < 9" の形で答える）、"max"/"min"（question は "-x^2 + 4*x; 0, 3" 関数; 定義域の下端, 上端、その範囲での最大値・最小値）、"max-all"/"min-all"（question は "-x^2 + 4*x"、上に凸なら max-all、下に凸なら min-all）。
- "triangle": which "sin"/"cos"/"tan"（question は "3, 4"：∠C = 90°、BC = 3、CA = 4 のときの sin A などで、斜辺が整数になる組）、"sine-law"（question は "a, A, B" を度数で "4, 30, 45"、辺 b の長さ）、"cosine-side"（"a, b, C" を "3, 5, 60"、辺 c の長さ）、"cosine-cos"（"a, b, c" を "3, 5, 7"、cos C の値）、"triangle-area"（"a, b, C" を "4, 6, 30"、面積）。角は 30, 45, 60, 90, 120, 135, 150 度から選ぶ。答えは根号をふくむ正確な値。
- "stat" の which "variance"/"std"（question はデータの並び "2, 4, 6, 8"、平均がわかりやすい整数のもの）、"correlation"（question は "x のデータ; y のデータ" を各3〜6個、例 "1, 2, 3, 4; 3, 5, 7, 9"。相関係数がきれいな値（±1 や簡単な分数・根号）になる組）。
- "number" の which に "euclid"（question は "1071, 462" のような3けた以上の2数、最大公約数）、"diophantine"（question は "3, 5, 1" で 3x + 5y = 1、choices は整数解 "2, -1" の形で、4つのうちちょうど1つだけが解）、"to-base"（question は "45, 2"、10進数を n 進数の数字の並び "101101" で答える。choices は数字だけ）、"from-base"（question は "1011, 2"、n 進数を10進数にする）、"remainder"（question は "17, 5"、17 を 5 で割ったあまり）、"power-mod"（question は "7, 100, 5"、7 の 100 乗を 5 で割ったあまり）。
choices は数学的に互いに異なる4つで、正解は1つだけ。分数は約分した形で書く。正解だけ書式が異なるなどの手がかりを作らない。answerIndex（0始まり）は0〜3をばらけさせる。
出力形式: {"problems":[{"kind":"calc","question":"2/3 + 1/4","given":null,"choices":["11/12","3/7","3/12","5/6"],"answerIndex":0}]}
term の例: {"kind":"term","progression":"arithmetic","question":"3, 7, 11, 15","given":"n = 10","choices":["39","43","40","35"],"answerIndex":0}
remainder の例: {"kind":"remainder","question":"x^3 - 2*x + 1","divisor":"x - 2","given":null,"choices":["5","1","-3","9"],"answerIndex":0}
解説 steps: 途中式を1〜6行の配列で必ず付ける。各行は "a = b = c" の形（= でつないだ式の連なり）で、文章は書かない。
- 計算・展開・因数分解・変形・微分・剰余・定積分・面積・数列: 各行の式はすべて正解と等しい値・式にする（例 "2/3 + 1/4 = 8/12 + 3/12 = 11/12"、剰余は "2^3 - 4*2 + 1 = 1"）。不定積分は各式の微分が被積分関数になるようにする。
- solve: 各行は解が満たす式。1行の中で解が複数のときは "x = 2, x = -2" のようにコンマで並べる（"x = 2" だけの行は解が2つあるとき不可）。
- tangent: 各行は接線上で成り立つ式（"3*2^2 - 3 = 9"、"y - 2 = 9*(x - 2)"）。
- extremum: 各行はどれかの極値の点で成り立つ式（"3*x^2 - 3 = 0"、"x = 1"、"1^3 - 3*1 = -2"）。
- recurrence: 各行の式は数列の項の値（"3*2 - 1 = 5"）か、一般項に等しい式。distribution・radian・degree・geometry の distance: 各行の式はすべて答えと等しい値。geometry の直線・円: 各行は直線・円上で成り立つ式（"y - 2 = 3*(x - 1)"、"(x - 2)^2 + (y + 3)^2 = 5^2 = 25"）。identity: 各行は解の定数を代入すると成り立つ式（"a + b = 3" など）。
- region・inference: 各行は数だけの計算（"1 + 2*2 = 5"、"10/sqrt(100) = 1"）。inequality の amgm-equal: 各行は最小になる x で成り立つ式（"x = 4/x"、"x^2 = 4"、"x = 2"）。それ以外の inequality・induction: 各行の式はすべて答えと等しい式。geometry の locus: 各行は軌跡上で成り立つ式（"(x - 1)^2 + y^2 = 4"など）。
- graph の line・parabola・trig: 各行は曲線上で成り立つ式（"y = (x - 1)^2 - 4"、"-3 = 0^2 - 2*0 - 3"）。vertex・region: 各行は数だけの計算。circle: 各行は円上で成り立つ式。
- number・stat・function の rate/slope/intercept/xintercept: 各行は数だけの計算 "398 * 52" ではなく "400 * 50 = 20000" のように = でつないだ数の式（各行の中の式は互いに等しい）。function の proportion/inverse/rewrite: 各行は y の式で成り立つ式（"y = a*x"、"6 = a*2" は不可、"y = 3*x"）。intersect-*: 交点の x で成り立つ式（"2*x + 1 = -x + 4"、"3*x = 3"、"x = 1"）。rearrange: 解いた式に置き換えたとき成り立つ式（"3*a = 12 - 2*b"）。
- inequality の solve・quadratic の krange: 各行は境界で成り立つ等式（"3*x - 5 = 4"、"x = 3"、"36 - 4*k = 0"）。triangle・quadratic の他・stat の variance/std/correlation・number の euclid/remainder など: 各行は数だけの計算 "1071 = 462*2 + 147" のように = でつないだ数の式。
- 最後の行は答えで終える。途中で近似や省略をしない。
出力に steps を含める: {"kind":"calc","question":"2/3 + 1/4","given":null,"steps":["2/3 + 1/4 = 8/12 + 3/12 = 11/12"],"choices":["11/12","3/7","3/12","5/6"],"answerIndex":0}
