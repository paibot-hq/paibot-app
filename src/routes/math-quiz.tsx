import { redirect } from 'react-router';
import { useLocale, useTranslations } from 'use-intl';
import { useMathQuestions } from '../components/math-questions';
import MathSetQuiz from '../components/math-set-quiz';
import PublicHead from '../components/public-head';
import type { DynamicT } from '../lib/apps';
import { mathSetVersion, saveAttemptAction } from '../lib/math-attempts.server';
import { getMathSet, getPlayableSets } from '../lib/math-problems.server';
import { nextPlayableSet } from '../lib/math-next-set';
import { catalogEntry } from '../lib/math-routes.server';
import type { Route } from './+types/math-quiz';

// Every practice set: /math/<unit>/<item>/<set>. Problems are LLM-generated and
// verified (scripts/validate-math-*.mjs, SymPy) before import; a set with
// nothing published yet, or a unit that cannot hold problems, shows "being prepared".
// Sets that were taken down (new items start with practice 1 only): their old URLs go to the item's first set.
const REMOVED_SETS: Record<string, string> = { 'arith/order-of-operations/2': 'order-of-operations/1' };

export async function loader({ params }: Route.LoaderArgs) {
  const moved = REMOVED_SETS[`${params.unit}/${params.item}/${params.set}`];
  if (moved) throw redirect(`/${params.locale}/math/${params.unit}/${moved}`, 301);
  const { unit, item, set } = catalogEntry(params);
  const [problems, playable] = await Promise.all([unit.kind ? getMathSet(unit.id, item.id, set!.id) : [], getPlayableSets()]);
  return {
    next: nextPlayableSet(unit, item.id, set!.id, playable),
    unitId: unit.id, itemId: item.id, setId: set!.id, kind: unit.kind, published: unit.status === 'published',
    several: item.sets.length > 1, problems, version: await mathSetVersion(problems),
  };
}

// A signed-in user's finished attempt (see MathSetQuiz); rescored on the server.
export async function action(args: Route.ActionArgs) {
  const { unit, item, set } = catalogEntry(args.params);
  return saveAttemptAction(args, { unit: unit.id, item: item.id, setId: set!.id }, () => getMathSet(unit.id, item.id, set!.id));
}

export default function MathQuiz({ loaderData: { unitId, itemId, setId, kind, published, several, problems, version, next } }: Route.ComponentProps) {
  const locale = useLocale();
  const t = useTranslations('App.math') as unknown as DynamicT;
  const tq = useTranslations('App.math.quiz');
  const title = t(`units.${unitId}.items.${itemId}.title`);
  // With one set the item's name is enough; otherwise say which practice set.
  const setLabel = several ? `${title} ${tq('practice', { number: setId })}` : title;
  const questions = useMathQuestions(kind, problems).map((question, index) => ({ ...question, tier: problems[index].tier }));
  const head = `${t(`units.${unitId}.title`)} - ${setLabel} | PAIBOT.app`;
  const path = `/math/${unitId}/${itemId}/${setId}`;
  const nextTitle = next && t(`units.${unitId}.items.${next.item}.title`);
  return <>
    {published ? <PublicHead locale={locale} path={path} title={head} description={t(`units.${unitId}.summary`)} /> : <title>{head}</title>}
    <MathSetQuiz key={`${path}:${version}`} version={version} sharePath={path} current={{ unit: unitId, item: itemId, set: setId }}
      next={next && { set: { unit: unitId, item: next.item, set: next.set }, href: `/math/${unitId}/${next.item}/${next.set}`, label: next.several ? `${nextTitle} ${tq('practice', { number: next.set })}` : nextTitle! }}
      title={t(`units.${unitId}.title`)} setLabel={setLabel} questions={questions} crumbs={[{ label: t(`units.${unitId}.title`), href: `/math/${unitId}` }, { label: title, href: `/math/${unitId}/${itemId}` }, { label: tq('practice', { number: setId }) }]} />
  </>;
}
