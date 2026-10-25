import { useTranslations } from 'use-intl';
import ToolLayout from '../../components/tool-layout';
import type { DynamicT } from '../../lib/apps';
import EnglishBreadcrumb from './breadcrumb';
import { findEnglishItem } from './catalog';
import { getEnglishSet } from './problems.server';
import EnglishQuiz from './quiz';
import { countResultAction } from './results.server';
import styles from './english.module.css';
import type { Route } from './+types/set';

function findSet(params: { unit?: string; item?: string; set?: string }) {
  const item = findEnglishItem(params.unit, params.item);
  const at = item?.sets.findIndex(entry => entry.id === params.set) ?? -1;
  if (!item || at < 0) throw new Response('Not Found', { status: 404 });
  return { unit: params.unit!, item, set: item.sets[at], next: item.sets[at + 1] ?? null };
}

// /english/<unit>/<item>/<set>: a five-problem, four-choice quiz (quiz.tsx), or "being prepared" while the set has no published
// problems. Then on to the item's next set, if any.
export async function loader({ params }: Route.LoaderArgs) {
  const { unit, item, set, next } = findSet(params);
  let questions: Awaited<ReturnType<typeof getEnglishSet>> = [];
  try { questions = await getEnglishSet(unit, item.id, set.id); } catch { /* shown as being prepared */ }
  return { unit, item: item.id, set: set.id, next: next?.id ?? null, questions };
}

export async function action({ params, request }: Route.ActionArgs) {
  const { unit, item, set } = findSet(params);
  return countResultAction(request, { unit, item: item.id, setId: set.id }, () => getEnglishSet(unit, item.id, set.id));
}

export default function EnglishSet({ loaderData: { unit, item, set, next, questions } }: Route.ComponentProps) {
  const t = useTranslations('App.english') as unknown as DynamicT;
  const itemTitle = t(`units.${unit}.items.${item}`);
  const title = t('setLabel', { n: set });
  const crumbs = [{ label: itemTitle, href: `/english/${unit}/${item}` }, { label: title }];
  const head = <title>{`${itemTitle} ${title} | ${t('title')} | PAIBOT.app`}</title>;
  if (!questions.length) return <>
    {head}
    <ToolLayout title={itemTitle} centerTitle aboveTitle={<EnglishBreadcrumb crumbs={crumbs} />}>
      <p className={styles.meta}>{title}</p>
      <p className={styles.preparing}>{t('preparing')}</p>
    </ToolLayout>
  </>;
  return <>
    {head}
    {/* key: moving to the next set starts a fresh quiz. */}
    <EnglishQuiz key={`${unit}/${item}/${set}`} title={itemTitle} setLabel={title} questions={questions} crumbs={crumbs}
      next={next ? { href: `/english/${unit}/${item}/${next}`, label: t('setLabel', { n: next }) } : null} />
  </>;
}
