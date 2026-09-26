import { sql } from "drizzle-orm";
import { index, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const favorites = sqliteTable("favorites", {
  userId: text("user_id").notNull(),
  appSlug: text("app_slug").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
}, table => [primaryKey({ columns: [table.userId, table.appSlug] })]);

export const diaryEntries = sqliteTable("diary_entries", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  body: text("body").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, table => [index("diary_user_created_idx").on(table.userId, table.createdAt, table.id)]);

export const clockPreferences = sqliteTable("clock_preferences", {
  userId: text("user_id").primaryKey(),
  timeZone: text("time_zone").notNull(),
});

// Every column is nullable: null means "not set", so clearing the birth date
// cannot take the language and theme down with it.
export const userProfiles = sqliteTable("user_profiles", {
  userId: text("user_id").primaryKey(),
  birthDate: text("birth_date"),
  locale: text("locale"),
  theme: text("theme"),
  updatedAt: text("updated_at").notNull(),
});
