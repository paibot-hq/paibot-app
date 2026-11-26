// Goal-driven learning roadmaps and cross-subject dependency links connecting
// /math, /ai-ds, and interactive Lab tools.

export type LocalizedText = { ja: string; en: string; zh: string };

export type LearnNodeKind = 'math' | 'ai-ds' | 'lab';

export interface LearnNode {
  id: string; // e.g. 'math:derivative/chain-rule', 'ai-ds:arch/transformer', 'lab:gradient-descent'
  kind: LearnNodeKind;
  href: string;
  title: LocalizedText;
  role: LocalizedText; // Why this node matters in the bigger picture
}

export interface RoadmapStage {
  id: string;
  title: LocalizedText;
  summary: LocalizedText;
  nodes: readonly string[]; // LearnNode['id']
}

export interface LearnRoadmap {
  id: string;
  badge: LocalizedText;
  title: LocalizedText;
  description: LocalizedText;
  stages: readonly RoadmapStage[];
}

export interface LearnEdge {
  from: string;
  to: string;
  why: LocalizedText;
}

export const LEARN_NODES: Record<string, LearnNode> = {
  // Math foundations
  'math:linear-function/slope': {
    id: 'math:linear-function/slope',
    kind: 'math',
    href: '/math/linear-function/slope',
    title: { ja: '一次関数と傾き', en: 'Linear Functions & Slope', zh: '一次函数与斜率' },
    role: {
      ja: 'y = wx + b は線形回帰・ニューロン1個の式そのもの。AI の出発点',
      en: 'y = wx + b is the exact equation of linear regression and a single neuron',
      zh: 'y = wx + b 正是线性回归与单个神经元的公式，是 AI 的起点',
    },
  },
  'math:sequence/sigma': {
    id: 'math:sequence/sigma',
    kind: 'math',
    href: '/math/sequence/sigma',
    title: { ja: 'シグマ（Σ）の計算', en: 'Sigma Notation (Σ)', zh: '求和符号（Σ）' },
    role: {
      ja: '内積・平均・損失関数・Softmax まで AI の論文で最も頻繁に出る総和記号',
      en: 'Summation notation appearing everywhere from dot products to loss functions',
      zh: '从点积、均值到损失函数，AI 论文中出现最频繁的求和符号',
    },
  },
  'math:derivative/polynomial': {
    id: 'math:derivative/polynomial',
    kind: 'math',
    href: '/math/derivative/polynomial',
    title: { ja: '微分の基本（傾き）', en: 'Basic Derivatives', zh: '求导基础（斜率）' },
    role: {
      ja: '「どちらに重みを動かせば損失が減るか」を教えてくれる勾配の出発点',
      en: 'Tells you which direction to nudge a weight to reduce loss',
      zh: '告诉你朝哪个方向微调权重才能降低损失，是梯度的起点',
    },
  },
  'math:vector/dot-product': {
    id: 'math:vector/dot-product',
    kind: 'math',
    href: '/math/vector/dot-product',
    title: { ja: 'ベクトルの内積', en: 'Dot Product', zh: '向量点积' },
    role: {
      ja: '2つのベクトルの「向きの近さ」を測る。Attention の Q・K 類似度そのもの',
      en: 'Measures directional similarity — the core of Query-Key scores in Attention',
      zh: '衡量两个向量的方向相似度，是 Attention 中 Q·K 分数的核心',
    },
  },
  'math:matrix/operations': {
    id: 'math:matrix/operations',
    kind: 'math',
    href: '/math/matrix/operations',
    title: { ja: '行列の演算と積', en: 'Matrix Operations', zh: '矩阵运算与乘法' },
    role: {
      ja: '線形変換とバッチ計算の言語。重み行列 W_Q, W_K, W_V の計算を支える',
      en: 'The language of linear layers and projections (W_Q, W_K, W_V)',
      zh: '线性层与投影矩阵（W_Q, W_K, W_V）计算的数学基础',
    },
  },
  'math:matrix/determinant': {
    id: 'math:matrix/determinant',
    kind: 'math',
    href: '/math/matrix/determinant',
    title: { ja: '行列式', en: 'Determinants', zh: '行列式' },
    role: {
      ja: '逆行列の存在や空間の体積変化を判定し、固有値方程式 det(A - λI) = 0 に使う',
      en: 'Tests invertibility and defines the characteristic equation det(A - λI) = 0',
      zh: '判断可逆性并用于特征方程 det(A - λI) = 0',
    },
  },
  'math:eigen/eigenvalues': {
    id: 'math:eigen/eigenvalues',
    kind: 'math',
    href: '/math/eigen/eigenvalues',
    title: { ja: '固有値', en: 'Eigenvalues', zh: '特征值' },
    role: {
      ja: '行列が空間をどの方向に何倍伸ばすかを表す。PCA（主成分分析）や SVD の土台',
      en: 'Shows principal stretch directions — the foundation of PCA and SVD',
      zh: '刻画矩阵的主伸缩方向，是 PCA 和 SVD 的基础',
    },
  },
  'math:exp-log/exponent': {
    id: 'math:exp-log/exponent',
    kind: 'math',
    href: '/math/exp-log/exponent',
    title: { ja: '指数関数', en: 'Exponentials', zh: '指数函数' },
    role: {
      ja: 'スコアを正の重み・確率分布へ変換する Softmax やシグモイド関数の核',
      en: 'Powers Softmax and Sigmoid to turn raw scores into probabilities',
      zh: '驱动 Softmax 和 Sigmoid，将原始分数转化为概率分布',
    },
  },
  'math:exp-log/log': {
    id: 'math:exp-log/log',
    kind: 'math',
    href: '/math/exp-log/log',
    title: { ja: '対数関数', en: 'Logarithms', zh: '对数函数' },
    role: {
      ja: '確率の積を和に変える。情報量・エントロピー・交差エントロピー損失の土台',
      en: 'Turns products of probabilities into sums for entropy and cross-entropy loss',
      zh: '将概率乘积转为求和，是信息熵与交叉熵损失的基础',
    },
  },
  'math:statistics/variance': {
    id: 'math:statistics/variance',
    kind: 'math',
    href: '/math/statistics/variance',
    title: { ja: '分散と標準偏差', en: 'Variance & Std Dev', zh: '方差与标准差' },
    role: {
      ja: '散らばりを抑える √d_k スケーリングや LayerNorm / BatchNorm の意味が腹落ちする',
      en: 'Explains √d_k scaling in Attention and normalization layers (LayerNorm/BatchNorm)',
      zh: '理解 Attention 中 √d_k 缩放以及 LayerNorm / BatchNorm 的关键',
    },
  },
  'math:distributions/normal': {
    id: 'math:distributions/normal',
    kind: 'math',
    href: '/math/distributions/normal',
    title: { ja: '正規分布', en: 'Normal Distribution', zh: '正态分布' },
    role: {
      ja: '重みの初期化（Xavier / He）やノイズ仮定、生成モデル（VAE / 拡散）の基本分布',
      en: 'Used in weight initialization, statistical assumptions, and generative models',
      zh: '用于权重初始化、统计建模及生成模型的基础分布',
    },
  },
  'math:inference/estimation': {
    id: 'math:inference/estimation',
    kind: 'math',
    href: '/math/inference/estimation',
    title: { ja: '統計的推定', en: 'Statistical Estimation', zh: '统计估计' },
    role: {
      ja: '手元の標本から母集団のパラメータを推定する考え方（最尤推定への橋渡し）',
      en: 'Estimates population parameters from samples, bridging to maximum likelihood',
      zh: '由样本估计总体参数，衔接最大似然估计',
    },
  },
  'math:derivative/chain-rule': {
    id: 'math:derivative/chain-rule',
    kind: 'math',
    href: '/math/derivative/chain-rule',
    title: { ja: '合成関数の微分（連鎖律）', en: 'Chain Rule', zh: '复合函数求导（链式法则）' },
    role: {
      ja: '深いニューラルネットの誤差逆伝播法（Backpropagation）を成立させる最重要公式',
      en: 'The core calculus rule that makes backpropagation through deep layers possible',
      zh: '使深层神经网络反向传播成立的最核心微积分法则',
    },
  },
  'math:multivariable/partial': {
    id: 'math:multivariable/partial',
    kind: 'math',
    href: '/math/multivariable/partial',
    title: { ja: '偏微分', en: 'Partial Derivatives', zh: '偏导数' },
    role: {
      ja: '数百万個の重みのうち1つを動かしたとき損失がどう変わるか（勾配ベクトル）を定義する',
      en: 'Defines how loss changes with each individual weight (the gradient vector)',
      zh: '定义单个权重变化对损失的影响，构成梯度向量',
    },
  },

  // Lab interactive experiments
  'lab:gradient-descent': {
    id: 'lab:gradient-descent',
    kind: 'lab',
    href: '/gradient-descent',
    title: { ja: '勾配降下法シミュレーター', en: 'Gradient Descent Lab', zh: '梯度下降模拟器' },
    role: {
      ja: '学習率を変えると収束・振動・発散する様子を動かして体感できる',
      en: 'Interactive experiment to feel how learning rate affects convergence and divergence',
      zh: '交互体验学习率如何影响收敛、震荡与发散',
    },
  },

  // AI-DS: Linear algebra & calculus bridge
  'ai-ds:linalg/matrices': {
    id: 'ai-ds:linalg/matrices',
    kind: 'ai-ds',
    href: '/ai-ds/linalg/matrices',
    title: { ja: 'ベクトルと行列の計算', en: 'Vectors & Matrices for AI', zh: '向量与矩阵计算' },
    role: {
      ja: '内積・ノルム・テンソル積・アダマール積・ランクを機械学習の文脈で整理',
      en: 'Dot products, norms, tensor products, Hadamard product, and rank in ML',
      zh: '在机器学习语境下梳理点积、范数、张量积、哈达玛积与秩',
    },
  },
  'ai-ds:linalg/eigen': {
    id: 'ai-ds:linalg/eigen',
    kind: 'ai-ds',
    href: '/ai-ds/linalg/eigen',
    title: { ja: '固有値と特異値', en: 'Eigenvalues & SVD', zh: '特征值与奇异值' },
    role: {
      ja: '固有値分解・対角化・特異値分解（SVD）が次元削減や低ランク近似（LoRA等）に活きる',
      en: 'Eigendecomposition and SVD behind PCA and low-rank approximations (e.g. LoRA)',
      zh: '支撑 PCA 与低秩近似（如 LoRA）的特征分解与奇异值分解',
    },
  },
  'ai-ds:linalg/gradients': {
    id: 'ai-ds:linalg/gradients',
    kind: 'ai-ds',
    href: '/ai-ds/linalg/gradients',
    title: { ja: '微分と勾配', en: 'Derivatives & Gradients', zh: '微分与梯度' },
    role: {
      ja: '多変数の偏微分・勾配ベクトル・連鎖律をニューラルネットの学習へ直結させる',
      en: 'Connects multivariable gradients and chain rule directly to neural network training',
      zh: '将多元梯度与链式法则直接连接到神经网络训练',
    },
  },
  'ai-ds:linalg/distances': {
    id: 'ai-ds:linalg/distances',
    kind: 'ai-ds',
    href: '/ai-ds/linalg/distances',
    title: { ja: '距離と類似度', en: 'Distances & Similarity', zh: '距离与相似度' },
    role: {
      ja: '埋め込みベクトル比較（コサイン類似度・L1/L2距離・マハラノビス距離）の基礎',
      en: 'Cosine similarity, L1/L2, and Mahalanobis distance for comparing embeddings',
      zh: '用于比较嵌入向量的余弦相似度、L1/L2 与马氏距离',
    },
  },

  // AI-DS: Stats & Info theory
  'ai-ds:stats/probability': {
    id: 'ai-ds:stats/probability',
    kind: 'ai-ds',
    href: '/ai-ds/stats/probability',
    title: { ja: '確率と条件付き確率', en: 'Probability & Conditional Prob.', zh: '概率与条件概率' },
    role: {
      ja: '次トークン予測 P(w_t | w_<t) など条件付き確率モデルを読む基礎',
      en: 'Foundation for conditional models like next-token prediction P(w_t | w_<t)',
      zh: '理解下一词预测 P(w_t | w_<t) 等条件概率模型的基础',
    },
  },
  'ai-ds:stats/bayes': {
    id: 'ai-ds:stats/bayes',
    kind: 'ai-ds',
    href: '/ai-ds/stats/bayes',
    title: { ja: 'ベイズの定理', en: "Bayes' Theorem", zh: '贝叶斯定理' },
    role: {
      ja: '事前分布から観測データで事後確率を更新する（MAP 推定・生成モデルの基礎）',
      en: 'Updates beliefs from data — basis of MAP estimation and probabilistic models',
      zh: '由观测数据更新后验概率，是 MAP 估计与概率模型的基础',
    },
  },
  'ai-ds:stats/distributions': {
    id: 'ai-ds:stats/distributions',
    kind: 'ai-ds',
    href: '/ai-ds/stats/distributions',
    title: { ja: '代表的な確率分布', en: 'Probability Distributions', zh: '常见概率分布' },
    role: {
      ja: 'ベルヌーイ・二項・ポアソン・正規分布の性質と使い分け',
      en: 'Bernoulli, Binomial, Poisson, and Normal distributions in ML',
      zh: '伯努利、二项、泊松与正态分布的性质与应用',
    },
  },
  'ai-ds:info/entropy': {
    id: 'ai-ds:info/entropy',
    kind: 'ai-ds',
    href: '/ai-ds/info/entropy',
    title: { ja: '情報量とエントロピー', en: 'Information & Entropy', zh: '信息量与熵' },
    role: {
      ja: '予測の不確かさを数値化する。決定木や言語モデルのパープレキシティに直結',
      en: 'Quantifies uncertainty — directly tied to decision trees and LLM perplexity',
      zh: '量化不确定性，直接关联决策树与语言模型困惑度',
    },
  },
  'ai-ds:info/cross-entropy': {
    id: 'ai-ds:info/cross-entropy',
    kind: 'ai-ds',
    href: '/ai-ds/info/cross-entropy',
    title: { ja: '交差エントロピーと KL ダイバージェンス', en: 'Cross-Entropy & KL Divergence', zh: '交叉熵与 KL 散度' },
    role: {
      ja: '分類モデルや LLM の学習で最小化する損失関数そのもの',
      en: 'The exact loss function minimized when training classifiers and LLMs',
      zh: '分类器与大语言模型训练时最小化的核心损失函数',
    },
  },

  // AI-DS: ML & Eval
  'ai-ds:ml/linear-regression': {
    id: 'ai-ds:ml/linear-regression',
    kind: 'ai-ds',
    href: '/ai-ds/ml/linear-regression',
    title: { ja: '線形回帰と正則化', en: 'Linear Regression & Regularization', zh: '线性回归与正则化' },
    role: {
      ja: '最小二乗法・Ridge・Lasso を通じて「損失を最小化する学習」の原型を掴む',
      en: 'Grasps loss minimization and L1/L2 regularization on the simplest model',
      zh: '通过最小二乘与正则化掌握“最小化损失”的原型',
    },
  },
  'ai-ds:ml/logistic-regression': {
    id: 'ai-ds:ml/logistic-regression',
    kind: 'ai-ds',
    href: '/ai-ds/ml/logistic-regression',
    title: { ja: 'ロジスティック回帰', en: 'Logistic Regression', zh: '逻辑回归' },
    role: {
      ja: '線形結合＋シグモイド＋交差エントロピー＝1層ニューラルネットの最小形',
      en: 'Linear + Sigmoid + Cross-Entropy — the minimal 1-layer neural network',
      zh: '线性组合 + Sigmoid + 交叉熵，即单层神经网络的最小形式',
    },
  },
  'ai-ds:ml/trees-ensembles': {
    id: 'ai-ds:ml/trees-ensembles',
    kind: 'ai-ds',
    href: '/ai-ds/ml/trees-ensembles',
    title: { ja: '決定木とアンサンブル学習', en: 'Trees & Ensembles', zh: '决策树与集成学习' },
    role: {
      ja: 'ジニ不純度・バギング（RF）・ブースティング（GBDT）の仕組み',
      en: 'Gini impurity, Bagging (Random Forest), and Boosting (GBDT)',
      zh: '基尼不纯度、Bagging 与 Boosting 的原理',
    },
  },
  'ai-ds:ml/dimensionality-reduction': {
    id: 'ai-ds:ml/dimensionality-reduction',
    kind: 'ai-ds',
    href: '/ai-ds/ml/dimensionality-reduction',
    title: { ja: '次元削減（PCA 等）', en: 'Dimensionality Reduction (PCA)', zh: '降维（PCA 等）' },
    role: {
      ja: '固有値・固有ベクトルを使って高次元データから主要成分を抽出する',
      en: 'Applies eigenvalues and eigenvectors to extract principal components',
      zh: '运用特征值与特征向量提取高维数据的主成分',
    },
  },
  'ai-ds:eval/classification-metrics': {
    id: 'ai-ds:eval/classification-metrics',
    kind: 'ai-ds',
    href: '/ai-ds/eval/classification-metrics',
    title: { ja: '混同行列と分類の評価指標', en: 'Classification Metrics', zh: '混淆矩阵与分类指标' },
    role: {
      ja: '適合率・再現率・F1スコアのトレードオフを正確に計算できる',
      en: 'Precision, Recall, and F1 tradeoffs from a confusion matrix',
      zh: '精确率、召回率与 F1 分数的计算与权衡',
    },
  },
  'ai-ds:eval/roc-auc': {
    id: 'ai-ds:eval/roc-auc',
    kind: 'ai-ds',
    href: '/ai-ds/eval/roc-auc',
    title: { ja: 'ROC 曲線と AUC', en: 'ROC Curve & AUC', zh: 'ROC 曲线与 AUC' },
    role: {
      ja: 'しきい値に依存しない分類モデルのランキング性能を評価する',
      en: 'Threshold-independent ranking evaluation for binary classifiers',
      zh: '与阈值无关的二分类排序性能评估指标',
    },
  },
  'ai-ds:eval/overfitting': {
    id: 'ai-ds:eval/overfitting',
    kind: 'ai-ds',
    href: '/ai-ds/eval/overfitting',
    title: { ja: '過学習とバイアス・バリアンス', en: 'Overfitting & Bias-Variance', zh: '过拟合与偏差-方差' },
    role: {
      ja: 'なぜ正則化・ドロップアウト・データ拡張が必要なのかの根本理由',
      en: 'Why regularization, dropout, and data augmentation are necessary',
      zh: '理解为何需要正则化、Dropout 与数据增强的根本原因',
    },
  },

  // AI-DS: Neural Network Core
  'ai-ds:nn/perceptron': {
    id: 'ai-ds:nn/perceptron',
    kind: 'ai-ds',
    href: '/ai-ds/nn/perceptron',
    title: { ja: 'パーセプトロンと多層化', en: 'Perceptron & MLP', zh: '感知机与多层网络' },
    role: {
      ja: 'Transformer の FFN（Feed-Forward Network）にもそのまま入る基本ブロック',
      en: 'The MLP building block also used inside every Transformer FFN layer',
      zh: '也是 Transformer 中每个 FFN 层所使用的基础模块',
    },
  },
  'ai-ds:nn/activations': {
    id: 'ai-ds:nn/activations',
    kind: 'ai-ds',
    href: '/ai-ds/nn/activations',
    title: { ja: '活性化関数', en: 'Activation Functions', zh: '激活函数' },
    role: {
      ja: 'ReLU・GELU・Softmax の性質と微分。非線形性と確率出力を与える',
      en: 'ReLU, GELU, and Softmax — giving networks nonlinearity and probabilities',
      zh: 'ReLU、GELU 与 Softmax，提供非线性表达与概率输出',
    },
  },
  'ai-ds:nn/losses': {
    id: 'ai-ds:nn/losses',
    kind: 'ai-ds',
    href: '/ai-ds/nn/losses',
    title: { ja: '損失関数', en: 'Loss Functions', zh: '损失函数' },
    role: {
      ja: 'モデルの予測と正解のズレを1つのスカラーにして最適化の目標を定める',
      en: 'Turns prediction error into a scalar objective to minimize',
      zh: '将预测误差量化为标量目标以驱动优化',
    },
  },
  'ai-ds:nn/backpropagation': {
    id: 'ai-ds:nn/backpropagation',
    kind: 'ai-ds',
    href: '/ai-ds/nn/backpropagation',
    title: { ja: '誤差逆伝播法', en: 'Backpropagation', zh: '反向传播' },
    role: {
      ja: '連鎖律を計算グラフに適用し、全パラメータの勾配を一気に求める仕組み',
      en: 'Applies the chain rule on computation graphs to compute all parameter gradients',
      zh: '将链式法则应用于计算图，一次性求出所有参数梯度',
    },
  },
  'ai-ds:nn/optimizers': {
    id: 'ai-ds:nn/optimizers',
    kind: 'ai-ds',
    href: '/ai-ds/nn/optimizers',
    title: { ja: '最適化手法（SGD / Adam）', en: 'Optimizers (SGD / Adam)', zh: '优化方法（SGD / Adam）' },
    role: {
      ja: '求めた勾配で重みをどう更新するか。Transformer 学習の定番 Adam / AdamW まで',
      en: 'How gradients update weights — from SGD to Adam used in Transformers',
      zh: '如何用梯度更新权重，从 SGD 到 Transformer 常用的 Adam',
    },
  },
  'ai-ds:nn/initialization': {
    id: 'ai-ds:nn/initialization',
    kind: 'ai-ds',
    href: '/ai-ds/nn/initialization',
    title: { ja: '重みの初期化', en: 'Weight Initialization', zh: '权重初始化' },
    role: {
      ja: 'Xavier / He 初期化で、深い層の勾配消失・爆発を防ぐ',
      en: 'Xavier and He initialization to preserve variance across deep layers',
      zh: '通过 Xavier / He 初始化保持深层方差稳定',
    },
  },
  'ai-ds:nn/regularization': {
    id: 'ai-ds:nn/regularization',
    kind: 'ai-ds',
    href: '/ai-ds/nn/regularization',
    title: { ja: '正則化とドロップアウト', en: 'Regularization & Dropout', zh: '正则化与 Dropout' },
    role: {
      ja: 'Weight Decay や Dropout で過学習を抑え汎化性能を高める',
      en: 'Weight decay and Dropout to prevent overfitting in deep models',
      zh: '通过权重衰减和 Dropout 防止深度模型过拟合',
    },
  },
  'ai-ds:nn/normalization': {
    id: 'ai-ds:nn/normalization',
    kind: 'ai-ds',
    href: '/ai-ds/nn/normalization',
    title: { ja: '正規化（BatchNorm / LayerNorm）', en: 'Normalization (BN / LN)', zh: '归一化（BN / LN）' },
    role: {
      ja: 'CNN の BatchNorm、Transformer の LayerNorm の違いと役割を理解する',
      en: 'Why CNNs use BatchNorm while Transformers rely on LayerNorm',
      zh: '理解为何 CNN 使用 BatchNorm 而 Transformer 依赖 LayerNorm',
    },
  },

  // AI-DS: Architectures (CNN, RNN, Transformer)
  'ai-ds:arch/convolution': {
    id: 'ai-ds:arch/convolution',
    kind: 'ai-ds',
    href: '/ai-ds/arch/convolution',
    title: { ja: '畳み込み（CNN）', en: 'Convolution (CNN)', zh: '卷积（CNN）' },
    role: {
      ja: 'フィルタ・パディング・ストライドの出力サイズとパラメータ数計算（E資格超頻出）',
      en: 'Filters, padding, stride, output size and parameter counts in CNNs',
      zh: '卷积核、填充、步幅的输出尺寸与参数量计算',
    },
  },
  'ai-ds:arch/pooling': {
    id: 'ai-ds:arch/pooling',
    kind: 'ai-ds',
    href: '/ai-ds/arch/pooling',
    title: { ja: 'プーリング', en: 'Pooling', zh: '池化' },
    role: {
      ja: 'Max / Average / Global Average Pooling で空間サイズを圧縮し位置ずれ耐性を得る',
      en: 'Spatial downsampling and translation invariance via Max / Avg / GAP',
      zh: '通过最大/平均/全局平均池化压缩空间尺寸并增强平移不变性',
    },
  },
  'ai-ds:arch/skip-connections': {
    id: 'ai-ds:arch/skip-connections',
    kind: 'ai-ds',
    href: '/ai-ds/arch/skip-connections',
    title: { ja: 'スキップ結合（ResNet・残差接続）', en: 'Skip Connections (ResNet)', zh: '跳跃连接（残差连接）' },
    role: {
      ja: 'y = F(x) + x で勾配の近道を作る。ResNet だけでなく Transformer の全ブロックに必須',
      en: 'y = F(x) + x creates gradient highways — essential in both ResNet and Transformer',
      zh: 'y = F(x) + x 构建梯度直通路径，是 ResNet 与 Transformer 的必备结构',
    },
  },
  'ai-ds:arch/rnn': {
    id: 'ai-ds:arch/rnn',
    kind: 'ai-ds',
    href: '/ai-ds/arch/rnn',
    title: { ja: 'RNN と BPTT', en: 'RNN & BPTT', zh: 'RNN 与 BPTT' },
    role: {
      ja: '系列データを順に処理する仕組みと、並列化できない・長期依存が消える限界を知る',
      en: 'Sequential hidden states, BPTT, and why long-range dependencies vanish',
      zh: '理解序列循环处理、BPTT 及其无法并行与梯度消失的局限',
    },
  },
  'ai-ds:arch/lstm-gru': {
    id: 'ai-ds:arch/lstm-gru',
    kind: 'ai-ds',
    href: '/ai-ds/arch/lstm-gru',
    title: { ja: 'LSTM と GRU', en: 'LSTM & GRU', zh: 'LSTM 与 GRU' },
    role: {
      ja: '忘却・入力・出力ゲートとセル状態で長期記憶を保つ仕組み',
      en: 'Gating mechanisms and cell states that mitigate vanishing gradients',
      zh: '通过门控机制与细胞状态保持长期记忆',
    },
  },
  'ai-ds:arch/attention': {
    id: 'ai-ds:arch/attention',
    kind: 'ai-ds',
    href: '/ai-ds/arch/attention',
    title: { ja: '系列変換と Attention', en: 'Seq2Seq & Attention', zh: '序列转换与 Attention' },
    role: {
      ja: '固定長ベクトルのボトルネックを破り、必要な位置を直接参照する発想',
      en: 'Breaks the fixed-vector bottleneck by attending directly to relevant positions',
      zh: '打破固定长度向量瓶颈，直接关注相关位置的核心思想',
    },
  },
  'ai-ds:arch/transformer': {
    id: 'ai-ds:arch/transformer',
    kind: 'ai-ds',
    href: '/ai-ds/arch/transformer',
    title: { ja: 'Transformer', en: 'Transformer', zh: 'Transformer' },
    role: {
      ja: 'Scaled Dot-Product / Multi-Head Attention・位置エンコーディング・残差＋LayerNorm の集大成',
      en: 'Brings together dot-product attention, multi-head projections, positional encoding, and LayerNorm',
      zh: '融合缩放点积注意力、多头投影、位置编码与残差+LayerNorm 的集大成架构',
    },
  },
  'ai-ds:arch/augmentation': {
    id: 'ai-ds:arch/augmentation',
    kind: 'ai-ds',
    href: '/ai-ds/arch/augmentation',
    title: { ja: 'データ拡張', en: 'Data Augmentation', zh: '数据增强' },
    role: {
      ja: 'MixUp・CutMix・RandAugment など限られたデータから汎化性能を引き出す技術',
      en: 'MixUp, CutMix, and domain augmentations to improve generalization',
      zh: '通过 MixUp、CutMix 等技术从有限数据中提升泛化能力',
    },
  },
};

