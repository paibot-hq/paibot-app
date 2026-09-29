import { useMemo } from 'react';
import { useLocale, useTranslations } from 'use-intl';
import { MathTex } from '../components/math-tex';
import MathSetQuiz from '../components/math-set-quiz';
import PublicHead from '../components/public-head';
import type { DynamicT } from '../lib/apps';
import { saveAttemptAction } from '../lib/math-attempts.server';
import { lengthTex, explanationTex } from '../lib/math-pythagoras';
import MathFigure from '../components/math-figure';
import { getMathSet } from '../lib/math-problems.server';
import { labelKeyForSet } from '../lib/math-pythagoras-sets';
import type { Route } from './+types/math-pythagoras';

// Same 404 pattern as locale.tsx's isLocale check: an invalid setId is a
// routing error, not a state the UI needs to render around.
export async function loader({ params }: Route.LoaderArgs) {
  const setId = params.setId;
  const labelKey = labelKeyForSet(setId);
  if (!labelKey) throw new Response('Not Found', { status: 404 });
  // Problems are LLM-generated and verified by scripts/validate-math-pythagoras.mjs
  // before import; a set with nothing published yet shows "being prepared".
  return { setId, labelKey, problems: await getMathSet('pythagoras', setId) };
}

// A signed-in user's finished attempt (see MathSetQuiz); rescored on the server.
export async function action(args: Route.ActionArgs) {
  if (!labelKeyForSet(args.params.setId)) throw new Response('Not Found', { status: 404 });
  return saveAttemptAction(args, 'pythagoras', setId => getMathSet('pythagoras', setId));
}

export default function MathPythagoras({ loaderData }: Route.ComponentProps) {
  const { setId, problems } = loaderData;
  const locale = useLocale();
  const t = useTranslations('App.math.pythagoras');
  // Set label keys are only known at runtime, like the app categories in
  // src/lib/apps.tsx - cast once here, same reasoning.
  const td = t as unknown as DynamicT;
  const setLabel = td(loaderData.labelKey);

  // Problems are locale-neutral numbers; only the explanation text depends
  // on locale, so it is built here from the translated template.
  const questions = useMemo(() => problems.map(problem => ({
    id: problem.id,
    prompt: <><p>{t('prompt')}</p><MathFigure figure={problem.payload.figure} /></>,
    choices: problem.payload.choices.map(choice => <MathTex tex={lengthTex(choice)} />),
    answerIndex: problem.answerIndex,
    explanation: <>{t('explanationPrefix')} <MathTex tex={explanationTex(problem.payload.figure)} /></>,
  })), [problems, t]);

  return <><PublicHead locale={locale} path={`/math/pythagoras/${setId}`} title={`${t('title')} - ${setLabel} | PAIBOT.app`} description={t('description')} />
    <MathSetQuiz key={setId} title={t('title')} setLabel={setLabel} questions={questions} />
  </>;
}
