import { useMemo } from 'react';
import { useLocale, useTranslations } from 'use-intl';
import { expressionQuestions } from '../components/math-expression-questions';
import MathSetQuiz from '../components/math-set-quiz';
import PublicHead from '../components/public-head';
import type { DynamicT } from '../lib/apps';
import { saveAttemptAction } from '../lib/math-attempts.server';
import { expressionUnitSets, isExpressionUnit, type ExpressionUnit } from '../lib/math-expression-units';
import { getMathSet } from '../lib/math-problems.server';
import type { QuizLocale } from '../lib/quiz';
import type { Route } from './+types/math-expression';

// One route for every expression unit (/math/<unit>/:setId, registered per
// unit in src/routes.ts); the unit is the path segment after /math/.
function unitAndSet(request: Request, setId: string): { unit: ExpressionUnit; setId: string } {
  const unit = new URL(request.url).pathname.split('/')[3] ?? '';
  if (!isExpressionUnit(unit) || !expressionUnitSets(unit).some(set => set.id === setId)) throw new Response('Not Found', { status: 404 });
  return { unit, setId };
}

// Problems are LLM-generated and verified by scripts/validate-math-arith.mjs
// before import; a set with nothing published yet shows "being prepared".
export async function loader({ request, params }: Route.LoaderArgs) {
  const { unit, setId } = unitAndSet(request, params.setId);
  return { unit, setId, problems: await getMathSet(unit, setId) };
}

// A signed-in user's finished attempt (see MathSetQuiz); rescored on the server.
export async function action(args: Route.ActionArgs) {
  const { unit } = unitAndSet(args.request, args.params.setId);
  return saveAttemptAction(args, unit, setId => getMathSet(unit, setId));
}

export default function MathExpression({ loaderData }: Route.ComponentProps) {
  const { unit, setId, problems } = loaderData;
  const locale = useLocale() as QuizLocale;
  // Unit and set names are only known at runtime (see src/lib/apps.tsx).
  const t = useTranslations('App.math') as unknown as DynamicT;
  const ta = useTranslations('App.math.arith');
  const title = t(`units.${unit}.title`);
  const setLabel = t(`units.${unit}.sets.${setId}`);
  const questions = useMemo(() => expressionQuestions(problems, locale, ta), [problems, locale, ta]);
  return <><PublicHead locale={locale} path={`/math/${unit}/${setId}`} title={`${title} - ${setLabel} | PAIBOT.app`} description={t(`units.${unit}.summary`)} />
    <MathSetQuiz key={`${unit}/${setId}`} title={title} setLabel={setLabel} questions={questions} />
  </>;
}