export const LEARN_ROADMAPS: readonly LearnRoadmap[] = [
  {
    id: 'ai-math-min',
    badge: { ja: '最低限の数学', en: 'Minimum Math', zh: 'AI 最低限数学' },
    title: {
      ja: 'AI の勉強に必要な最低限の数学ロードマップ',
      en: 'Minimum Essential Math for AI',
      zh: '学习 AI 所需的最低限数学路线图',
    },
    description: {
      ja: '269 単元ある数学の中から「AI・機械学習の数式を読むのに本当に必要な 12 単元」だけを厳選し、AI 側のどの概念に直結するかを矢印で繋ぎました。',
      en: 'Just the 12 math topics you actually need to read AI and ML formulas, wired directly to the AI concepts they unlock.',
      zh: '从 269 个数学条目中精选学习 AI 真正必需的 12 个核心主题，并用箭头直连对应的 AI 概念。',
    },
    stages: [
      {
        id: 'min-basics',
        title: { ja: 'Step 1. 式の読み方（3つ）', en: 'Step 1. Reading Formulas (3)', zh: 'Step 1. 公式读写基础（3项）' },
        summary: {
          ja: 'まず y = wx + b・Σ・e^x の 3 つだけ押さえる',
          en: 'Start with just y = wx + b, Σ, and e^x',
          zh: '先掌握 y = wx + b、Σ 与 e^x 这三个基础',
        },
        nodes: [
          'math:linear-function/slope',
          'math:sequence/sigma',
          'math:exp-log/exponent',
        ],
      },
      {
        id: 'min-highschool',
        title: { ja: 'Step 2. AI 数学の 4 本柱（5つ）', en: 'Step 2. Four Pillars (5)', zh: 'Step 2. AI 数学四大支柱（5项）' },
        summary: {
          ja: '内積・微分・連鎖律・対数・分散。ここが分かると一気に視界が開ける',
          en: 'Dot product, derivatives, chain rule, logs, and variance',
          zh: '点积、导数、链式法则、对数与方差',
        },
        nodes: [
          'math:vector/dot-product',
          'math:derivative/polynomial',
          'math:derivative/chain-rule',
          'math:exp-log/log',
          'math:statistics/variance',
        ],
      },
      {
        id: 'min-univ',
        title: { ja: 'Step 3. 大学数学・情報理論の核（5つ）', en: 'Step 3. Univ. Math & Info Core (5)', zh: 'Step 3. 大学数学与信息论核心（5项）' },
        summary: {
          ja: '行列積・固有値・偏微分・情報量とエントロピー・正規分布の 5 つで 4 系統が揃う',
          en: 'Matrix product, eigenvalues, partial derivatives, entropy, and normal distribution',
          zh: '矩阵乘法、特征值、偏导数、信息熵与正态分布，补齐四大主线',
        },
        nodes: [
          'math:matrix/operations',
          'math:eigen/eigenvalues',
          'math:multivariable/partial',
          'ai-ds:info/entropy',
          'math:distributions/normal',
        ],
      },
      {
        id: 'min-ai-goal',
        title: { ja: 'Step 4. AI 向けの応用数学（4本柱）', en: 'Step 4. Applied Math for AI (4)', zh: 'Step 4. AI 应用数学（4大支柱）' },
        summary: {
          ja: '線形代数・微分と勾配・情報理論・ベイズ確率の 4 分野へ合流する',
          en: 'Converges into the 4 applied-math pillars: linear algebra, gradients, info theory, and Bayes',
          zh: '汇入线性代数、微分梯度、信息论与贝叶斯概率四大应用数学支柱',
        },
        nodes: [
          'ai-ds:linalg/matrices',
          'ai-ds:linalg/gradients',
          'ai-ds:info/cross-entropy',
          'ai-ds:stats/bayes',
        ],
      },
    ],
  },
  {
    id: 'transformer',
    badge: { ja: 'ゴール逆算', en: 'Goal Track', zh: '目标倒推' },
    title: {
      ja: 'Transformer を数式から完全理解する',
      en: 'Understand Transformer from the Math Up',
      zh: '从数学公式彻底理解 Transformer',
    },
    description: {
      ja: 'Transformer の数式と構造に直接登場する部品だけ（13項目）に絞った最短ルートです。余計な寄り道なしで Attention と全ブロックが繋がります。',
      en: 'Trimmed to just the 13 topics that appear directly inside Transformer equations and blocks — no detours.',
      zh: '仅保留直接出现在 Transformer 公式与模块中的 13 个核心主题，无多余绕路。',
    },
    stages: [
      {
        id: 'math-core',
        title: { ja: 'Step 1. 数学の最小パーツ（5つ）', en: 'Step 1. Essential Math (5)', zh: 'Step 1. 核心数学部件（5项）' },
        summary: {
          ja: 'Transformer の数式に直接出てくる 5 つだけ',
          en: 'Only the five math tools used directly inside Transformer equations',
          zh: '只学直接出现在 Transformer 公式里的五个数学工具',
        },
        nodes: [
          'math:vector/dot-product',
          'math:matrix/operations',
          'math:exp-log/exponent',
          'math:statistics/variance',
          'math:derivative/chain-rule',
        ],
      },
      {
        id: 'nn-core',
        title: { ja: 'Step 2. ブロックを動かす NN 部品（5つ）', en: 'Step 2. NN Building Blocks (5)', zh: 'Step 2. 驱动模块的 NN 部件（5项）' },
        summary: {
          ja: '線形射影・Softmax/GELU・交差エントロピー・逆伝播・LayerNorm',
          en: 'Linear projections, Softmax/GELU, cross-entropy, backprop, and LayerNorm',
          zh: '线性投影、Softmax/GELU、交叉熵、反向传播与 LayerNorm',
        },
        nodes: [
          'ai-ds:linalg/matrices',
          'ai-ds:nn/activations',
          'ai-ds:info/cross-entropy',
          'ai-ds:nn/backpropagation',
          'ai-ds:nn/normalization',
        ],
      },
      {
        id: 'transformer-body',
        title: { ja: 'Step 3. Transformer 本体（3つ）', en: 'Step 3. Transformer Core (3)', zh: 'Step 3. Transformer 本体（3项）' },
        summary: {
          ja: '残差接続と Attention が組み合わさり Transformer が完成する',
          en: 'Skip connections and Attention assemble into the Transformer',
          zh: '残差连接与 Attention 组合为完整的 Transformer',
        },
        nodes: [
          'ai-ds:arch/skip-connections',
          'ai-ds:arch/attention',
          'ai-ds:arch/transformer',
        ],
      },
    ],
  },
  {
    id: 'e-shikaku',
    badge: { ja: 'E資格対策', en: 'E-Cert Track', zh: 'E资格路线' },
    title: {
      ja: 'E資格・深層学習 最短マスター',
      en: 'Deep Learning & E-Certificate Core',
      zh: '深度学习与 E 资格核心路线',
    },
    description: {
      ja: '線形代数・確率・情報理論から機械学習・NN・CNN/RNN/Transformer まで、計算問題と概念問題の両方を体系的に固めるロードマップです。',
      en: 'Structured track covering linear algebra, probability, ML, neural network training, and CNN/RNN/Transformer architectures.',
      zh: '系统覆盖线性代数、概率统计、信息论、机器学习、神经网络训练与 CNN/RNN/Transformer 架构。',
    },
    stages: [
      {
        id: 'e-math',
        title: { ja: 'Step 1. 線形代数・確率・情報理論', en: 'Step 1. Linear Algebra, Prob & Info', zh: 'Step 1. 线代、概率与信息论' },
        summary: {
          ja: '固有値・勾配・ベイズ・エントロピーの計算を盤石にする',
          en: 'Solidify eigenvalues, gradients, Bayes theorem, and entropy calculations',
          zh: '打牢特征值、梯度、贝叶斯与信息熵计算基础',
        },
        nodes: [
          'ai-ds:linalg/matrices',
          'ai-ds:linalg/eigen',
          'ai-ds:linalg/gradients',
          'ai-ds:linalg/distances',
          'ai-ds:stats/bayes',
          'ai-ds:stats/distributions',
          'ai-ds:info/entropy',
          'ai-ds:info/cross-entropy',
        ],
      },
      {
        id: 'e-ml',
        title: { ja: 'Step 2. 機械学習と評価指標', en: 'Step 2. Machine Learning & Evaluation', zh: 'Step 2. 机器学习与评估指标' },
        summary: {
          ja: '回帰・分類・次元削減と、過学習・ROC-AUC の見極め',
          en: 'Regression, classification, PCA, overfitting, and ROC-AUC',
          zh: '回归、分类、降维以及过拟合与 ROC-AUC 评估',
        },
        nodes: [
          'ai-ds:ml/linear-regression',
          'ai-ds:ml/logistic-regression',
          'ai-ds:ml/trees-ensembles',
          'ai-ds:ml/dimensionality-reduction',
          'ai-ds:eval/classification-metrics',
          'ai-ds:eval/roc-auc',
          'ai-ds:eval/overfitting',
        ],
      },
      {
        id: 'e-nn',
        title: { ja: 'Step 3. 深層学習の学習メカニズム', en: 'Step 3. Deep Learning Mechanics', zh: 'Step 3. 深度学习训练机制' },
        summary: {
          ja: '逆伝播・初期化・最適化・正則化・正規化を数式ごと理解する',
          en: 'Backprop, initialization, optimizers, regularization, and normalization',
          zh: '从公式层面掌握反向传播、初始化、优化器、正则化与归一化',
        },
        nodes: [
          'ai-ds:nn/perceptron',
          'ai-ds:nn/activations',
          'ai-ds:nn/losses',
          'ai-ds:nn/backpropagation',
          'ai-ds:nn/optimizers',
          'ai-ds:nn/initialization',
          'ai-ds:nn/regularization',
          'ai-ds:nn/normalization',
        ],
      },
      {
        id: 'e-arch',
        title: { ja: 'Step 4. CNN・RNN・Transformer', en: 'Step 4. CNN, RNN & Transformer', zh: 'Step 4. CNN、RNN 与 Transformer' },
        summary: {
          ja: '畳み込みサイズ計算・ResNet・LSTM・Attention・Transformer を完全制覇',
          en: 'Master convolution sizing, ResNet, LSTM, Attention, and Transformer',
          zh: '攻克卷积尺寸计算、ResNet、LSTM、Attention 与 Transformer',
        },
        nodes: [
          'ai-ds:arch/convolution',
          'ai-ds:arch/pooling',
          'ai-ds:arch/skip-connections',
          'ai-ds:arch/rnn',
          'ai-ds:arch/lstm-gru',
          'ai-ds:arch/attention',
          'ai-ds:arch/transformer',
          'ai-ds:arch/augmentation',
        ],
      },
    ],
  },
];

