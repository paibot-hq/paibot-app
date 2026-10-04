import { useLocale, useTranslations } from 'use-intl';
import PublicHead from '../components/public-head';
import MathBreadcrumb from '../components/math-breadcrumb';
import ToolLayout from '../components/tool-layout';
import { Link } from '../i18n/navigation';
import type { DynamicT } from '../lib/apps';
import { jpGrade } from '../lib/math-curriculum-jp';
import { getPlayableSets } from '../lib/math-problems.server';
import { findUnit } from '../lib/math-catalog';
import styles from './math-unit.module.css';
import type { Route } from './+types/math-unit';

// A unit: what it covers and its learning items, each linking to its page
// where a practice set is chosen. Items with published problems are highlighted.
export async function loader({ params }: Route.LoaderArgs) {
  const unit = findUnit(params.unit);
  if (!unit) throw new Response('Not Found', { status: 404 });
  const playable = await getPlayableSets();
  return {
    unitId: unit.id, published: unit.status === 'published', stage: unit.stage, domain: unit.domain,
    items: unit.items.map(item => ({
      id: item.id, grade: jpGrade(unit.id, item.id),
      playable: item.sets.some(set => playable.includes(`${unit.id}/${item.id}/${set.id}`)),
    })),
  };
}

export default function MathUnit({ loaderData: { unitId, published, stage, domain, items } }: Route.ComponentProps) {
  const locale = useLocale();
  const t = useTranslations('App.math') as unknown as DynamicT;
  const tq = useTranslations('App.math.quiz');
  const has = (key: string) => (t as unknown as { has: (key: string) => boolean }).has(key);
  const title = t(`units.${unitId}.title`);
  const description = t(`units.${unitId}.summary`);
  const head = `${title} | PAIBOT`;
  return <>
    {published ? <PublicHead locale={locale} path={`/math/${unitId}`} title={head} description={description} /> : <title>{head}</title>}
    <ToolLayout title={title} centerTitle aboveTitle={<MathBreadcrumb crumbs={[{ label: title }]} />}>
      <p className={styles.meta}>{t(`domains.${domain}`)}・{t(`stages.${stage}`)}</p>
      <p className={styles.description}>{description}</p>
      <p className={styles.choose}>{tq('chooseItem')}</p>
      <ul className={styles.items}>
        {items.map(({ id, grade, playable }) => (
          <li key={id}>
            <Link href={`/math/${unitId}/${id}`} className={styles.card} data-playable={playable || undefined}>
              <span className={styles.cardTitle}>
                {t(`units.${unitId}.items.${id}.title`)}
                {!playable && <span className={styles.badge}>{t('comingSoon')}</span>}
              </span>
              {has(`units.${unitId}.items.${id}.summary`) && <span className={styles.note}>{t(`units.${unitId}.items.${id}.summary`)}</span>}
              {grade && <span className={styles.grade}>{t('gradeLabel', { grade: t(`grades.${grade}`) })}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </ToolLayout>
  </>;
}
