import { useMemo } from 'react';
import { useLocale, useTranslations } from 'use-intl';
import MathSetQuiz from '../components/math-set-quiz';
import { MathTex } from '../components/math-tex';
import PublicHead from '../components/public-head';
import type { DynamicT } from '../lib/apps';
import { saveAttemptAction } from '../lib/math-attempts.server';
import { expressionTex, solutionTex, statementTex, unknownOf, type FormulaPayload } from '../lib/math-formula';
import { formulaUnitSets, isFormulaUnit, type FormulaUnit } from '../lib/math-formula-units';
import { getMathSet } from '../lib/math-problems.server';
import type { Route } from './+types/math-formula';

// One route for every formula unit (/math/<unit>/:setId, registered per unit
// in src/routes.ts); the unit is the path segment after /math/.
function unitAndSet(request: Request, setId: string): { unit: FormulaUnit; setId: string } {
  const unit = new URL(request.url).pathname.split('/')[3] ?? '';
  if (!isFormulaUnit(unit) || !formulaUnitSets(unit).some(set => set.id === setId)) throw new Response('Not Found', { status: 404 });
  return { unit, setId };
}

// Problems are LLM-generated and verified by scripts/validate-math-formula.mjs
// and SymPy before import; a set with nothing published yet shows "being prepared".
export async function loader({ request, params }: Route.LoaderArgs) {
  const { unit, setId } = unitAndSet(request, params.setId);
  return { unit, setId, problems: await getMathSet(unit, setId) };
}

// A signed-in user's finished attempt (see MathSetQuiz); rescored on the server.
export async function action(args: Route.ActionArgs) {
  const { unit } = unitAndSet(args.request, args.params.setId);
  return saveAttemptAction(args, unit, setId => getMathSet(unit, setId));
}

const choiceTex = (payload: FormulaPayload, choice: string) =>
  payload.kind === 'solve' ? solutionTex(choice, unknownOf(payload.question)) : expressionTex(choice);

export default function MathFormula({ loaderData }: Route.ComponentProps) {
  const { unit, setId, problems } = loaderData;
  const locale = useLocale();
  // Unit and set names are only known at runtime (see src/lib/apps.tsx).
  const t = useTranslations('App.math') as unknown as DynamicT;
  const tf = useTranslations('App.math.formulaQuiz');
  const title = t(`units.${unit}.title`);
  const setLabel = t(`units.${unit}.sets.${setId}`);
  const questions = useMemo(() => problems.map(({ id, answerIndex, payload }) => {
    const question = payload.kind === 'solve' ? statementTex(payload.question) : expressionTex(payload.question);
    return {
      id,
      prompt: <>
        <p>{payload.given ? tf.rich('given', { given: () => <MathTex tex={solutionTex(payload.given!, 'x')} /> }) : tf(payload.kind)}</p>
        <MathTex tex={question} block />
      </>,
      choices: payload.choices.map(choice => <MathTex tex={choiceTex(payload, choice)} />),
      answerIndex,
      explanation: <>{tf('answer')} <MathTex tex={choiceTex(payload, payload.choices[answerIndex])} /></>,
    };
  }), [problems, tf]);
  return <><PublicHead locale={locale} path={`/math/${unit}/${setId}`} title={`${title} - ${setLabel} | PAIBOT.app`} description={t(`units.${unit}.summary`)} />
    <MathSetQuiz key={`${unit}/${setId}`} title={title} setLabel={setLabel} questions={questions} />
  </>;
}
