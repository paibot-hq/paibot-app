import { useTranslations } from 'use-intl';
import ToolLayout from '../../components/tool-layout';
import { Link } from '../../i18n/navigation';
import type { DynamicT } from '../../lib/apps';
import { ENGLISH_GRADES, ENGLISH_PLACEMENT_POOL, ENGLISH_PLACEMENT_SIZE, ENGLISH_TEST_SIZE, levelsOfGrade } from './catalog';
import EnglishHomeHeader from './home-header';
import { getLevelProblemCounts } from './problems.server';
import styles from './english.module.css';
import type { Route } from './+types/tests';

// The tests side of /english: the placement test, then one test per level, ENGLISH_TEST_SIZE problems drawn from its items. A test is
// offered once there are enough published problems (see catalog.ts); until then it is shown as coming soon. The test pages
// (/english/test/placement, /english/test/<level>) come with the first problems.
export async function loader() {
  const byLevel = await getLevelProblemCounts();
  const counts = Object.fromEntries(ENGLISH_GRADES.map(grade => [grade, levelsOfGrade(grade).reduce((sum, level) => sum + (byLevel[level] ?? 0), 0)]));
  return {
    offered: ENGLISH_GRADES.filter(grade => (counts[grade] ?? 0) >= ENGLISH_TEST_SIZE),
    placement: ENGLISH_GRADES.every(grade => (counts[grade] ?? 0) >= ENGLISH_PLACEMENT_POOL),
  };
}

export default function EnglishTests({ loaderData: { offered, placement } }: Route.ComponentProps) {
  const t = useTranslations('App.english') as unknown as DynamicT;
  return <>
    <title>{`${t('test.title')} | ${t('title')} | PAIBOT.app`}</title>
    <ToolLayout title={t('title')} centerTitle compact>
      <EnglishHomeHeader mode="test" />
      {placement
        ? <Link href="/english/test/placement" className={styles.placement}>
          <span className={styles.placementName}>{t('placement.entry')}</span>
          <span className={styles.placementNote}>{t('placement.entryNote', { count: ENGLISH_PLACEMENT_SIZE })}</span>
        </Link>
        : <div className={styles.placement} data-unavailable>
          <span className={styles.placementName}>{t('placement.entry')}<span className={styles.badge}>{t('comingSoon')}</span></span>
          <span className={styles.placementNote}>{t('placement.entryNote', { count: ENGLISH_PLACEMENT_SIZE })}</span>
        </div>}
      <p className={styles.intro}>{t('test.intro')}</p>
      <section className={styles.testGroup} aria-labelledby="english-test-grades">
        <h2 id="english-test-grades" className={styles.testGroupName}>{t('test.byGrade')}</h2>
        <ul className={styles.chips}>
          {ENGLISH_GRADES.map(grade => <li key={grade}>
            {offered.includes(grade)
              ? <Link href={`/english/test/${grade}`} className={styles.chip}>{t(`grades.${grade}`)}</Link>
              : <span className={styles.chip} data-unavailable>{t(`grades.${grade}`)}<span className={styles.badge}>{t('comingSoon')}</span></span>}
          </li>)}
        </ul>
        <p className={styles.testNote}>{t('test.count', { count: ENGLISH_TEST_SIZE })}</p>
      </section>
    </ToolLayout>
  </>;
}
