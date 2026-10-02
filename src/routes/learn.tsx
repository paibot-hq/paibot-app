import { useLocale, useTranslations } from 'use-intl';
import PublicHead from '../components/public-head';
import SiteFooter from '../components/site-footer';
import { Link } from '../i18n/navigation';
import { MATH_CATALOG, MATH_STAGES } from '../lib/math-catalog';
import styles from './learn.module.css';

const ITEMS = MATH_CATALOG.reduce((sum, unit) => sum + unit.items.length, 0);
// The subjects of the learning site; only math has problems so far.
const SUBJECTS = [{ key: 'math', href: '/math' }, { key: 'english', href: null }, { key: 'it', href: null }] as const;

// The cover of the learning site: its subjects, and how much there is to learn in each.
export default function Learn() {
  const locale = useLocale();
  const t = useTranslations('App.learn');
  const stats = [
    { key: 'subjects', value: SUBJECTS.filter(subject => subject.href).length },
    { key: 'units', value: MATH_CATALOG.length },
    { key: 'items', value: ITEMS },
    { key: 'languages', value: 3 },
  ] as const;
  return <>
    <PublicHead locale={locale} path="/learn" title={t('title')} description={t('description')} />
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="learn-title">
        <p className={styles.eyebrow}>PAIBOT</p>
        <h1 id="learn-title">{t('heading')}</h1>
        <p className={styles.lead}>{t('lead')}</p>
        <Link className="auth-link" href="/math">{t('start')}</Link>
      </section>
      <dl className={styles.stats}>
        {stats.map(({ key, value }) => <div key={key}><dd>{value}</dd><dt>{t(`stats.${key}`)}</dt></div>)}
      </dl>
      <h2 className={styles.heading}>{t('subjects')}</h2>
      <ul className={styles.subjects}>
        {SUBJECTS.map(({ key, href }) => <li key={key}>
          {href
            ? <Link className={styles.card} data-ready href={href}>
                <span className={styles.cardTitle}>{t(`subject.${key}.title`)}<span className={styles.badge}>{t('open')}</span></span>
                <span className={styles.cardText}>{t(`subject.${key}.text`)}</span>
                <span className={styles.cardMeta}>{t('mathMeta', { units: MATH_CATALOG.length, items: ITEMS })}</span>
                <span className={styles.stages}>{MATH_STAGES.map(stage => <span key={stage}>{t(`stage.${stage}`)}</span>)}</span>
              </Link>
            : <div className={styles.card}>
                <span className={styles.cardTitle}>{t(`subject.${key}.title`)}<span className={styles.badge}>{t('soon')}</span></span>
                <span className={styles.cardText}>{t(`subject.${key}.text`)}</span>
              </div>}
        </li>)}
      </ul>
    </main>
    <SiteFooter year={new Date().getFullYear()} />
  </>;
}
