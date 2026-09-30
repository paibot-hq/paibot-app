import MathColumn from './math-column';
import { MathTex } from './math-tex';
import { expressionTex, formatInteger, type ArithPayload } from '../lib/math-arith';
import type { QuizLocale } from '../lib/quiz';

// Shared display conversion for arithmetic and signed-number payloads.
export function expressionQuestions(
  problems: readonly { id: string; answerIndex: number; payload: ArithPayload }[],
  locale: QuizLocale,
  t: (key: 'formula' | 'valueWithUnit', values?: { value: string; unit: string }) => string,
) {
  return problems.map(problem => {
    const tex = expressionTex(problem.payload.expression);
    const answer = problem.payload.choices[problem.answerIndex];
    const word = problem.payload.word?.[locale];
    return {
      id: problem.id,
      prompt: word ? <p>{word.prompt}</p> : <MathTex tex={tex} block />,
      choices: problem.payload.choices.map(choice => word ? t('valueWithUnit', { value: formatInteger(choice), unit: word.unit }) : formatInteger(choice)),
      answerIndex: problem.answerIndex,
      explanation: <>{t('formula')} <MathTex tex={`${tex} = ${answer}`} />{!word && <MathColumn expression={problem.payload.expression} />}</>,
    };
  });
}
