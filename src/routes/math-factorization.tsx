import { useMemo } from 'react';
import { useLocale, useTranslations } from 'use-intl';
import { MathTex } from '../components/math-tex';
import MathSetQuiz from '../components/math-set-quiz';
import PublicHead from '../components/public-head';
import type { DynamicT } from '../lib/apps';
import { saveAttemptAction } from '../lib/math-attempts.server';
import { factoredTex, trinomialTex } from '../lib/math-factorization';
import { getMathSet } from '../lib/math-problems.server';
import { labelKeyForSet } from '../lib/math-factorization-sets';
import type { Route } from './+types/math-factorization';

// Same 404 pattern as locale.tsx's isLocale check: an invalid setId is a
// routing error, not a state the UI needs to render around.
export async function loader({ params }: Route.LoaderArgs) {
  const setId = Number(params.setId);
  if (!Number.isInteger(setId) || setId < 1) throw new Response('Not Found', { status: 404 });
  // Problems are LLM-generated and verified by scripts/check-math-factorization.mjs
  // before import; a set with nothing published yet shows "being prepared".
  return { setId, problems: await getMathSet('factorization', setId) };
}

// A signed-in user's finished attempt (see MathSetQuiz); rescored on the server.
export async function action(args: Route.ActionArgs) {
  return saveAttemptAction(args, 'factorization', setId => getMathSet('factorization', setId));
}

export default function MathFactorization({ loaderData }: Route.ComponentProps) {
  const { setId, problems } = loaderData;
  const locale = useLocale();
  const t = useTranslations('App.math.factorization');
  // Set label keys are only known at runtime, like the app categories in
  // src/lib/apps.tsx - cast once here, same reasoning.
  const td = t as unknown as DynamicT;
  const setLabel = td(labelKeyForSet(setId));

  // Problems are locale-neutral numbers; only the explanation text depends
  // on locale, so it is built here from the translated template.
  const questions = useMemo(() => problems.map(problem => ({
    id: problem.id,
    prompt: <MathTex tex={trinomialTex(problem.payload.p, problem.payload.q)} block />,
    choices: problem.payload.choices.map(choice => <MathTex tex={factoredTex(choice)} />),
    answerIndex: problem.answerIndex,
    explanation: t('explanationTemplate', { p: problem.payload.p, q: problem.payload.q, a: problem.payload.p + problem.payload.q, b: problem.payload.p * problem.payload.q }),
  })), [problems, t]);

  return <><PublicHead locale={locale} path={`/math/factorization/${setId}`} title={`${t('title')} - ${setLabel} | PAIBOT.app`} description={t('description')} />
    <MathSetQuiz key={setId} title={t('title')} setLabel={setLabel} backHref="/math/factorization" questions={questions} />
  </>;
}
