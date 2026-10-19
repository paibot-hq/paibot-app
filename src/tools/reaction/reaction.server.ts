import { count, lt, sql } from "drizzle-orm";
import { getDb } from "../../db/client.server";
import { reactionResults } from "../../db/schema";
import { BIN_MS, BINS, MIN_MS, distributionFrom, type Distribution } from "./reaction";

// Server-only: the reaction test's shared results in D1 (reaction_results).

export async function getDistribution(): Promise<Distribution> {
  // The constants go into the SQL as written, not as bound parameters: D1 binds a JavaScript number as a real, and the
  // division would then not be a whole bin number.
  const bin = sql<number>`max(0, min(${sql.raw(String(BINS - 1))}, cast((${reactionResults.ms} - ${sql.raw(String(MIN_MS))}) / ${sql.raw(String(BIN_MS))} as integer)))`;
  const rows = await getDb().select({ bin, count: count() }).from(reactionResults).groupBy(bin);
  return distributionFrom(rows);
}

// Keeps a round's average and says where it stands: how many results are faster, out of how many (this one included).
export async function recordResult(ms: number): Promise<{ faster: number; distribution: Distribution }> {
  const db = getDb();
  await db.insert(reactionResults).values({ ms });
  const [[{ faster }], distribution] = await Promise.all([
    db.select({ faster: count() }).from(reactionResults).where(lt(reactionResults.ms, ms)),
    getDistribution(),
  ]);
  return { faster, distribution };
}
