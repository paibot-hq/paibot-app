import { sql } from "drizzle-orm";
import { primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const favorites = sqliteTable("favorites", {
  userId: text("user_id").notNull(),
  appSlug: text("app_slug").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
}, table => [primaryKey({ columns: [table.userId, table.appSlug] })]);
