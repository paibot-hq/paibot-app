グラフ: {"graph": {"view": {"x": [-3, 5], "y": [-3, 8]}, "curves": [...], "points": [...], "region": {...}}}
- view は表示する範囲（x と y の [小さい方, 大きい方]）。省略すると x も y も -6〜6。目盛りは整数で自動。三角関数では "pi": true を足すと x の目盛りが π/2 刻みになる。曲線・点がすべて範囲に入るようにする。
- curves は最大4本。次のどれか1つのキーで書く。式は式の書き方（上の文法。exp(x)、ln(x) も使える）。
  - {"y": "x^2 - 2*x"}: y = f(x) のグラフ。
  - {"x": "3"}: y 軸に平行な直線 x = 3。漸近線などに破線で使う。
  - {"implicit": "x^2 + y^2 = 4"}: x と y の方程式の曲線（円・楕円・双曲線・y^2 = 4*x など）。"左辺 = 右辺" の形。
  どの曲線にも "label"（図の中に書く名前）、"labelAt"（名前を置く x。省略可）、"dashed": true（破線）を付けられる。式の名前は読む人向けの書き方でよい（"y = x² − 2x"、"y = 2x + 1"、"x² + y² = 4"）が、曲線の式と同じにする（SymPy が一致を確かめる。違うと不合格）。
- points は最大8個: {"x": 1, "y": -1, "label": "(1, −1)", "on": [0]}。on はその点が通る曲線の番号（curves の何番目か、0 から）で、点が本当に曲線の上にあるか SymPy が確かめる。座標を label に書くなら点の座標と同じにする（"A(2, 1)"）。label を省略すると点だけを打つ。"hollow": true で白抜きの点（端点を含まないとき）。
- region は色をぬる領域: {"lhs": "y", "op": ">", "rhs": "x^2 - 4"}（op は < > <= >=。x と y の式）。境界の曲線は別に curves に書く（含まないなら dashed）。
- 例: 2点を通る直線 {"graph": {"view": {"x": [-1, 6], "y": [-7, 9]}, "curves": [{"y": "3*x - 5", "label": "y = 3x − 5", "labelAt": 0.2}], "points": [{"x": 2, "y": 1, "label": "A(2, 1)", "on": [0]}, {"x": 4, "y": 7, "label": "B(4, 7)", "on": [0]}]}, "caption": {...}}
図形（shape と numbers の順）。これ以外の shape は使わない:
- 長方形 rect-area: 横, 縦。三角形 tri-area: 底辺, 高さ。平行四辺形 para-area: 底辺, 高さ。台形 trap-area: 上底, 下底, 高さ。
- 直方体 cuboid-volume: 横, 奥行き, 高さ。立方体 cube-edge-total: 1辺。三角柱 prism-volume: 底面の底辺, 底面の高さ, 柱の高さ。円柱 cylinder-volume: 半径, 高さ。円錐 cone-volume: 半径, 高さ。球 sphere-volume: 半径。
- 円 circle-area: 半径, 円周率（3.14 など。中学では省略）。おうぎ形 sector-area: 半径, 中心角。円柱の展開図 net-cylinder: 半径, 高さ。直方体の展開図 net-cuboid: 縦, 横, 高さ。
- 三角形の角 angle-triangle: 角, 角（残りが x）。四角形の角 angle-quad: 角, 角, 角（残りが x）。二等辺三角形 isosceles-base: 頂角（底角 x）、isosceles-apex: 底角（頂角 x）。多角形 polygon-interior-sum: 角の数。正多角形 polygon-each-interior / polygon-exterior: 角の数。
- 平行線と角: parallel-vertical（対頂角）・parallel-corresponding（同位角）・parallel-alternate（錯角）・parallel-cointerior（同側内角）: 与えられた角の大きさ（1つ。求める角が x）。
- 円と角: inscribed-angle: 中心角（円周角 x）。inscribed-same-arc: 円周角（同じ弧の円周角 x）。inscribed-diameter: 角 CAB（直径に対する角を使って ∠ABC = x）。power-chord: PA, PB, PC（PD = x）。
- 相似 similar-side: AB, DE, BC（EF = x）。similar-area: 対応する辺2つ, 小さい方の面積。合同 congruent-side: AB, BC, CA, 求める辺（0=DE, 1=EF, 2=FD）。
- 座標: distance: x1, y1, x2, y2（2点）。centroid: 3点の x, y（6つ）。move-translate: x, y, 右へ, 上へ。move-reflect-x / move-reflect-y / move-rotate90 / move-rotate180: x, y。
- 統計: bar-total: 5つの値の棒グラフ。line-change: 折れ線グラフの値（複数）。pie-count: 全体, 4つの割合（%）。box-range: 最小, Q1, 中央値, Q3, 最大。hist-above: 5つの度数, 階級の番号。
- そのほか: clock-read: 時, 分。fraction-shaded: 等分の数, ぬった数。triangle-type: 3辺。protractor: 角1, 角2。lines-of-symmetry: 正多角形の角の数。
