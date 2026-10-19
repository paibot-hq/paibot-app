import { count, eq, gt } from "drizzle-orm";
import { getDb } from "../../db/client.server";
import { iqResults } from "../../db/schema";
import { distributionFrom, type Distribution } from "./matrix";

// Server-only: the IQ test's shared results in D1 (iq_results).

export async function getDistribution(): Promise<Distribution> {
  const rows = await getDb().select({ score: iqResults.score, count: count() }).from(iqResults).groupBy(iqResults.score);
  return distributionFrom(rows);
}

// Keeps a result and says where it stands: how many scored more, how many the same (this one included), and the chart.
export async function recordResult(score: number, seconds: number): Promise<{ better: number; same: number; distribution: Distribution }> {
  const db = getDb();
  await db.insert(iqResults).values({ score, seconds });
  const [[{ better }], [{ same }], distribution] = await Promise.all([
    db.select({ better: count() }).from(iqResults).where(gt(iqResults.score, score)),
    db.select({ same: count() }).from(iqResults).where(eq(iqResults.score, score)),
    getDistribution(),
  ]);
  return { better, same, distribution };
}
