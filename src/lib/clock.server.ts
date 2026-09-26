import { eq } from 'drizzle-orm';
import { getDb } from '../db/client.server';
import { clockPreferences } from '../db/schema';

export async function getClockZone(userId: string) {
  const rows = await getDb().select({ timeZone: clockPreferences.timeZone })
    .from(clockPreferences).where(eq(clockPreferences.userId, userId)).limit(1).all();
  return rows[0]?.timeZone ?? 'auto';
}
export async function saveClockZone(userId: string, timeZone: string) {
  await getDb().insert(clockPreferences).values({ userId, timeZone })
    .onConflictDoUpdate({ target: clockPreferences.userId, set: { timeZone } }).run();
}