// Directed conceptual dependencies ("understanding `from` unlocks `to`").
export const LEARN_EDGES: readonly LearnEdge[] = [
  // Minimum Math for AI internal edges
  {
    from: 'math:linear-function/slope',
    to: 'math:vector/dot-product',
    why: { ja: '1変数の wx を多変数の w・x（内積）へ一般化する', en: 'Generalizes 1D wx into multi-feature dot product w·x', zh: '将单变量 wx 推广为多特征点积 w·x' },
  },
  {
    from: 'math:linear-function/slope',
    to: 'math:derivative/polynomial',
    why: { ja: '直線の傾きを曲線上の「瞬間の傾き（微分）」へ拡張する', en: 'Extends line slope to instantaneous slope (derivative) on curves', zh: '将直线斜率拓展为曲线的瞬时斜率（导数）' },
  },
  {
    from: 'math:sequence/sigma',
    to: 'math:vector/dot-product',
    why: { ja: '内積 Σ a_i b_i をコンパクトに書くための総和記号', en: 'Expresses dot product Σ a_i b_i compactly', zh: '用于简洁表示点积 Σ a_i b_i' },
  },
  {
    from: 'math:sequence/sigma',
    to: 'math:statistics/variance',
    why: { ja: '平均と分散 (1/n)Σ(x_i - μ)² の定義にそのまま使う', en: 'Directly defines mean and variance (1/n)Σ(x_i - μ)²', zh: '直接用于定义均值与方差 (1/n)Σ(x_i - μ)²' },
  },
  {
    from: 'math:exp-log/exponent',
    to: 'math:exp-log/log',
    why: { ja: '指数の逆演算が対数。Softmax と交差エントロピーは表裏一体', en: 'Log is the inverse of exp — Softmax and cross-entropy pair together', zh: '对数是指数的逆运算，Softmax 与交叉熵互为搭档' },
  },
  {
    from: 'math:exp-log/exponent',
    to: 'math:distributions/normal',
    why: { ja: '正規分布の釣鐘型カーブ exp(-x²/2σ²) を作る関数', en: 'Creates the bell-shaped curve exp(-x²/2σ²) of the normal distribution', zh: '构成正态分布钟形曲线 exp(-x²/2σ²)' },
  },
  {
    from: 'math:vector/dot-product',
    to: 'math:matrix/operations',
    why: { ja: '行列積は「行ベクトルと列ベクトルの内積」を並べたもの', en: 'Matrix multiplication is a grid of row-by-column dot products', zh: '矩阵乘法本质上是行向量与列向量点积的排列' },
  },
  {
    from: 'math:matrix/operations',
    to: 'math:eigen/eigenvalues',
    why: { ja: '行列積 Av = λv を満たす特別な方向（固有ベクトル）と倍率（固有値）', en: 'Special directions where matrix product Av simply scales by λ', zh: '满足矩阵乘法 Av = λv 的特殊方向与伸缩倍率' },
  },
  {
    from: 'math:derivative/polynomial',
    to: 'math:derivative/chain-rule',
    why: { ja: '1つの関数の微分から「関数を入れ子にした微分（連鎖律）」へ', en: 'Extends basic derivatives to nested functions (chain rule)', zh: '从单函数求导拓展到嵌套函数求导（链式法则）' },
  },
  {
    from: 'math:derivative/polynomial',
    to: 'math:multivariable/partial',
    why: { ja: '他を固定して1変数ずつ微分する偏微分へ拡張する', en: 'Extends to partial derivatives by differentiating one variable at a time', zh: '每次只对一个变量求导，拓展为偏导数' },
  },
  {
    from: 'math:multivariable/partial',
    to: 'ai-ds:nn/backpropagation',
    why: { ja: '全パラメータの偏微分をまとめて求めるのが誤差逆伝播法', en: 'Backprop computes partial derivatives for all weights at once', zh: '反向传播一次性求出所有参数的偏导数' },
  },
  {
    from: 'math:exp-log/log',
    to: 'ai-ds:info/cross-entropy',
    why: { ja: '予測確率の対数損失 -Σ p log q がそのまま交差エントロピー', en: 'Log-loss -Σ p log q directly defines cross-entropy', zh: '预测概率的对数损失 -Σ p log q 即为交叉熵' },
  },
  {
    from: 'math:distributions/normal',
    to: 'ai-ds:stats/bayes',
    why: { ja: '連続データの尤度・事前分布として正規分布を使うベイズ更新', en: 'Bayesian updating with normal likelihoods and priors', zh: '以正态分布作为似然与先验的贝叶斯更新' },
  },
  {
    from: 'math:eigen/eigenvalues',
    to: 'ai-ds:linalg/matrices',
    why: { ja: '行列のランク・特異値分解・PCA へと繋がる線形代数の核心', en: 'Connects matrix rank, SVD, and PCA in AI linear algebra', zh: '衔接 AI 线性代数中的秩、SVD 与 PCA' },
  },
  // Math -> AI-DS linalg/info/nn
  {
    from: 'math:vector/dot-product',
    to: 'ai-ds:linalg/matrices',
    why: { ja: '高次元ベクトルの内積・ノルム・行列積へ拡張', en: 'Extends to high-dimensional norms and matrix products', zh: '扩展到高维范数与矩阵乘积' },
  },
  {
    from: 'math:vector/dot-product',
    to: 'ai-ds:arch/attention',
    why: { ja: 'Query と Key の類似度スコア QK^T の計算そのもの', en: 'Directly computes Query-Key similarity scores QK^T', zh: '直接用于计算 Query 与 Key 的相似度分数 QK^T' },
  },
  {
    from: 'math:matrix/operations',
    to: 'ai-ds:linalg/matrices',
    why: { ja: '線形層・バッチ処理・テンソル積の基礎', en: 'Foundation of linear layers and batched tensor products', zh: '线性层与批量张量运算的基础' },
  },
  {
    from: 'math:matrix/operations',
    to: 'ai-ds:arch/transformer',
    why: { ja: 'Multi-Head Attention の線形射影 W_Q, W_K, W_V, W_O', en: 'Linear projections W_Q, W_K, W_V, W_O in Multi-Head Attention', zh: 'Multi-Head Attention 中的线性投影 W_Q, W_K, W_V, W_O' },
  },
  {
    from: 'math:matrix/determinant',
    to: 'math:eigen/eigenvalues',
    why: { ja: '固有方程式 det(A - λI) = 0 を解くために使う', en: 'Solves the characteristic equation det(A - λI) = 0', zh: '用于求解特征方程 det(A - λI) = 0' },
  },
  {
    from: 'math:eigen/eigenvalues',
    to: 'ai-ds:linalg/eigen',
    why: { ja: '対角化・特異値分解（SVD）へ発展', en: 'Extends to diagonalization and Singular Value Decomposition', zh: '拓展至对角化与奇异值分解（SVD）' },
  },
  {
    from: 'ai-ds:linalg/eigen',
    to: 'ai-ds:ml/dimensionality-reduction',
    why: { ja: 'PCA は共分散行列の固有値・固有ベクトルで主成分を求める', en: 'PCA finds principal axes via covariance eigenvalues', zh: 'PCA 通过协方差矩阵的特征值与特征向量求主成分' },
  },
  {
    from: 'math:exp-log/exponent',
    to: 'ai-ds:nn/activations',
    why: { ja: 'Softmax やシグモイド関数の定義にそのまま使われる', en: 'Directly defines Softmax and Sigmoid functions', zh: '直接用于定义 Softmax 与 Sigmoid 函数' },
  },
  {
    from: 'math:exp-log/log',
    to: 'ai-ds:info/entropy',
    why: { ja: '自己情報量 -log p とエントロピーの定義', en: 'Defines self-information -log p and entropy', zh: '定义自信息量 -log p 与信息熵' },
  },
  {
    from: 'math:statistics/variance',
    to: 'ai-ds:nn/normalization',
    why: { ja: '平均 0・分散 1 に揃える BatchNorm / LayerNorm の数式', en: 'Normalizing activations to zero mean and unit variance', zh: '将激活值标准化为零均值单位方差的公式' },
  },
  {
    from: 'math:statistics/variance',
    to: 'ai-ds:arch/transformer',
    why: { ja: '内積の分散が増えるのを √d_k で割って抑えるスケーリング', en: 'Scaling dot products by √d_k to keep variance stable', zh: '用 √d_k 缩放点积以稳定方差' },
  },
  {
    from: 'math:derivative/chain-rule',
    to: 'ai-ds:linalg/gradients',
    why: { ja: '多変数の合成関数微分（勾配・ヤコビアン）へ拡張', en: 'Generalizes to multivariable gradients and Jacobians', zh: '推广到多元梯度与雅可比矩阵' },
  },
  {
    from: 'math:derivative/chain-rule',
    to: 'ai-ds:nn/backpropagation',
    why: { ja: '出力から入力へ勾配を伝播させる計算グラフの原理', en: 'The exact rule propagating gradients backward through layers', zh: '沿计算图从输出向输入传播梯度的核心原理' },
  },
  {
    from: 'math:multivariable/partial',
    to: 'ai-ds:linalg/gradients',
    why: { ja: '全パラメータに対する勾配ベクトル ∇L を構成する', en: 'Builds the gradient vector ∇L across all parameters', zh: '构成对全部参数的梯度向量 ∇L' },
  },
  {
    from: 'ai-ds:linalg/matrices',
    to: 'ai-ds:linalg/distances',
    why: { ja: '内積とノルムからコサイン類似度・Lp距離を定義', en: 'Defines cosine similarity and Lp distances via norms and dot products', zh: '由点积与范数定义余弦相似度与 Lp 距离' },
  },
  {
    from: 'ai-ds:linalg/matrices',
    to: 'ai-ds:nn/perceptron',
    why: { ja: '全結合層の計算 y = Wx + b そのもの', en: 'Dense layer computation y = Wx + b', zh: '全连接层计算 y = Wx + b 的本质' },
  },
  {
    from: 'ai-ds:linalg/gradients',
    to: 'ai-ds:nn/backpropagation',
    why: { ja: '各層の重み勾配 ∂L/∂W を効率的に求める', en: 'Efficiently computes weight gradients ∂L/∂W for every layer', zh: '高效求解各层权重梯度 ∂L/∂W' },
  },
  {
    from: 'ai-ds:linalg/gradients',
    to: 'lab:gradient-descent',
    why: { ja: '負の勾配方向へパラメータを更新する動きを可視化', en: 'Visualizes stepping opposite the gradient', zh: '可视化沿负梯度方向更新参数的过程' },
  },
  {
    from: 'ai-ds:info/entropy',
    to: 'ai-ds:info/cross-entropy',
    why: { ja: '真の分布と予測分布のズレを測る交差エントロピーへ', en: 'Measures divergence between true and predicted distributions', zh: '扩展为衡量真实分布与预测分布差异的交叉熵' },
  },
  {
    from: 'ai-ds:info/cross-entropy',
    to: 'ai-ds:nn/losses',
    why: { ja: '分類・言語モデル（Transformer）の標準損失関数', en: 'Standard loss function for classifiers and language models', zh: '分类模型与语言模型的标准损失函数' },
  },
  {
    from: 'ai-ds:nn/activations',
    to: 'ai-ds:nn/backpropagation',
    why: { ja: '活性化関数の微分が勾配消失・爆発を左右する', en: 'Activation derivatives control vanishing/exploding gradients', zh: '激活函数的导数决定梯度消失或爆炸' },
  },
  {
    from: 'ai-ds:nn/losses',
    to: 'ai-ds:nn/backpropagation',
    why: { ja: '逆伝播の出発点（出力層の誤差勾配）を決める', en: 'Provides the starting error gradient at the output layer', zh: '决定反向传播在输出层的起始误差梯度' },
  },
  {
    from: 'ai-ds:nn/backpropagation',
    to: 'ai-ds:nn/optimizers',
    why: { ja: '逆伝播で得た勾配を使って SGD / Adam が重みを更新する', en: 'SGD and Adam use backpropagated gradients to update weights', zh: 'SGD 与 Adam 利用反向传播得到的梯度更新权重' },
  },
  {
    from: 'ai-ds:nn/backpropagation',
    to: 'ai-ds:arch/skip-connections',
    why: { ja: '深い層での勾配消失を y = F(x) + x の近道で解消する', en: 'Skip paths y = F(x) + x prevent gradients from vanishing', zh: '通过 y = F(x) + x 的直通路径解决深层梯度消失' },
  },
  {
    from: 'ai-ds:nn/backpropagation',
    to: 'ai-ds:arch/rnn',
    why: { ja: '時間方向に展開した逆伝播が BPTT', en: 'Unrolling backpropagation through time gives BPTT', zh: '沿时间展开的反向传播即为 BPTT' },
  },
  {
    from: 'ai-ds:nn/optimizers',
    to: 'lab:gradient-descent',
    why: { ja: '学習率による収束と発散をブラウザ上で試せる', en: 'Try learning rate convergence and divergence interactively', zh: '在浏览器中交互体验学习率对收敛与发散的影响' },
  },
  {
    from: 'ai-ds:nn/normalization',
    to: 'ai-ds:arch/transformer',
    why: { ja: 'Transformer の各サブ層に LayerNorm が組み込まれる', en: 'LayerNorm stabilizes every sub-layer in a Transformer', zh: 'Transformer 的每个子层都依赖 LayerNorm 保持稳定' },
  },
  {
    from: 'ai-ds:arch/convolution',
    to: 'ai-ds:arch/pooling',
    why: { ja: '畳み込み特徴マップの空間サイズを圧縮する次段の処理', en: 'Downsamples spatial feature maps after convolution', zh: '在卷积之后压缩特征图的空间尺寸' },
  },
  {
    from: 'ai-ds:arch/convolution',
    to: 'ai-ds:arch/skip-connections',
    why: { ja: '深い CNN を学習可能にした ResNet の残差ブロック', en: 'Residual blocks that unlocked very deep CNNs (ResNet)', zh: '使超深 CNN 得以训练的 ResNet 残差块' },
  },
  {
    from: 'ai-ds:arch/skip-connections',
    to: 'ai-ds:arch/transformer',
    why: { ja: 'Attention 層と FFN 層すべてに残差接続が使われている', en: 'Wraps every Attention and FFN sub-layer in Transformer', zh: '包裹 Transformer 中的每一个 Attention 与 FFN 子层' },
  },
  {
    from: 'ai-ds:arch/rnn',
    to: 'ai-ds:arch/lstm-gru',
    why: { ja: 'RNN の長期依存・勾配消失をゲート機構で克服する', en: 'Solves RNN vanishing gradients with gates and cell states', zh: '通过门控机制与细胞状态克服 RNN 的长期依赖难题' },
  },
  {
    from: 'ai-ds:arch/lstm-gru',
    to: 'ai-ds:arch/attention',
    why: { ja: 'seq2seq の固定長ベクトル圧縮の限界を Attention で突破する', en: 'Attention removes the fixed-length bottleneck in seq2seq', zh: '用 Attention 突破 seq2seq 固定长度向量的瓶颈' },
  },
  {
    from: 'ai-ds:arch/attention',
    to: 'ai-ds:arch/transformer',
    why: { ja: 'RNN を完全に外し Self-Attention だけで構成したのが Transformer', en: 'Transformer drops recurrence entirely, relying on Self-Attention', zh: '彻底抛弃循环结构、完全基于 Self-Attention 构建 Transformer' },
  },
  // Additional edges to connect every E-shikaku and University Math node cleanly
  {
    from: 'ai-ds:linalg/matrices',
    to: 'ai-ds:ml/linear-regression',
    why: { ja: '最小二乗法・重回帰の正規方程式を行列で解く', en: 'Normal equations for linear regression use matrix algebra', zh: '用矩阵代数求解线性回归的正规方程' },
  },
  {
    from: 'ai-ds:linalg/matrices',
    to: 'ai-ds:arch/attention',
    why: { ja: 'Query・Key・Value の射影と内積を行列積 QK^T で一括計算', en: 'Batched QK^T dot products and projections via matrix multiplication', zh: '通过矩阵乘法批量计算 QK^T 点积与投影' },
  },
  {
    from: 'ai-ds:linalg/distances',
    to: 'ai-ds:ml/dimensionality-reduction',
    why: { ja: '高次元空間での近接構造を保ちながら次元を落とす', en: 'Preserves distance structure while reducing dimensions', zh: '在降维同时保持高维空间的距离结构' },
  },
  {
    from: 'ai-ds:stats/bayes',
    to: 'ai-ds:ml/logistic-regression',
    why: { ja: '事後確率をモデル化する確率的分類の考え方', en: 'Probabilistic classification modeling posterior probabilities', zh: '对后验概率建模的概率分类思想' },
  },
  {
    from: 'ai-ds:stats/distributions',
    to: 'ai-ds:nn/initialization',
    why: { ja: '分散を一定に保つ正規分布・一様分布から初期重みをサンプリング', en: 'Samples initial weights from variance-preserving distributions', zh: '从保持方差稳定的分布中采样初始权重' },
  },
  {
    from: 'ai-ds:info/entropy',
    to: 'ai-ds:ml/trees-ensembles',
    why: { ja: '決定木の分割基準（情報利得・エントロピー減少量）に使う', en: 'Decision trees split nodes by maximizing information gain', zh: '决策树通过最大化信息增益（熵减）选择划分' },
  },
  {
    from: 'ai-ds:info/cross-entropy',
    to: 'ai-ds:nn/backpropagation',
    why: { ja: 'Softmax＋交差エントロピーの勾配が (y - t) と簡潔に求まる', en: 'Softmax + Cross-Entropy yields the clean gradient (y - t)', zh: 'Softmax + 交叉熵的梯度简化为 (y - t)' },
  },
  {
    from: 'ai-ds:ml/linear-regression',
    to: 'ai-ds:ml/logistic-regression',
    why: { ja: '線形結合にシグモイド関数を噛ませて確率分類へ拡張', en: 'Adds a sigmoid on top of a linear model for classification', zh: '在线性组合外加 Sigmoid 拓展为概率分类' },
  },
  {
    from: 'ai-ds:ml/linear-regression',
    to: 'ai-ds:eval/overfitting',
    why: { ja: 'Ridge / Lasso 正則化で過学習（高バリアンス）を抑える', en: 'Ridge and Lasso regularization directly control overfitting', zh: '通过 Ridge / Lasso 正则化直接抑制过拟合' },
  },
  {
    from: 'ai-ds:ml/logistic-regression',
    to: 'ai-ds:eval/classification-metrics',
    why: { ja: '予測確率にしきい値を設けて混同行列・F1 を評価', en: 'Thresholds predicted probabilities to evaluate precision/recall/F1', zh: '对预测概率设定阈值以评估混淆矩阵与 F1' },
  },
  {
    from: 'ai-ds:ml/logistic-regression',
    to: 'ai-ds:nn/perceptron',
    why: { ja: 'ロジスティック回帰を多層に重ねたものがニューラルネット', en: 'Stacking logistic units forms a multilayer neural network', zh: '将逻辑回归单元多层堆叠即构成神经网络' },
  },
  {
    from: 'ai-ds:eval/classification-metrics',
    to: 'ai-ds:eval/roc-auc',
    why: { ja: 'しきい値を連続的に動かした TPR と FPR の軌跡が ROC 曲線', en: 'Sweeping the threshold traces TPR vs FPR as the ROC curve', zh: '连续改变阈值绘出的 TPR-FPR 曲线即为 ROC 曲线' },
  },
  {
    from: 'ai-ds:eval/overfitting',
    to: 'ai-ds:nn/regularization',
    why: { ja: '深層学習での過学習対策（Weight Decay・Dropout）へ発展', en: 'Extends to deep learning defenses: Weight Decay and Dropout', zh: '延伸为深度学习中的权重衰减与 Dropout 防过拟合手段' },
  },
  {
    from: 'ai-ds:nn/regularization',
    to: 'ai-ds:arch/augmentation',
    why: { ja: 'データ側から過学習を抑える正則化としての MixUp / CutMix', en: 'MixUp and CutMix act as data-side regularization', zh: 'MixUp 与 CutMix 作为数据侧正则化抑制过拟合' },
  },
  {
    from: 'ai-ds:nn/activations',
    to: 'ai-ds:arch/attention',
    why: { ja: 'Attention スコアを合計 1 の重みに変換する Softmax', en: 'Softmax turns raw attention scores into weights summing to 1', zh: 'Softmax 将原始注意力分数转为和为 1 的权重' },
  },
  {
    from: 'ai-ds:nn/perceptron',
    to: 'ai-ds:nn/activations',
    why: { ja: '線形層に非線形活性化関数を入れて多層化の意味を持たせる', en: 'Nonlinear activations make stacking linear layers expressive', zh: '加入非线性激活函数使多层堆叠具有表达力' },
  },
  {
    from: 'ai-ds:nn/initialization',
    to: 'ai-ds:nn/normalization',
    why: { ja: '学習中も各層の分布を安定させ続けるのが BatchNorm / LayerNorm', en: 'Normalization keeps layer distributions stable throughout training', zh: '归一化在训练全程持续保持各层分布稳定' },
  },
  {
    from: 'ai-ds:nn/normalization',
    to: 'ai-ds:arch/convolution',
    why: { ja: 'CNN では Conv → BatchNorm → ReLU の並びが標準ブロック', en: 'Conv → BatchNorm → ReLU is the standard CNN block', zh: 'Conv → BatchNorm → ReLU 是 CNN 的标准模块' },
  },
  {
    from: 'math:statistics/variance',
    to: 'math:distributions/normal',
    why: { ja: '平均 μ と分散 σ² の 2 つだけで形が決まる正規分布', en: 'Normal distribution is fully determined by mean μ and variance σ²', zh: '正态分布完全由均值 μ 与方差 σ² 决定' },
  },
  {
    from: 'math:distributions/normal',
    to: 'math:inference/estimation',
    why: { ja: '標本平均の分布（中心極限定理）から信頼区間を推定する', en: 'Sample mean normality underpins confidence interval estimation', zh: '样本均值的正态性支撑区间估计' },
  },
  {
    from: 'math:inference/estimation',
    to: 'ai-ds:stats/bayes',
    why: { ja: '点推定・最尤推定から事前分布を組み込むベイズ推定へ', en: 'Extends point/MLE estimation to Bayesian posterior inference', zh: '从点估计与最大似然估计拓展到贝叶斯后验推断' },
  },
];

