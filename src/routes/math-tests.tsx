import { useLocale, useTranslations } from 'use-intl';
import MathHomeHeader from '../components/math-home-header';
import ToolLayout from '../components/tool-layout';
import { Link } from '../i18n/navigation';
import type { DynamicT } from '../lib/apps';
import { MATH_STAGES } from '../lib/math-catalog';
import { stageOfGrade } from '../lib/math-curriculum-jp';
import { KENTEI_LOCALES, KENTEI_OFFICIAL_URL } from '../lib/math-kentei';
import { getGradeCounts } from '../lib/math-problems.server';
import { PLACEMENT_SIZE } from '../lib/math-placement';
import { MATH_TESTS, testSize, type TestDef } from '../lib/math-test';
import styles from './math-tests.module.css';
import type { Route } from './+types/math-tests';

// The tests side of /math: by school year, by Suken level (Japanese only) and several years at once. Only the tests whose every part
// has enough published problems are offered.
export async function loader() {
  const counts = await getGradeCounts();
  const offered = (test: TestDef) => test.parts.every(part => part.grades.reduce((sum, grade) => sum + (counts[grade]?.problems ?? 0), 0) >= part.size);
  return { tests: MATH_TESTS.filter(offered).map(test => test.id) };
}

export default function MathTests({ loaderData: { tests } }: Route.ComponentProps) {
  const locale = useLocale();
  const t = useTranslations('App.math') as unknown as DynamicT;
  const tt = useTranslations('App.math.test');
  const tp = useTranslations('App.math.placement');
  const offered = MATH_TESTS.filter(test => tests.includes(test.id));
  const grades = offered.filter(test => test.kind === 'grade');
  const levels = (KENTEI_LOCALES as readonly string[]).includes(locale) ? offered.filter(test => test.kind === 'kentei').reverse() : [];
  const summaries = offered.filter(test => test.kind === 'summary');
  const chip = (test: TestDef, label: string) => <li key={test.id}><Link href={`/math/test/${test.id}`} className={styles.chip}>{label}</Link></li>;
  return <>
    <title>{`${tt('title')} | PAIBOT`}</title>
    <meta name="robots" content="noindex" />
    <ToolLayout title={t('title')} centerTitle compact>
      <MathHomeHeader mode="test" />
      <Link href="/math/test/placement" className={styles.placement} data-math-placement>
        <span className={styles.placementName}>{tp('entry')}</span>
        <span className={styles.placementNote}>{tp('entryNote', { count: PLACEMENT_SIZE })}</span>
      </Link>
      <p className={styles.intro}>{tt('intro')}</p>
      <section className={styles.group} aria-labelledby="math-test-grades">
        <h2 id="math-test-grades" className={styles.groupName}>{tt('byGrade')}</h2>
        {MATH_STAGES.map(stage => {
          const ofStage = grades.filter(test => stageOfGrade(test.key as never) === stage);
          return ofStage.length > 0 && <div key={stage} className={styles.row}>
            <span className={styles.rowName}>{t(`stages.${stage}`)}</span>
            <ul className={styles.chips}>{ofStage.map(test => chip(test, t(`grades.${test.key}`)))}</ul>
          </div>;
        })}
      </section>
      {levels.length > 0 && <section className={styles.group} aria-labelledby="math-test-kentei">
        <h2 id="math-test-kentei" className={styles.groupName}>{tt('byKentei')}</h2>
        <ul className={styles.chips}>{levels.map(test => chip(test, t(`kentei.levels.${test.key}`).replace(/（.*）/, '')))}</ul>
        <p className={styles.note}>{t('kentei.note')} <a href={KENTEI_OFFICIAL_URL} rel="noopener noreferrer" target="_blank">{t('kentei.official')}</a></p>
      </section>}
      {summaries.length > 0 && <section className={styles.group} aria-labelledby="math-test-summaries">
        <h2 id="math-test-summaries" className={styles.groupName}>{tt('summary')}</h2>
        <ul className={styles.cards}>{summaries.map(test => <li key={test.id}>
          <Link href={`/math/test/${test.id}`} className={styles.card}>
            <span className={styles.cardName}>{tt(`summaries.${test.key}` as 'summaries.middle')}</span>
            <span className={styles.cardNote}>{tt('count', { count: testSize(test) })}</span>
          </Link>
        </li>)}</ul>
      </section>}
    </ToolLayout>
  </>;
}
