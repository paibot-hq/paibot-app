check.expr で使えるもの: 数・リスト [..]・四則演算（+ - * / ** // %）・次の関数・定数 pi, e, inf。変数や属性、文字列は使えない。
  mean(xs), median(xs), mode(xs), var(xs)（n で割る）, svar(xs)（n−1 で割る）, std(xs), sstd(xs), cov(xs, ys), corr(xs, ys), quantile(xs, q)（線形補間）, zscore(x, mu, sigma),
  dot(a, b), norm(v, p=2), dist(a, b, p=2), cosine(a, b), matmul(A, B), det(A), trace(A), eig2(A)（2×2 の固有値、大きい順のリスト）,
  entropy(p, base=2), cross_entropy(p, q, base=e), kl(p, q, base=e), js(p, q, base=e),
  sigmoid(x), softmax(xs, i, t=1)（i 番目（0始まり）の出力）, relu(x), leaky_relu(x, a=0.01), gelu(x), tanh(x),
  bce(y, p, base=e), mse(ys, ps), rmse(ys, ps), mae(ys, ps), precision(tp, fp), recall(tp, fn), f1(tp, fp, fn), accuracy(tp, tn, fp, fn),
  auc(scores, labels), iou(boxA, boxB)（[x1, y1, x2, y2]）, perplexity(probs), gini(p),
  conv_out(n, k, p=0, s=1, d=1), conv_params(cin, cout, kh, kw=None, bias=True), dense_params(nin, nout, bias=True),
  binom_pmf(n, k, p), poisson_pmf(lam, k), normal_pdf(x, mu=0, sigma=1), normal_cdf(x, mu=0, sigma=1), discounted(rewards, gamma),
  sqrt, exp, log(x, base)（底を省くと自然対数）, log2, log10, abs, min, max, sum, round, floor, ceil, comb, perm, factorial, len, pow
この項目は計算の項目なので、例題の少なくとも2題は答えが数になる計算例にし、check を付ける。