export interface NodeConnection {
  node: LearnNode;
  why: LocalizedText;
}

export function learnNodeId(kind: LearnNodeKind, unit: string, item?: string): string {
  return item ? `${kind}:${unit}/${item}` : `${kind}:${unit}`;
}

export function traceGraph(
  focusId: string,
  edges: readonly LearnEdge[],
): { ancestors: Set<string>; descendants: Set<string>; activeEdges: Set<string> } {
  const ancestors = new Set<string>();
  const descendants = new Set<string>();
  const activeEdges = new Set<string>();

  const upQueue = [focusId];
  while (upQueue.length > 0) {
    const cur = upQueue.pop()!;
    for (const edge of edges) {
      if (edge.to === cur) {
        activeEdges.add(`${edge.from}->${edge.to}`);
        if (!ancestors.has(edge.from) && edge.from !== focusId) {
          ancestors.add(edge.from);
          upQueue.push(edge.from);
        }
      }
    }
  }

  const downQueue = [focusId];
  while (downQueue.length > 0) {
    const cur = downQueue.pop()!;
    for (const edge of edges) {
      if (edge.from === cur) {
        activeEdges.add(`${edge.from}->${edge.to}`);
        if (!descendants.has(edge.to) && edge.to !== focusId) {
          descendants.add(edge.to);
          downQueue.push(edge.to);
        }
      }
    }
  }

  return { ancestors, descendants, activeEdges };
}

export function connectionsFor(nodeId: string): {
  prerequisites: NodeConnection[];
  leadsTo: NodeConnection[];
  roadmaps: LearnRoadmap[];
} {
  const prerequisites: NodeConnection[] = [];
  const leadsTo: NodeConnection[] = [];
  for (const edge of LEARN_EDGES) {
    if (edge.to === nodeId && LEARN_NODES[edge.from]) {
      prerequisites.push({ node: LEARN_NODES[edge.from], why: edge.why });
    }
    if (edge.from === nodeId && LEARN_NODES[edge.to]) {
      leadsTo.push({ node: LEARN_NODES[edge.to], why: edge.why });
    }
  }
  const roadmaps = LEARN_ROADMAPS.filter(rm =>
    rm.stages.some(stage => stage.nodes.includes(nodeId)),
  );
  return { prerequisites, leadsTo, roadmaps };
}

export function pickText(text: LocalizedText, locale: string): string {
  return text[locale as keyof LocalizedText] ?? text.en;
}
