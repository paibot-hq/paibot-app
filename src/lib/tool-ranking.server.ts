import { desc, gte, sql } from "drizzle-orm";
import { getDb } from "../db/client.server";
import { toolViews } from "../db/schema";
import { RANK_DAYS, firstDay } from "./tool-ranking";

// Server-only: the tools by their views over the last RANK_DAYS days, most viewed first (tools with no views are left
// out). Empty when the database cannot be read: the pages that show it work without it.
export async function getRanking(limit?: number): Promise<{ slug: string; views: number }[]> {
  try {
    const views = sql<number>`sum(${toolViews.views})`;
    const query = getDb().select({ slug: toolViews.slug, views }).from(toolViews).where(gte(toolViews.day, firstDay(new Date(), RANK_DAYS))).groupBy(toolViews.slug).orderBy(desc(views), toolViews.slug);
    const rows = await (limit ? query.limit(limit) : query);
    return rows.map(r => ({ slug: r.slug, views: Number(r.views) }));
  } catch {
    return [];
  }
}
