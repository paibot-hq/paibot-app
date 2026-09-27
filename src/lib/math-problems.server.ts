import { and, asc, eq } from 'drizzle-orm';
import { getDb } from '../db/client.server';
import { mathProblems } from '../db/schema';
import type { ArithPayload } from './math-arith';
import type { MathUnit } from './math-attempts';
import type { FactorizationPayload } from './math-factorization';

type PayloadByUnit = {
  arith: ArithPayload;
  factorization: FactorizationPayload;
};

type MathProblem<U extends MathUnit> = {
  id: string;
  answerIndex: number;
  payload: PayloadByUnit[U];
};

// A set is served whole and in order, so every visitor gets the same quiz.
export async function getMathSet<U extends MathUnit>(unit: U, setId: number): Promise<MathProblem<U>[]> {
  const t = mathProblems;
  const rows = await getDb().select({ id: t.id, answerIndex: t.answerIndex, payload: t.payload }).from(t)
    .where(and(eq(t.unit, unit), eq(t.setId, setId), eq(t.published, true))).orderBy(asc(t.position));
  // The importer validates each unit's payload; the unit filter narrows its type.
  return rows as MathProblem<U>[];
}
