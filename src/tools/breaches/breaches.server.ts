import { asc, eq } from "drizzle-orm";
import { getDb } from "../../db/client.server";
import { breachIncidents, breachList } from "../../db/schema";

// Server-only: the incident list as the daily update last wrote it into D1 (docs/breaches.md), newest first.
export async function getBreaches() {
  const db = getDb();
  const [lists, rows] = await Promise.all([
    db.select({ asOf: breachList.asOf, note: breachList.note }).from(breachList).where(eq(breachList.id, "current")).limit(1).all(),
    db.select({ entry: breachIncidents.entry }).from(breachIncidents).orderBy(asc(breachIncidents.position)).all(),
  ]);
  if (!lists[0] || !rows.length) return null;
  return { ...lists[0], items: rows.map(row => row.entry) };
}
