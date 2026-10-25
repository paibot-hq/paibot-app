import { useTranslations } from 'use-intl';
import ToolLayout from '../../components/tool-layout';
import type { DynamicT } from '../../lib/apps';
import EnglishBreadcrumb from './breadcrumb';
import { findEnglishItem } from './catalog';
import styles from './english.module.css';
import type { Route } from './+types/set';

// /english/<unit>/<item>/<set>: a five-problem, four-choice quiz. No set has problems yet, so every set is shown as
// being prepared; the quiz comes with the first problems (stage 2 of docs/plans/english-practice.md).
export async function loader({ params }: Route.LoaderArgs) {
  const item = findEnglishItem(params.unit, params.item);
  const set = item?.sets.find(entry => entry.id === params.set);
  if (!item || !set) throw new Response('Not Found', { status: 404 });
  return { unit: params.unit, item: item.id, set: set.id };
}

export default function EnglishSet({ loaderData: { unit, item, set } }: Route.ComponentProps) {
  const t = useTranslations('App.english') as unknown as DynamicT;
  const itemTitle = t(`units.${unit}.items.${item}`);
  const title = t('setLabel', { n: set });
  return <>
    <title>{`${itemTitle} ${title} | ${t('title')} | PAIBOT.app`}</title>
    <ToolLayout title={itemTitle} centerTitle aboveTitle={<EnglishBreadcrumb crumbs={[{ label: itemTitle, href: `/english/${unit}/${item}` }, { label: title }]} />}>
      <p className={styles.meta}>{title}</p>
      <p className={styles.preparing}>{t('preparing')}</p>
    </ToolLayout>
  </>;
}
