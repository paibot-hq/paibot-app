import { useMemo } from 'react';
import { useLocale, useTranslations } from 'use-intl';
import { expressionQuestions } from './math-expression-questions';
import MathFigure from './math-figure';
import type { MathSetQuestion } from './math-set-quiz';
import { MathTex } from './math-tex';
import styles from './math-questions.module.css';
import type { ArithPayload } from '../lib/math-arith';
import type { MathKind } from '../lib/math-catalog';
import { factoredTex, trinomialTex, type FactorizationPayload } from '../lib/math-factorization';
import { formulaChoiceTex, formulaInstruction, formulaQuestionTex, stepRows, type FormulaPayload } from '../lib/math-formula';
import { explanationTex, lengthTex, type PythagorasPayload } from '../lib/math-pythagoras';
import type { QuizLocale } from '../lib/quiz';

type FormulaT = ReturnType<typeof useTranslations<'App.math.formulaQuiz'>>;

// The line above a formula problem, by kind; math in it (the point, divisor,
// bounds) is rendered inline.
function formulaInstructionLine(p: FormulaPayload, tq: FormulaT) {
  const { key, tex } = formulaInstruction(p);
  return tq.rich(key as Parameters<FormulaT>[0], Object.fromEntries(Object.entries(tex).map(([tag, t]) => [tag, () => <MathTex tex={t} />])));
}

export type MathProblemRow = { id: string; answerIndex: number; payload: unknown };


// Turns a set's locale-neutral problems into quiz questions, by the unit's kind
// (see MathKind in src/lib/math-catalog.ts). Only explanations and prompts
// depend on the locale.
export function useMathQuestions(kind: MathKind | undefined, problems: readonly MathProblemRow[]): MathSetQuestion[] {
  const locale = useLocale() as QuizLocale;
  const ta = useTranslations('App.math.arith');
  const tf = useTranslations('App.math.factorization');
  const tp = useTranslations('App.math.pythagoras');
  const tq = useTranslations('App.math.formulaQuiz');
  return useMemo(() => {
    switch (kind) {
      case 'expression':
        return expressionQuestions(problems as { id: string; answerIndex: number; payload: ArithPayload }[], locale, ta);
      case 'factorization':
        return (problems as { id: string; answerIndex: number; payload: FactorizationPayload }[]).map(({ id, answerIndex, payload: { p, q, choices } }) => ({
          id, answerIndex,
          prompt: <MathTex tex={trinomialTex(p, q)} block />,
          choices: choices.map(choice => <MathTex tex={factoredTex(choice)} />),
          explanation: tf('explanationTemplate', { p, q, a: p + q, b: p * q }),
        }));
      case 'pythagoras':
        return (problems as { id: string; answerIndex: number; payload: PythagorasPayload }[]).map(({ id, answerIndex, payload }) => ({
          id, answerIndex,
          prompt: <><p>{tp('prompt')}</p><MathFigure figure={payload.figure} /></>,
          choices: payload.choices.map(choice => <MathTex tex={lengthTex(choice)} />),
          explanation: <>{tp('explanationPrefix')} <MathTex tex={explanationTex(payload.figure)} /></>,
        }));
      case 'formula':
        return (problems as { id: string; answerIndex: number; payload: FormulaPayload }[]).map(({ id, answerIndex, payload }) => ({
          id, answerIndex,
          prompt: <>
            <p>{formulaInstructionLine(payload, tq)}</p>
            <MathTex tex={formulaQuestionTex(payload)} block />
          </>,
          choices: payload.choices.map(choice => <MathTex tex={formulaChoiceTex(payload, choice)} />),
          explanation: <>
            {payload.steps && <div className={styles.steps}>{payload.steps.flatMap(line => stepRows(line)).map((row, index) => <div key={index} className={styles.row}>{row.map((piece, at) => <MathTex key={at} tex={`{{}${piece}}`} />)}</div>)}</div>}
            {tq('answer')} <MathTex tex={formulaChoiceTex(payload, payload.choices[answerIndex])} />
          </>,
        }));
      default:
        return [];
    }
  }, [kind, problems, locale, ta, tf, tp, tq]);
}
