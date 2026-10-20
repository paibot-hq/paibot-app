import { and, count, eq, gt } from "drizzle-orm";
import { getDb } from "../../db/client.server";
import { typingResults } from "../../db/schema";
import { BINS, BIN, distributionFrom, type Distribution } from "./game";
import { sql } from "drizzle-orm";

// Server-only: the typing game's shared results in D1 (typing_results).

// The distribution of one mode's scores (Japanese words and English ones are ranked apart).
export async function getDistribution(mode: "ja" | "en"): Promise<Distribution> {
  // The constants go into the SQL as written, not as bound parameters: D1 binds a JavaScript number as a real, and the
  // division would then not be a whole bin number.
  const bin = sql<number>`max(0, min(${sql.raw(String(BINS - 1))}, cast(${typingResults.score} / ${sql.raw(String(BIN))} as integer)))`;
  const rows = await getDb().select({ bin, count: count() }).from(typingResults).where(eq(typingResults.mode, mode)).groupBy(bin);
  return distributionFrom(rows);
}

// Keeps a round and says where it stands: how many scored more, how many the same (this one included), out of how many.
export async function recordResult(mode: "ja" | "en", points: number, keys: number, misses: number): Promise<{ better: number; same: number; distribution: Distribution }> {
  const db = getDb();
  await db.insert(typingResults).values({ mode, score: points, keys, misses });
  const [[{ better }], [{ same }], distribution] = await Promise.all([
    db.select({ better: count() }).from(typingResults).where(and(eq(typingResults.mode, mode), gt(typingResults.score, points))),
    db.select({ same: count() }).from(typingResults).where(and(eq(typingResults.mode, mode), eq(typingResults.score, points))),
    getDistribution(mode),
  ]);
  return { better, same, distribution };
}
