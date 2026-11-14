import { useTranslations } from 'use-intl';
import ToolLayout from '../../components/tool-layout';
import type { DynamicT } from '../../lib/apps';
import AiDsBreadcrumb from './breadcrumb';
import { findAiDsItem } from './catalog';
import { getAiDsSet } from './problems';
import AiDsQuiz from './quiz';
import styles from './ai-ds.module.css';
import type { Route } from './+types/set';

// /ai-ds/<unit>/<item>/<set>: a five-problem, four-choice quiz (quiz.tsx), or "being prepared" while the set has no published
// problems. Then on to the item's next set, if any.
export async function loader({ params }: Route.LoaderArgs) {
  const item = findAiDsItem(params.unit, params.item);
  const at = item?.sets.findIndex(entry => entry.id === params.set) ?? -1;
  if (!item || at < 0) throw new Response('Not Found', { status: 404 });
  const set = item.sets[at];
  return { unit: params.unit!, item: item.id, set: set.id, next: item.sets[at + 1]?.id ?? null, questions: getAiDsSet(params.unit!, item.id, set.id) };
}

export default function AiDsSet({ loaderData: { unit, item, set, next, questions } }: Route.ComponentProps) {
  const t = useTranslations('App.aiDs') as unknown as DynamicT;
  const itemTitle = t(`units.${unit}.items.${item}.title`);
  const title = t('setLabel', { n: set });
  const crumbs = [{ label: itemTitle, href: `/ai-ds/${unit}/${item}` }, { label: title }];
  const head = <title>{`${itemTitle} ${title} | ${t('title')} | PAIBOT.app`}</title>;
  if (!questions.length) return <>
    {head}
    <ToolLayout title={itemTitle} centerTitle aboveTitle={<AiDsBreadcrumb crumbs={crumbs} />}>
      <p className={styles.meta}>{title}</p>
      <p className={styles.preparing}>{t('preparing')}</p>
    </ToolLayout>
  </>;
  return <>
    {head}
    {/* key: moving to the next set starts a fresh quiz. */}
    <AiDsQuiz key={`${unit}/${item}/${set}`} title={itemTitle} setLabel={title} questions={questions} crumbs={crumbs}
      next={next ? { href: `/ai-ds/${unit}/${item}/${next}`, label: t('setLabel', { n: next }) } : null} />
  </>;
}
