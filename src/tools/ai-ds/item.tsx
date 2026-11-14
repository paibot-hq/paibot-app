import { useLocale, useTranslations } from 'use-intl';
import ToolLayout from '../../components/tool-layout';
import { Link } from '../../i18n/navigation';
import type { DynamicT } from '../../lib/apps';
import AiDsBreadcrumb from './breadcrumb';
import { findAiDsItem } from './catalog';
import { getPlayableAiDsSets } from './problems';
import ExamTags from './exam-tags';
import styles from './ai-ds.module.css';
import type { Route } from './+types/item';

// /ai-ds/<unit>/<item>: the learning item, what it covers, the exams it belongs to and its practice sets (練習1, 2, ...).
export async function loader({ params }: Route.LoaderArgs) {
  const item = findAiDsItem(params.unit, params.item);
  if (!item) throw new Response('Not Found', { status: 404 });
  const playable = getPlayableAiDsSets();
  return {
    unit: params.unit!, item: item.id, exams: item.exams,
    sets: item.sets.map(set => ({ id: set.id, ready: playable.includes(`${params.unit}/${item.id}/${set.id}`) })),
  };
}

export default function AiDsItem({ loaderData: { unit, item, exams, sets } }: Route.ComponentProps) {
  const t = useTranslations('App.aiDs') as unknown as DynamicT;
  const locale = useLocale();
  const title = t(`units.${unit}.items.${item}.title`);
  return <>
    <title>{`${title} | ${t('title')} | PAIBOT.app`}</title>
    <ToolLayout title={title} centerTitle aboveTitle={<AiDsBreadcrumb crumbs={[{ label: title }]} />}>
      <p className={styles.meta}>{t(`units.${unit}.title`)}</p>
      <p className={styles.metaTags}><ExamTags exams={exams} /></p>
      <p className={styles.topics}>{t(`units.${unit}.items.${item}.topics`)}</p>
      <p className={styles.choose}>{t('chooseSet')}</p>
      <ul className={styles.items}>
        {sets.map(set => <li key={set.id}>
          <Link href={`/ai-ds/${unit}/${item}/${set.id}`} className={styles.card} data-playable={set.ready || undefined}>
            <span className={styles.cardTitle}>
              {t('setLabel', { n: set.id })}
              {!set.ready && <span className={styles.badge}>{t('comingSoon')}</span>}
            </span>
          </Link>
        </li>)}
      </ul>
      {locale !== 'ja' && <p className={styles.note}>{t('problemsInJapanese')}</p>}
    </ToolLayout>
  </>;
}
