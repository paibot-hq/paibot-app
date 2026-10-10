import { useTranslations } from 'use-intl';
import MathBreadcrumb from '../components/math-breadcrumb';
import ToolLayout from '../components/tool-layout';
import { Link } from '../i18n/navigation';
import type { DynamicT } from '../lib/apps';
import { MATH_STAGES } from '../lib/math-catalog';
import { JP_GRADES, stageOfGrade } from '../lib/math-curriculum-jp';
import { getGradeCounts } from '../lib/math-problems.server';
import { TEST_MIN_PROBLEMS } from '../lib/math-test';
import styles from './math-tests.module.css';
import type { Route } from './+types/math-tests';

// The school years with enough published problems for a test, by stage.
export async function loader() {
  const counts = await getGradeCounts();
  return { grades: JP_GRADES.filter(grade => (counts[grade]?.problems ?? 0) >= TEST_MIN_PROBLEMS).map(grade => ({ grade, items: counts[grade].items })) };
}

export default function MathTests({ loaderData: { grades } }: Route.ComponentProps) {
  const t = useTranslations('App.math') as unknown as DynamicT;
  const tt = useTranslations('App.math.test');
  return <>
    <title>{`${tt('title')} | PAIBOT`}</title>
    <meta name="robots" content="noindex" />
    <ToolLayout title={tt('title')} centerTitle compact aboveTitle={<MathBreadcrumb crumbs={[{ label: tt('title') }]} />}>
      <p className={styles.intro}>{tt('intro')}</p>
      {MATH_STAGES.map(stage => {
        const ofStage = grades.filter(({ grade }) => stageOfGrade(grade) === stage);
        return ofStage.length > 0 && <section key={stage} className={styles.stage} aria-labelledby={`math-test-${stage}`}>
          <h2 id={`math-test-${stage}`} className={styles.stageName}>{t(`stages.${stage}`)}</h2>
          <ul className={styles.grades}>
            {ofStage.map(({ grade, items }) => <li key={grade}>
              <Link href={`/math/test/${grade}`} className={styles.grade}>
                <span className={styles.gradeName}>{t(`grades.${grade}`)}</span>
                <span className={styles.gradeItems}>{tt('itemCount', { count: items })}</span>
              </Link>
            </li>)}
          </ul>
        </section>;
      })}
    </ToolLayout>
  </>;
}
