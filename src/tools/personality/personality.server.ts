import { count } from "drizzle-orm";
import { getDb } from "../../db/client.server";
import { personalityResults } from "../../db/schema";
import { TRAITS, distributionsFrom, type Distributions, type Scores } from "./personality";

// Server-only: the personality test's shared results in D1 (personality_results).

export async function getDistributions(): Promise<Distributions> {
  const db = getDb();
  const [rows, [{ total }]] = await Promise.all([
    Promise.all(TRAITS.map(t => db.select({ raw: personalityResults[t], count: count() }).from(personalityResults).groupBy(personalityResults[t]))),
    db.select({ total: count() }).from(personalityResults),
  ]);
  return distributionsFrom(Object.fromEntries(TRAITS.map((t, i) => [t, rows[i]])), total);
}

// Keeps a result and returns everyone's, this one included.
export async function recordResult(scores: Scores): Promise<Distributions> {
  await getDb().insert(personalityResults).values(scores);
  return getDistributions();
}

export async function countResults(): Promise<number> {
  const [{ total }] = await getDb().select({ total: count() }).from(personalityResults);
  return total;
}
