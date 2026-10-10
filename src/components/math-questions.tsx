import { useMemo } from 'react';
import { useLocale, useTranslations } from 'use-intl';
import { expressionQuestions } from './math-expression-questions';
import MathFigure from './math-figure';
import MathColumn from './math-column';
import MathGraph from './math-graph';
import MathShape from './math-shape';
import type { MathSetQuestion } from './math-set-quiz';
import { MathTex } from './math-tex';
import styles from './math-questions.module.css';
import type { ArithPayload } from '../lib/math-arith';
import type { MathKind } from '../lib/math-catalog';
import { factoredTex, trinomialTex, type FactorizationPayload } from '../lib/math-factorization';
import { formulaChoiceLabel, formulaChoiceTex, formulaInstruction, formulaQuestionTex, stepRows, type FormulaPayload } from '../lib/math-formula';
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
  const context = useQuestionContext();
  return useMemo(() => buildQuestions(kind, problems, context), [kind, problems, context]);
}

// The same for problems of several units, each with its unit's kind (a school year's test).
export function useMixedMathQuestions(problems: readonly (MathProblemRow & { kind: MathKind | undefined })[]): MathSetQuestion[] {
  const context = useQuestionContext();
  return useMemo(() => problems.flatMap(problem => buildQuestions(problem.kind, [problem], context)), [problems, context]);
}

type QuestionContext = ReturnType<typeof useQuestionContext>;
function useQuestionContext() {
  const locale = useLocale() as QuizLocale;
  const ta = useTranslations('App.math.arith');
  const tf = useTranslations('App.math.factorization');
  const tp = useTranslations('App.math.pythagoras');
  const tq = useTranslations('App.math.formulaQuiz');
  return useMemo(() => ({ locale, ta, tf, tp, tq }), [locale, ta, tf, tp, tq]);
}

function buildQuestions(kind: MathKind | undefined, problems: readonly MathProblemRow[], { locale, ta, tf, tp, tq }: QuestionContext): MathSetQuestion[] {
  {
    switch (kind) {
      case 'expression':
        return expressionQuestions(problems as { id: string; answerIndex: number; payload: ArithPayload }[], locale, ta);
      case 'factorization':
        return (problems as { id: string; answerIndex: number; payload: FactorizationPayload }[]).map(({ id, answerIndex, payload: { p, q, choices } }) => ({
          id, answerIndex,
          prompt: <><p>{tf('prompt')}</p><MathTex tex={trinomialTex(p, q)} block /></>,
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
          prompt: payload.statement ? <>{payload.statement[locale].prompt.split('\n').map((line, index) => <p key={index}>{line}</p>)}</> : payload.word ? <p>{payload.word[locale].prompt}</p> : <>
            <p>{formulaInstructionLine(payload, tq)}</p>
            {payload.kind === 'graph' ? <MathGraph which={payload.which!} question={payload.question} /> : payload.kind === 'figure' ? <MathShape which={payload.which!} question={payload.question} /> : formulaQuestionTex(payload) ? <MathTex tex={formulaQuestionTex(payload)} block /> : null}
          </>,
          choices: payload.choices.map((choice, index) => payload.statement ? payload.statement[locale].options[index] : payload.word ? <><MathTex tex={formulaChoiceTex(payload, choice)} />{payload.word[locale].unit}</> : formulaChoiceLabel(payload, choice) ? tq(formulaChoiceLabel(payload, choice) as Parameters<FormulaT>[0]) : <MathTex tex={formulaChoiceTex(payload, choice)} />),
          explanation: payload.statement ? <p>{payload.statement[locale].explanation}</p> : <>
            {payload.steps && <div className={styles.steps}>{payload.steps.flatMap(line => stepRows(line, payload.style)).map((row, index) => <div key={index} className={styles.row}>{row.map((piece, at) => <MathTex key={at} tex={`{{}${piece}}`} />)}</div>)}</div>}
            {tq('answer')} {formulaChoiceLabel(payload, payload.choices[answerIndex]) ? tq(formulaChoiceLabel(payload, payload.choices[answerIndex]) as Parameters<FormulaT>[0]) : <MathTex tex={formulaChoiceTex(payload, payload.choices[answerIndex])} />}{payload.word?.[locale].unit}
            {payload.kind === 'divmod' && <MathColumn expression={payload.question.replace(/\s*,\s*/, ' / ')} />}
          </>,
        }));
      default:
        return [];
    }
  }
}
