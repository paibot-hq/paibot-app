計算の問題（check を必ず付ける）:
- 答えが1つの数になる問題にする。各問題に check を付ける。
  - expr: 答えを計算する式。使えるのは数・リスト [..]・四則演算（+ - * / ** // %）・下の関数・定数 pi, e, inf だけ。変数や属性、文字列は使えない。
  - values: 4つの選択肢それぞれが表す数（選択肢の順）。選択肢の文に書いた数と同じ値にする（"$\frac{1}{4}$" なら 0.25、"25%" なら 0.25）。
  - tol: 選択肢を四捨五入したときの許容幅。小数第2位まで書くなら 0.005、第3位なら 0.0005、ちょうどの値なら 0。
  - expr の値と tol の範囲で一致する values はちょうど1つで、それが answerIndex の選択肢であること。誤りの選択肢は、正解と tol より十分離れた値にする。
- 選択肢は数（と単位）だけにする。分数は $\frac{a}{b}$、指数表記は $2.5 \times 10^{-3}$ のように書ける。
- 関数（分散・標準偏差は var/std が母集団（n で割る）、svar/sstd が標本（n−1 で割る））:
  mean(xs), median(xs), mode(xs), var(xs), svar(xs), std(xs), sstd(xs), cov(xs, ys)（母集団）, corr(xs, ys), quantile(xs, q)（線形補間）, zscore(x, mu, sigma),
  dot(a, b), norm(v, p=2), dist(a, b, p=2), cosine(a, b), matmul(A, B), det(A), trace(A), eig2(A)（2×2 の固有値、大きい順のリスト）,
  entropy(p, base=2), cross_entropy(p, q, base=e), kl(p, q, base=e), js(p, q, base=e),
  sigmoid(x), softmax(xs, i, t=1)（i 番目（0始まり）の出力）, relu(x), leaky_relu(x, a=0.01), gelu(x), tanh(x),
  bce(y, p, base=e), mse(ys, ps), rmse(ys, ps), mae(ys, ps), precision(tp, fp), recall(tp, fn), f1(tp, fp, fn), accuracy(tp, tn, fp, fn),
  auc(scores, labels), iou(boxA, boxB)（[x1, y1, x2, y2]）, perplexity(probs), gini(p),
  conv_out(n, k, p=0, s=1, d=1), conv_params(cin, cout, kh, kw=None, bias=True), dense_params(nin, nout, bias=True),
  binom_pmf(n, k, p), poisson_pmf(lam, k), normal_pdf(x, mu=0, sigma=1), normal_cdf(x, mu=0, sigma=1), discounted(rewards, gamma),
  sqrt, exp, log(x, base)（底を省くと自然対数）, log2, log10, abs, min, max, sum, round, floor, ceil, comb, perm, factorial, len, pow
  リストの要素は [1, 2, 3][0] のように取り出せる。
- 計算だけでなく、計算の意味を問う形（「この値が大きいほど何を意味するか」）を混ぜてもよいが、その場合も答えは数にして check を付ける。数にならない問いはこの項目では書かない。
