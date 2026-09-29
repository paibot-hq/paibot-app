import { and, asc, eq } from 'drizzle-orm';
import { getDb } from '../db/client.server';
import { mathProblems } from '../db/schema';

// A set is served whole and in order, so every visitor gets the same quiz.
// The payload's shape depends on the unit's kind (src/lib/math-catalog.ts);
// the importer validates it, and the page narrows it by kind.
export async function getMathSet(unit: string, item: string, setId: string): Promise<{ id: string; answerIndex: number; payload: unknown }[]> {
  const t = mathProblems;
  return getDb().select({ id: t.id, answerIndex: t.answerIndex, payload: t.payload }).from(t)
    .where(and(eq(t.unit, unit), eq(t.item, item), eq(t.setId, setId), eq(t.published, true))).orderBy(asc(t.position));
}

// "unit/item/set" of every set with published problems, i.e. every set a
// visitor can play; the rest are shown as coming soon.
export async function getPlayableSets(): Promise<string[]> {
  const t = mathProblems;
  const rows = await getDb().selectDistinct({ unit: t.unit, item: t.item, setId: t.setId }).from(t).where(eq(t.published, true));
  return rows.map(row => `${row.unit}/${row.item}/${row.setId}`);
}
