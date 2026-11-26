import { useLocale, useTranslations } from 'use-intl';
import { Link } from '../i18n/navigation';
import { GRADIENT_DESCENT_PATH } from '../lib/app-catalog';
import { pickText, type LocalizedText } from '../lib/learn-roadmaps';
import LearnRoadmaps from './learn-roadmaps';
import styles from './learn-hub.module.css';

type QuickLink = { href: string; label: LocalizedText };

const COURSES: readonly {
  id: 'math' | 'ai-ds';
  badge: LocalizedText;
  title: LocalizedText;
  description: LocalizedText;
  meta: readonly LocalizedText[];
  href: string;
  cta: LocalizedText;
  shortcuts: readonly QuickLink[];
}[] = [
  {
    id: 'math',
    badge: { ja: '数学', en: 'Mathematics', zh: '数学' },
    title: { ja: '基礎数学', en: 'Mathematics Practice', zh: '基础数学' },
    description: {
      ja: '小学校の算数から大学の線形代数・微積分・確率統計まで。要点の解説、例題、よくある間違い、4択演習とレベル診断テストで基礎を固められます。',
      en: 'From arithmetic to university linear algebra, calculus, and statistics — with explanations, worked examples, quizzes, and a placement test.',
      zh: '涵盖从小学算术到大学线性代数、微积分与概率统计的讲解、例题、四选一练习与水平测试。',
    },
    meta: [
      { ja: '82 単元・269 項目', en: '82 units · 269 items', zh: '82 单元 · 269 项' },
      { ja: '学年別 / 数検 / 診断テスト', en: 'Grades · Placement Test', zh: '年级 · 水平测试' },
    ],
    href: '/math',
    cta: { ja: '数学をすべて見る →', en: 'Browse all Math →', zh: '查看全部数学 →' },
    shortcuts: [
      { href: '/math/test/placement', label: { ja: 'レベル診断テスト', en: 'Placement Test', zh: '水平测试' } },
      { href: '/math/derivative/chain-rule', label: { ja: '合成関数の微分', en: 'Chain Rule', zh: '链式法则' } },
      { href: '/math/matrix/operations', label: { ja: '行列の積', en: 'Matrix Product', zh: '矩阵乘法' } },
      { href: '/math/eigen/eigenvalues', label: { ja: '固有値', en: 'Eigenvalues', zh: '特征值' } },
    ],
  },
  {
    id: 'ai-ds',
    badge: { ja: 'AI・データサイエンス', en: 'AI & Data Science', zh: 'AI 与数据科学' },
    title: { ja: 'AI・データサイエンス', en: 'AI & Data Science Practice', zh: 'AI 与数据科学' },
    description: {
      ja: '統計・線形代数・情報理論・機械学習・深層学習・CNN・RNN・Transformer まで。計算問題の自動検算つき解説と4択演習で仕組みから理解できます。',
      en: 'Statistics, linear algebra, information theory, ML, deep learning, CNNs, RNNs, and Transformers with verified calculation exercises.',
      zh: '涵盖统计、线代、信息论、机器学习、深度学习、CNN、RNN 与 Transformer，配有验算习题与详细解析。',
    },
    meta: [
      { ja: 'DS検定 / G検定 / E資格 対応', en: 'DS · G · E-Cert mapped', zh: '对应 DS / G / E 资格' },
      { ja: '計算検算つき 250 問', en: '250 verified problems', zh: '250 道验算习题' },
    ],
    href: '/ai-ds',
    cta: { ja: 'AI・DS をすべて見る →', en: 'Browse all AI & DS →', zh: '查看全部 AI·DS →' },
    shortcuts: [
      { href: '/ai-ds/arch/transformer', label: { ja: 'Transformer', en: 'Transformer', zh: 'Transformer' } },
      { href: '/ai-ds/nn/backpropagation', label: { ja: '誤差逆伝播法', en: 'Backpropagation', zh: '反向传播' } },
      { href: '/ai-ds/arch/convolution', label: { ja: '畳み込み（CNN）', en: 'Convolution', zh: '卷积（CNN）' } },
      { href: '/ai-ds/linalg/matrices', label: { ja: 'ベクトルと行列', en: 'Vectors & Matrices', zh: '向量与矩阵' } },
    ],
  },
];

