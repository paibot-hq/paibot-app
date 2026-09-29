import { and, asc, eq } from 'drizzle-orm';
import { getDb } from '../db/client.server';
import { mathProblems } from '../db/schema';
import type { ArithPayload } from './math-arith';
import type { MathUnit } from './math-attempts';
import type { ExpressionUnit } from './math-expression-units';
import type { FactorizationPayload } from './math-factorization';

import type { PythagorasPayload } from './math-pythagoras';

type PayloadByUnit = Record<ExpressionUnit, ArithPayload> & {
  pythagoras: PythagorasPayload;
  arith: ArithPayload;
  signed: ArithPayload;
  factorization: FactorizationPayload;
};

type MathProblem<U extends MathUnit> = {
  id: string;
  answerIndex: number;
  payload: PayloadByUnit[U];
};

// A set is served whole and in order, so every visitor gets the same quiz.
export async function getMathSet<U extends MathUnit>(unit: U, setId: string): Promise<MathProblem<U>[]> {
  const t = mathProblems;
  const rows = await getDb().select({ id: t.id, answerIndex: t.answerIndex, payload: t.payload }).from(t)
    .where(and(eq(t.unit, unit), eq(t.setId, setId), eq(t.published, true))).orderBy(asc(t.position));
  // The importer validates each unit's payload; the unit filter narrows its type.
  return rows as MathProblem<U>[];
}

// "unit/setId" of every set with published problems, i.e. every set a visitor
// can play; the unit list marks the rest as coming soon.
export async function getPlayableSets(): Promise<string[]> {
  const t = mathProblems;
  const rows = await getDb().selectDistinct({ unit: t.unit, setId: t.setId }).from(t).where(eq(t.published, true));
  return rows.map(row => `${row.unit}/${row.setId}`);
}
