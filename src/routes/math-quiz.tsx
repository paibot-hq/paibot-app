import { useLocale, useTranslations } from 'use-intl';
import { useMathQuestions } from '../components/math-questions';
import MathSetQuiz from '../components/math-set-quiz';
import PublicHead from '../components/public-head';
import type { DynamicT } from '../lib/apps';
import { saveAttemptAction } from '../lib/math-attempts.server';
import { getMathSet } from '../lib/math-problems.server';
import { catalogEntry } from '../lib/math-routes.server';
import type { Route } from './+types/math-quiz';

// Every practice set: /math/<unit>/<item>/<set>. Problems are LLM-generated and
// verified (scripts/validate-math-*.mjs, SymPy) before import; a set with
// nothing published yet, or a unit that cannot hold problems, shows "being prepared".
export async function loader({ params }: Route.LoaderArgs) {
  const { unit, item, set } = catalogEntry(params);
  return {
    unitId: unit.id, itemId: item.id, setId: set!.id, kind: unit.kind, published: unit.status === 'published',
    several: item.sets.length > 1,
    problems: unit.kind ? await getMathSet(unit.id, item.id, set!.id) : [],
  };
}

// A signed-in user's finished attempt (see MathSetQuiz); rescored on the server.
export async function action(args: Route.ActionArgs) {
  const { unit, item, set } = catalogEntry(args.params);
  return saveAttemptAction(args, { unit: unit.id, item: item.id, setId: set!.id }, () => getMathSet(unit.id, item.id, set!.id));
}

export default function MathQuiz({ loaderData: { unitId, itemId, setId, kind, published, several, problems } }: Route.ComponentProps) {
  const locale = useLocale();
  const t = useTranslations('App.math') as unknown as DynamicT;
  const tq = useTranslations('App.math.quiz');
  const title = t(`units.${unitId}.items.${itemId}.title`);
  // With one set the item's name is enough; otherwise say which practice set.
  const setLabel = several ? `${title} ${tq('practice', { number: setId })}` : title;
  const questions = useMathQuestions(kind, problems).map((question, index) => ({ ...question, tier: problems[index].tier }));
  const head = `${t(`units.${unitId}.title`)} - ${setLabel} | PAIBOT.app`;
  const path = `/math/${unitId}/${itemId}/${setId}`;
  return <>
    {published ? <PublicHead locale={locale} path={path} title={head} description={t(`units.${unitId}.summary`)} /> : <title>{head}</title>}
    <MathSetQuiz key={path} title={t(`units.${unitId}.title`)} setLabel={setLabel} questions={questions} backHref={`/math/${unitId}/${itemId}`} />
  </>;
}
