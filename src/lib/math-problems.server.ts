import { and, asc, count, desc, eq } from 'drizzle-orm';
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

// The item's worked example: a published problem with a short worked solution
// (payload.steps, 1 to 4 lines), the easiest tier first and, within it, the
// latest in the set so it is rarely the first question of the practice.
export async function getWorkedExample(unit: string, item: string): Promise<{ id: string; answerIndex: number; tier: number; payload: unknown } | null> {
  const t = mathProblems;
  const rows = await getDb().select({ id: t.id, answerIndex: t.answerIndex, tier: t.tier, payload: t.payload }).from(t)
    .where(and(eq(t.unit, unit), eq(t.item, item), eq(t.published, true))).orderBy(asc(t.tier), desc(t.position));
  return rows.find(row => { const steps = (row.payload as { steps?: unknown }).steps; return Array.isArray(steps) && steps.length >= 1 && steps.length <= 4; }) ?? null;
}
