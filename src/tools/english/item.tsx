import { useTranslations } from 'use-intl';
import ToolLayout from '../../components/tool-layout';
import { Link } from '../../i18n/navigation';
import type { DynamicT } from '../../lib/apps';
import EnglishBreadcrumb from './breadcrumb';
import { findEnglishItem } from './catalog';
import { getPlayableEnglishSets } from './problems.server';
import styles from './english.module.css';
import type { Route } from './+types/item';

// /english/<unit>/<item>: the learning item, its level and its practice sets (練習1, 2, ...).
export async function loader({ params }: Route.LoaderArgs) {
  const item = findEnglishItem(params.unit, params.item);
  if (!item) throw new Response('Not Found', { status: 404 });
  const playable = await getPlayableEnglishSets();
  return {
    unit: params.unit, item: item.id, grade: item.grade,
    sets: item.sets.map(set => ({ id: set.id, ready: playable.includes(`${params.unit}/${item.id}/${set.id}`) })),
  };
}

export default function EnglishItem({ loaderData: { unit, item, grade, sets } }: Route.ComponentProps) {
  const t = useTranslations('App.english') as unknown as DynamicT;
  const title = t(`units.${unit}.items.${item}`);
  return <>
    <title>{`${title} | ${t('title')} | PAIBOT.app`}</title>
    <ToolLayout title={title} centerTitle aboveTitle={<EnglishBreadcrumb crumbs={[{ label: title }]} />}>
      <p className={styles.meta}>{t(`units.${unit}.title`)}・{t('gradeLabel', { grade: t(`grades.${grade}`) })}</p>
      <p className={styles.choose}>{t('chooseSet')}</p>
      <ul className={styles.items}>
        {sets.map(set => <li key={set.id}>
          <Link href={`/english/${unit}/${item}/${set.id}`} className={styles.card} data-playable={set.ready || undefined}>
            <span className={styles.cardTitle}>
              {t('setLabel', { n: set.id })}
              {!set.ready && <span className={styles.badge}>{t('comingSoon')}</span>}
            </span>
          </Link>
        </li>)}
      </ul>
    </ToolLayout>
  </>;
}
