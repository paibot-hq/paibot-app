import { useLocale, useTranslations } from 'use-intl';
import PublicHead from '../components/public-head';
import MathBreadcrumb from '../components/math-breadcrumb';
import ToolLayout from '../components/tool-layout';
import { Link } from '../i18n/navigation';
import type { DynamicT } from '../lib/apps';
import { jpGrade } from '../lib/math-curriculum-jp';
import { getDoneSets } from '../lib/math-attempts.server';
import { useDoneSets } from '../lib/math-local-done';
import { getPlayableSets } from '../lib/math-problems.server';
import { findUnit } from '../lib/math-catalog';
import styles from './math-unit.module.css';
import type { Route } from './+types/math-unit';

// A unit: what it covers and its learning items, each linking to its page
// where a practice set is chosen. Items with published problems are highlighted.
export async function loader(args: Route.LoaderArgs) {
  const { params } = args;
  const unit = findUnit(params.unit);
  if (!unit) throw new Response('Not Found', { status: 404 });
  const [playable, finished] = await Promise.all([getPlayableSets(), getDoneSets(args)]);
  return {
    unitId: unit.id, published: unit.status === 'published', stage: unit.stage, domain: unit.domain,
    finished: finished.filter(set => set.startsWith(`${unit.id}/`)),
    items: unit.items.map(item => ({
      id: item.id, grade: jpGrade(unit.id, item.id),
      // The item's sets that have problems, as "unit/item/set": it is done (green) when all of them are finished.
      sets: item.sets.map(set => `${unit.id}/${item.id}/${set.id}`).filter(set => playable.includes(set)),
    })),
  };
}

export default function MathUnit({ loaderData: { unitId, published, stage, domain, items, finished } }: Route.ComponentProps) {
  const locale = useLocale();
  const t = useTranslations('App.math') as unknown as DynamicT;
  const tq = useTranslations('App.math.quiz');
  const has = (key: string) => (t as unknown as { has: (key: string) => boolean }).has(key);
  const title = t(`units.${unitId}.title`);
  const description = t(`units.${unitId}.summary`);
  const head = `${title} | PAIBOT.app`;
  const done = useDoneSets(finished);
  return <>
    {published ? <PublicHead locale={locale} path={`/math/${unitId}`} title={head} description={description} /> : <title>{head}</title>}
    <ToolLayout title={title} centerTitle aboveTitle={<MathBreadcrumb crumbs={[{ label: title }]} />}>
      <p className={styles.meta}>{t(`domains.${domain}`)}・{t(`stages.${stage}`)}</p>
      <p className={styles.description}>{description}</p>
      <p className={styles.choose}>{tq('chooseItem')}</p>
      <ul className={styles.items}>
        {items.map(({ id, grade, sets }) => {
          const playable = sets.length > 0;
          const itemDone = playable && sets.every(set => done.includes(set));
          return <li key={id}>
            <Link href={`/math/${unitId}/${id}`} className={styles.card} data-playable={playable || undefined} data-done={itemDone || undefined}>
              <span className={styles.cardTitle}>
                {t(`units.${unitId}.items.${id}.title`)}
                {!playable && <span className={styles.badge}>{t('comingSoon')}</span>}
                {itemDone && <span className={styles.done}>{t('quiz.done')}</span>}
              </span>
              {has(`units.${unitId}.items.${id}.summary`) && <span className={styles.note}>{t(`units.${unitId}.items.${id}.summary`)}</span>}
              {grade && <span className={styles.grade}>{t('gradeLabel', { grade: t(`grades.${grade}`) })}</span>}
            </Link>
          </li>;
        })}
      </ul>
    </ToolLayout>
  </>;
}
