import { and, desc, eq, gte, lt, sql } from 'drizzle-orm';
import { getDb } from '../db/client.server';
import { diaryEntries } from '../db/schema';

export const PAGE_SIZE = 1;
const publicColumns = {
  id: diaryEntries.id, body: diaryEntries.body,
  createdAt: diaryEntries.createdAt, updatedAt: diaryEntries.updatedAt,
};
// All operations scope by the authenticated user; never accept ownership from a form.
export function listEntries(userId: string, page: number) {
  return getDb().select(publicColumns).from(diaryEntries)
    .where(eq(diaryEntries.userId, userId))
    .orderBy(desc(diaryEntries.createdAt), desc(diaryEntries.id))
    .limit(PAGE_SIZE + 1).offset(page * PAGE_SIZE).all();
}
// JST calendar days, rather than a rolling 24-hour limit.
function todayRange() {
  const now = new Date();
  const day = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const start = new Date(`${day}T00:00:00+09:00`);
  return { now: now.toISOString(), start: start.toISOString(), end: new Date(start.getTime() + 86400000).toISOString() };
}
export async function hasTodayEntry(userId: string) {
  const { start, end } = todayRange();
  const rows = await getDb().select({ id: diaryEntries.id }).from(diaryEntries)
    .where(and(eq(diaryEntries.userId, userId), gte(diaryEntries.createdAt, start), lt(diaryEntries.createdAt, end))).limit(1).all();
  return rows.length > 0;
}
export async function createEntry(userId: string, body: string) {
  const { now, start, end } = todayRange();
  // One atomic INSERT ... SELECT prevents two concurrent requests from both
  // passing a separate existence check. Existing older posts are not removed.
  return getDb().insert(diaryEntries).select(sql`
    SELECT ${crypto.randomUUID()}, ${userId}, ${body}, ${now}, ${now}
    WHERE NOT EXISTS (
      SELECT 1 FROM ${diaryEntries}
      WHERE ${diaryEntries.userId} = ${userId}
        AND ${diaryEntries.createdAt} >= ${start} AND ${diaryEntries.createdAt} < ${end}
    )
  `).returning({ id: diaryEntries.id }).all();
}
export async function editEntry(userId: string, id: string, body: string) {
  return getDb().update(diaryEntries).set({ body, updatedAt: new Date().toISOString() })
    .where(and(eq(diaryEntries.userId, userId), eq(diaryEntries.id, id)))
    .returning({ id: diaryEntries.id }).all();
}
export async function deleteEntry(userId: string, id: string) {
  return getDb().delete(diaryEntries)
    .where(and(eq(diaryEntries.userId, userId), eq(diaryEntries.id, id)))
    .returning({ id: diaryEntries.id }).all();
}
