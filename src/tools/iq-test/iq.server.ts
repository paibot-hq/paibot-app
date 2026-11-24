import { count } from "drizzle-orm";
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
  const distribution = await getDistribution();
  const same = distribution.counts[score] ?? 0;
  let better = 0;
  for (let i = score + 1; i < distribution.counts.length; i++) better += distribution.counts[i];
  return { better, same, distribution };
}
