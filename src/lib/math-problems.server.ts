import { and, asc, count, desc, eq, inArray, or } from 'drizzle-orm';
import { getDb } from '../db/client.server';
import { mathProblems } from '../db/schema';

// A set is served whole and in order, so every visitor gets the same quiz.
// The payload's shape depends on the unit's kind (src/lib/math-catalog.ts);
// the importer validates it, and the page narrows it by kind.
export async function getMathSet(unit: string, item: string, setId: string): Promise<{ id: string; answerIndex: number; tier: number; payload: unknown }[]> {
  const t = mathProblems;
  return getDb().select({ id: t.id, answerIndex: t.answerIndex, tier: t.tier, payload: t.payload }).from(t)
    .where(and(eq(t.unit, unit), eq(t.item, item), eq(t.setId, setId), eq(t.published, true))).orderBy(asc(t.position));
}

// "unit/item/set" of every set with published problems, i.e. every set a
// visitor can play; the rest are shown as coming soon.
export async function getPlayableSets(): Promise<string[]> {
  const t = mathProblems;
  const rows = await getDb().selectDistinct({ unit: t.unit, item: t.item, setId: t.setId }).from(t).where(eq(t.published, true));
  return rows.map(row => `${row.unit}/${row.item}/${row.setId}`);
}

// How many problems are published in all (the figure on the top page); null when the database cannot be read, so the page
// still opens without it.
export async function getPublishedProblemCount(): Promise<number | null> {
  try {
    const [row] = await getDb().select({ n: count() }).from(mathProblems).where(eq(mathProblems.published, true));
    return row?.n ?? 0;
  } catch {
    return null;
  }
}

// How many published problems of each tier (1 basic, 2 standard, 3 advanced)
// each of an item's sets has: { "1": { 1: 2, 2: 3 } }.
export async function getSetTiers(unit: string, item: string): Promise<Record<string, Record<number, number>>> {
  const t = mathProblems;
  const rows = await getDb().select({ setId: t.setId, tier: t.tier, n: count() }).from(t)
    .where(and(eq(t.unit, unit), eq(t.item, item), eq(t.published, true))).groupBy(t.setId, t.tier);
  const tiers: Record<string, Record<number, number>> = {};
  for (const row of rows) (tiers[row.setId] ??= {})[row.tier] = row.n;
  return tiers;
}

// The item's worked example: a published problem shown with its answer. The easiest
// tier first and, within it, the latest in the set so it is rarely the first
// question of the practice. A problem with a short worked solution (payload.steps,
// 1 to 4 lines) is preferred; without one, the answer alone is shown, and a long
// solution is the last resort.
export async function getWorkedExample(unit: string, item: string): Promise<{ id: string; answerIndex: number; tier: number; payload: unknown } | null> {
  const t = mathProblems;
  const rows = await getDb().select({ id: t.id, answerIndex: t.answerIndex, tier: t.tier, payload: t.payload }).from(t)
    .where(and(eq(t.unit, unit), eq(t.item, item), eq(t.published, true))).orderBy(asc(t.tier), desc(t.position));
  const stepCount = (row: { payload: unknown }) => { const steps = (row.payload as { steps?: unknown }).steps; return Array.isArray(steps) ? steps.length : 0; };
  return rows.find(row => stepCount(row) >= 1 && stepCount(row) <= 4)
    ?? rows.find(row => stepCount(row) === 0)
    ?? [...rows].sort((a, b) => stepCount(a) - stepCount(b))[0]
    ?? null;
}

// The published problems of some school years, and of some items named as "unit/item" whatever their year, without their payloads, to
// draw a test from (see lib/math-test.ts).
export async function getTestCandidates(grades: readonly string[], extra: readonly string[] = []): Promise<{ id: string; unit: string; item: string; tier: number; grade: string }[]> {
  const t = mathProblems;
  const items = extra.map(entry => entry.split('/')).map(([unit, item]) => and(eq(t.unit, unit), eq(t.item, item)));
  return getDb().select({ id: t.id, unit: t.unit, item: t.item, tier: t.tier, grade: t.grade }).from(t).where(and(eq(t.published, true), or(inArray(t.grade, [...grades]), ...items)));
}

// The drawn problems with their payloads, in the order given.
export async function getProblemsByIds(ids: readonly string[]): Promise<{ id: string; unit: string; item: string; answerIndex: number; tier: number; payload: unknown }[]> {
  if (!ids.length) return [];
  const t = mathProblems;
  // D1 takes at most 100 values in a query.
  const chunks = Array.from({ length: Math.ceil(ids.length / 50) }, (_, i) => ids.slice(i * 50, i * 50 + 50));
  const rows = (await Promise.all(chunks.map(chunk => getDb().select({ id: t.id, unit: t.unit, item: t.item, answerIndex: t.answerIndex, tier: t.tier, payload: t.payload }).from(t)
    .where(and(inArray(t.id, chunk), eq(t.published, true)))))).flat();
  return ids.map(id => rows.find(row => row.id === id)).filter(row => row !== undefined);
}

// How many published problems and learning items each school year has, for the list of tests.
export async function getGradeCounts(): Promise<Record<string, { problems: number; items: number }>> {
  const t = mathProblems;
  const rows = await getDb().select({ grade: t.grade, problems: count(), unit: t.unit, item: t.item }).from(t).where(eq(t.published, true)).groupBy(t.grade, t.unit, t.item);
  const counts: Record<string, { problems: number; items: number }> = {};
  for (const row of rows) {
    const entry = counts[row.grade] ??= { problems: 0, items: 0 };
    entry.problems += row.problems; entry.items += 1;
  }
  return counts;
}
