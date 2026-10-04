import { redirect } from 'react-router';
import { useLocale, useTranslations } from 'use-intl';
import { useMathQuestions } from '../components/math-questions';
import MathText from '../components/math-text';
import { MathTex } from '../components/math-tex';
import PublicHead from '../components/public-head';
import MathBreadcrumb from '../components/math-breadcrumb';
import ToolLayout from '../components/tool-layout';
import { Link } from '../i18n/navigation';
import type { DynamicT } from '../lib/apps';
import { getSetRecords } from '../lib/math-attempts.server';
import { findUnit } from '../lib/math-catalog';
import { jpGrade } from '../lib/math-curriculum-jp';
import { getPlayableSets, getSetTiers, getWorkedExample } from '../lib/math-problems.server';
import { keyPoints } from '../lib/math-key-points';
import { catalogEntry } from '../lib/math-routes.server';
import styles from './math-item.module.css';
import type { Route } from './+types/math-item';

// Set pages used to live at /math/<unit>/<set id>; the id was usually
// "<item>-<letter>" (a, b, ... are now sets 1, 2, ...), except for these
// published before items had their own names.
const LEGACY_SETS: Record<string, string> = { 'arith/order-a': 'order-of-operations/1', 'arith/order-b': 'order-of-operations/2', 'arith/word-a': 'simple-word-problems/1', 'arith/word-b': 'word-problems/1', 'factorization/squares-a': 'difference-of-squares/1', 'signed/four-ops-a': 'four-operations/1' };

// A learning item: what it covers and its practice sets (1, 2, ...), with a
// signed-in user's latest and best score on each.
export async function loader(args: Route.LoaderArgs) {
  const { params } = args;
  const lettered = /^(.+)-([a-z])$/.exec(params.item);
  const legacy = LEGACY_SETS[`${params.unit}/${params.item}`]?.split('/')
    ?? (lettered ? [lettered[1], String(lettered[2].charCodeAt(0) - 96)] : undefined);
  const unit = findUnit(params.unit);
  if (legacy && unit?.items.some(item => item.id === legacy[0] && item.sets.some(set => set.id === legacy[1]))) {
    throw redirect(`/${params.locale}/math/${params.unit}/${legacy[0]}/${legacy[1]}`, 301);
  }
  const entry = catalogEntry(params);
  const [playable, records, tiers, example] = await Promise.all([getPlayableSets(), getSetRecords(args, entry.unit.id, entry.item.id), getSetTiers(entry.unit.id, entry.item.id), entry.unit.kind ? getWorkedExample(entry.unit.id, entry.item.id) : null]);
  return {
    neighbors: { previous: entry.unit.items[entry.unit.items.indexOf(entry.item) - 1]?.id ?? null, next: entry.unit.items[entry.unit.items.indexOf(entry.item) + 1]?.id ?? null },
    kind: entry.unit.kind, example, points: keyPoints(entry.unit.id, entry.item.id), unitId: entry.unit.id, itemId: entry.item.id, published: entry.unit.status === 'published', grade: jpGrade(entry.unit.id, entry.item.id),
    sets: entry.item.sets.map(set => ({ id: set.id, playable: playable.includes(`${entry.unit.id}/${entry.item.id}/${set.id}`), record: records[set.id], tiers: tiers[set.id] })),
  };
}

export default function MathItem({ loaderData: { unitId, itemId, published, grade, sets, kind, example, points, neighbors } }: Route.ComponentProps) {
  const locale = useLocale();
  const t = useTranslations('App.math') as unknown as DynamicT;
  const tq = useTranslations('App.math.quiz');
  const ti = useTranslations('App.math.itemPage');
  const exampleQuestion = useMathQuestions(kind, example ? [example] : [])[0];
  const has = (key: string) => (t as unknown as { has: (key: string) => boolean }).has(key);
  const unitTitle = t(`units.${unitId}.title`);
  const itemKey = `units.${unitId}.items.${itemId}`;
  const title = t(`${itemKey}.title`);
  const description = has(`${itemKey}.description`) ? t(`${itemKey}.description`) : t(`units.${unitId}.summary`);
  const head = `${unitTitle} - ${title} | PAIBOT`;
  return <>
    {published ? <PublicHead locale={locale} path={`/math/${unitId}/${itemId}`} title={head} description={description} /> : <title>{head}</title>}
    <ToolLayout title={title} centerTitle aboveTitle={<MathBreadcrumb crumbs={[{ label: unitTitle, href: `/math/${unitId}` }, { label: title }]} />}>
      <p className={styles.unit}><Link href={`/math/${unitId}`}>{unitTitle}</Link></p>
      {grade && <p className={styles.grade}>{t('gradeLabel', { grade: t(`grades.${grade}`) })}</p>}
      <h2 className={styles.about}>{ti('about')}</h2>
      <p className={styles.description}>{description}</p>
      <p className={styles.jump}><a href="#practice">{ti('toPractice')}</a></p>
      {points.length > 0 && <details className={styles.section} open>
        <summary>{ti('points')}</summary>
        <div className={styles.points}>{points.map((point, index) => <div key={index} className={styles.point}>
          <p className={styles.pointNote}><MathText text={point[locale as 'ja' | 'en' | 'zh'] ?? point.en} /></p>
          {point.tex && <MathTex tex={point.tex} block />}
        </div>)}</div>
      </details>}
      {exampleQuestion && <details className={styles.section} open>
        <summary>{ti('example')}</summary>
        <div className={styles.example}>
          <div className={styles.exampleQuestion}>{exampleQuestion.prompt}</div>
          <div className={styles.exampleSolution}>{exampleQuestion.explanation}</div>
        </div>
      </details>}
      <p id="practice" className={styles.choose}>{tq('chooseSet')}</p>
      <ul className={styles.sets}>
        {sets.map(({ id, playable, record, tiers }) => (
          <li key={id}>
            <Link href={`/math/${unitId}/${itemId}/${id}`} className={styles.card} data-playable={playable || undefined}>
              <span className={styles.cardTitle}>
                {tq('practice', { number: id })}
                {!playable && <span className={styles.badge}>{t('comingSoon')}</span>}
              </span>
              {has(`${itemKey}.sets.${id}`) && <span className={styles.note}>{t(`${itemKey}.sets.${id}`)}</span>}
              {tiers && <span className={styles.tiers}>{Object.entries(tiers).map(([tier, n]) => tq('tierCount', { tier: t(`tiers.${tier}`), count: n })).join(tq('tierSeparator'))}</span>}
              {record && <span className={styles.record}>{tq('record', { last: record.last, best: record.best, total: record.total })}</span>}
            </Link>
          </li>
        ))}
      </ul>
      {(neighbors.previous || neighbors.next) && <nav className={styles.neighbors} aria-label={ti('neighbors')}>
        {neighbors.previous ? <Link href={`/math/${unitId}/${neighbors.previous}`} rel="prev" className={styles.neighbor}>
          <span className={styles.neighborLabel}>← {ti('previous')}</span>
          <span>{t(`units.${unitId}.items.${neighbors.previous}.title`)}</span>
        </Link> : <span />}
        {neighbors.next ? <Link href={`/math/${unitId}/${neighbors.next}`} rel="next" className={`${styles.neighbor} ${styles.next}`}>
          <span className={styles.neighborLabel}>{ti('next')} →</span>
          <span>{t(`units.${unitId}.items.${neighbors.next}.title`)}</span>
        </Link> : <span />}
      </nav>}
    </ToolLayout>
  </>;
}