const LAB_LINKS: readonly {
  href: string;
  title: LocalizedText;
  body: LocalizedText;
}[] = [
  {
    href: GRADIENT_DESCENT_PATH,
    title: { ja: '勾配降下法シミュレーター', en: 'Gradient Descent Lab', zh: '梯度下降模拟器' },
    body: {
      ja: '学習率を変えると収束・振動・発散する様子を動かして体感',
      en: 'See how learning rate causes convergence, oscillation, or divergence',
      zh: '调节学习率直观体验收敛、震荡与发散',
    },
  },
  {
    href: '/grapher',
    title: { ja: '関数グラフ', en: 'Function Grapher', zh: '函数图像' },
    body: {
      ja: '指数・対数・シグモイドや微分の傾きをグラフで観察',
      en: 'Plot exponentials, logs, sigmoids, and derivatives interactively',
      zh: '交互绘制指数、对数、Sigmoid 与导数曲线',
    },
  },
  {
    href: '/sql',
    title: { ja: 'SQL を試す', en: 'SQL Playground', zh: 'SQL 实验环境' },
    body: {
      ja: 'サンプル表で SELECT・GROUP BY・JOIN をブラウザ上で実行',
      en: 'Run SELECT, GROUP BY, and JOIN queries right in the browser',
      zh: '在浏览器中直接运行 SELECT、GROUP BY 与 JOIN 查询',
    },
  },
];

const UI_COPY = {
  coursesHeading: { ja: '学習分野', en: 'Subjects', zh: '学习领域' },
  quickStart: { ja: 'よく開かれる単元', en: 'Quick entry', zh: '常用入口' },
  labHeading: { ja: '動かして体感する（Lab 連携）', en: 'Try It Interactively (Lab)', zh: '动手实验（Lab 联动）' },
  labMore: { ja: 'Lab の実験をすべて見る →', en: 'Explore all Lab experiments →', zh: '查看全部 Lab 实验 →' },
} as const;

export default function LearnHub() {
  const locale = useLocale();
  const ts = useTranslations('App.search');
  const title = ts('shelves.learn');
  const description = ts('sections.learn.description');

  return (
    <main className={styles.page} data-section="learn">
      <header className={styles.header}>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>

      <section className={styles.section} aria-labelledby="learn-courses-heading">
        <h2 id="learn-courses-heading" className={styles.sectionHeading}>
          {pickText(UI_COPY.coursesHeading, locale)}
        </h2>
        <div className={styles.courseGrid}>
          {COURSES.map(course => (
            <article key={course.id} className={styles.courseCard} data-course={course.id}>
              <div className={styles.courseTop}>
                <span className={styles.courseBadge} data-course={course.id}>
                  {pickText(course.badge, locale)}
                </span>
                <div className={styles.metaRow}>
                  {course.meta.map((m, i) => (
                    <span key={i} className={styles.metaChip}>{pickText(m, locale)}</span>
                  ))}
                </div>
              </div>

              <h3 className={styles.courseTitle}>
                <Link href={course.href}>{pickText(course.title, locale)}</Link>
              </h3>
              <p className={styles.courseDesc}>{pickText(course.description, locale)}</p>

              <div className={styles.shortcutsBlock}>
                <span className={styles.shortcutsLabel}>{pickText(UI_COPY.quickStart, locale)}</span>
                <div className={styles.shortcuts}>
                  {course.shortcuts.map(item => (
                    <Link key={item.href} href={item.href} className={styles.shortcutPill}>
                      {pickText(item.label, locale)}
                    </Link>
                  ))}
                </div>
              </div>

              <div className={styles.courseFooter}>
                <Link href={course.href} className={styles.courseCta}>
                  {pickText(course.cta, locale)}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <LearnRoadmaps />

      <section className={styles.section} aria-labelledby="learn-lab-heading">
        <div className={styles.sectionHeadRow}>
          <h2 id="learn-lab-heading" className={styles.sectionHeading}>
            {pickText(UI_COPY.labHeading, locale)}
          </h2>
          <Link href="/lab" className={styles.sectionMore}>
            {pickText(UI_COPY.labMore, locale)}
          </Link>
        </div>
        <div className={styles.labGrid}>
          {LAB_LINKS.map(lab => (
            <Link key={lab.href} href={lab.href} className={styles.labCard}>
              <strong>{pickText(lab.title, locale)}</strong>
              <span>{pickText(lab.body, locale)}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
