import { useMemo } from 'react';
import { useLocale, useTranslations } from 'use-intl';
import { MathTex } from '../components/math-tex';
import MathSetQuiz from '../components/math-set-quiz';
import PublicHead from '../components/public-head';
import type { DynamicT } from '../lib/apps';
import { saveAttemptAction } from '../lib/math-attempts.server';
import { expressionTex, formatInteger } from '../lib/math-arith';
import { getMathSet } from '../lib/math-problems.server';
import { labelKeyForSet } from '../lib/math-arith-sets';
import type { QuizLocale } from '../lib/quiz';
import type { Route } from './+types/math-arith';

// Same 404 pattern as math-factorization.tsx.
export async function loader({ params }: Route.LoaderArgs) {
  const setId = Number(params.setId);
  if (!Number.isInteger(setId) || setId < 1) throw new Response('Not Found', { status: 404 });
  // Problems are LLM-generated and verified by scripts/check-math-arith.mjs
  // before import; a set with nothing published yet shows "being prepared".
  return { setId, problems: await getMathSet('arith', setId) };
}

// A signed-in user's finished attempt (see MathSetQuiz); rescored on the server.
export async function action(args: Route.ActionArgs) {
  return saveAttemptAction(args, 'arith', setId => getMathSet('arith', setId));
}

export default function MathArith({ loaderData }: Route.ComponentProps) {
  const { setId, problems } = loaderData;
  const locale = useLocale() as QuizLocale;
  const t = useTranslations('App.math.arith');
  // Set label keys are only known at runtime, like the app categories in
  // src/lib/apps.tsx - cast once here, same reasoning.
  const td = t as unknown as DynamicT;
  const setLabel = td(labelKeyForSet(setId));

  // A word problem shows its prose and unit-labelled choices; a calculation
  // shows the expression. Either way the explanation is the solving expression.
  const questions = useMemo(() => problems.map(problem => {
    const tex = expressionTex(problem.payload.expression);
    const answer = problem.payload.choices[problem.answerIndex];
    const word = problem.payload.word?.[locale];
    return {
      id: problem.id,
      prompt: word ? <p>{word.prompt}</p> : <MathTex tex={tex} block />,
      choices: problem.payload.choices.map(choice => word ? t('valueWithUnit', { value: formatInteger(choice), unit: word.unit }) : formatInteger(choice)),
      answerIndex: problem.answerIndex,
      explanation: <>{t('formula')} <MathTex tex={`${tex} = ${answer}`} /></>,
    };
  }), [problems, locale, t]);

  return <><PublicHead locale={locale} path={`/math/arith/${setId}`} title={`${t('title')} - ${setLabel} | PAIBOT.app`} description={t('description')} />
    <MathSetQuiz key={setId} title={t('title')} setLabel={setLabel} backHref="/math/arith" questions={questions} />
  </>;
}
