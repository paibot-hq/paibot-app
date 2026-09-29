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
choices は数学的に互いに異なる4つで、正解は1つだけ。分数は約分した形で書く。正解だけ書式が異なるなどの手がかりを作らない。answerIndex（0始まり）は0〜3をばらけさせる。
出力形式: {"problems":[{"kind":"calc","question":"2/3 + 1/4","given":null,"choices":["11/12","3/7","3/12","5/6"],"answerIndex":0}]}
term の例: {"kind":"term","progression":"arithmetic","question":"3, 7, 11, 15","given":"n = 10","choices":["39","43","40","35"],"answerIndex":0}
remainder の例: {"kind":"remainder","question":"x^3 - 2*x + 1","divisor":"x - 2","given":null,"choices":["5","1","-3","9"],"answerIndex":0}
