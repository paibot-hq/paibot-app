import { useMemo } from 'react';
import { useLocale, useTranslations } from 'use-intl';
import { expressionQuestions } from '../components/math-expression-questions';
import MathSetQuiz from '../components/math-set-quiz';
import PublicHead from '../components/public-head';
import type { DynamicT } from '../lib/apps';
import { saveAttemptAction } from '../lib/math-attempts.server';
import { getMathSet } from '../lib/math-problems.server';
import { labelKeyForSet } from '../lib/math-arith-sets';
import type { QuizLocale } from '../lib/quiz';
import type { Route } from './+types/math-arith';

// Same 404 pattern as math-factorization.tsx.
export async function loader({ params }: Route.LoaderArgs) {
  const setId = params.setId;
  const labelKey = labelKeyForSet(setId);
  if (!labelKey) throw new Response('Not Found', { status: 404 });
  // Problems are LLM-generated and verified by scripts/check-math-arith.mjs
  // before import; a set with nothing published yet shows "being prepared".
  return { setId, labelKey, problems: await getMathSet('arith', setId) };
}

// A signed-in user's finished attempt (see MathSetQuiz); rescored on the server.
export async function action(args: Route.ActionArgs) {
  if (!labelKeyForSet(args.params.setId)) throw new Response('Not Found', { status: 404 });
  return saveAttemptAction(args, 'arith', setId => getMathSet('arith', setId));
}

export default function MathArith({ loaderData }: Route.ComponentProps) {
  const { setId, problems } = loaderData;
  const locale = useLocale() as QuizLocale;
  const t = useTranslations('App.math.arith');
  // Set label keys are only known at runtime, like the app categories in
  // src/lib/apps.tsx - cast once here, same reasoning.
  const td = t as unknown as DynamicT;
  const setLabel = td(loaderData.labelKey);

  const questions = useMemo(() => expressionQuestions(problems, locale, t), [problems, locale, t]);

  return <><PublicHead locale={locale} path={`/math/arith/${setId}`} title={`${t('title')} - ${setLabel} | PAIBOT.app`} description={t('description')} />
    <MathSetQuiz key={setId} title={t('title')} setLabel={setLabel} backHref="/math/arith" questions={questions} />
  </>;
}
