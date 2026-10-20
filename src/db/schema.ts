import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { ArithPayload } from '../lib/math-arith';
import type { PythagorasPayload } from '../lib/math-pythagoras';
import type { FactorizationPayload } from '../lib/math-factorization';
import type { FormulaPayload } from '../lib/math-formula';
import type { QuizLocale, QuizTranslation } from '../lib/quiz';

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

export const quizQuestions = sqliteTable('quiz_questions', {
  id: text('id').primaryKey(),
  category: text('category').notNull(),
  published: integer('published', { mode: 'boolean' }).notNull(),
  answerIndex: integer('answer_index').notNull(),
  translations: text('translations', { mode: 'json' }).$type<Record<QuizLocale, QuizTranslation>>().notNull(),
  source: text('source').notNull(),
  reviewedAt: text('reviewed_at').notNull(),
}, table => [index('quiz_published_idx').on(table.published)]);

// A problem belongs to unit → learning item → practice set (see
// src/lib/math-catalog.ts). `grade` is the item's school year in Japan's
// curriculum (src/lib/math-curriculum-jp.ts, copied on import) and `tier` its
// difficulty within that item and grade (1 basic, 2 standard, 3 advanced), so
// tests can be assembled by scope and tier with SQL alone.
export const mathProblems = sqliteTable('math_problems', {
  id: text('id').primaryKey().notNull(),
  unit: text('unit').notNull(),
  item: text('item').notNull().default(''),
  setId: text('set_id').notNull(),
  position: integer('position').notNull(),
  published: integer('published', { mode: 'boolean' }).notNull(),
  answerIndex: integer('answer_index').notNull(),
  payload: text('payload', { mode: 'json' }).$type<ArithPayload | FactorizationPayload | PythagorasPayload | FormulaPayload>().notNull(),
  grade: text('grade').notNull().default(''),
  tier: integer('tier').notNull().default(2),
  reviewedAt: text('reviewed_at').notNull(),
}, table => [
  index('math_problems_set_idx').on(table.unit, table.item, table.setId, table.published, table.position),
  index('math_problems_grade_tier_idx').on(table.grade, table.tier, table.published),
]);

// One row per finished /math set by a signed-in user. `answers` are the chosen
// choice indexes, in `problemIds` order; `correct` is recounted on the server.
// `setVersion` hashes the problems as served, so records can later be told
// apart from attempts at an edited set.
export const mathAttempts = sqliteTable('math_attempts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  unit: text('unit').notNull(),
  item: text('item').notNull().default(''),
  setId: text('set_id').notNull(),
  setVersion: text('set_version').notNull(),
  problemIds: text('problem_ids', { mode: 'json' }).$type<string[]>().notNull(),
  answers: text('answers', { mode: 'json' }).$type<number[]>().notNull(),
  correct: integer('correct').notNull(),
  total: integer('total').notNull(),
  completedAt: text('completed_at').notNull(),
}, table => [index('math_attempts_user_set_idx').on(table.userId, table.unit, table.item, table.setId, table.completedAt)]);

// The reaction test's results (src/tools/reaction): the average of a round of three, in milliseconds, kept with no
// name, account or address, so that a new result can be placed among everyone's (its rank and the chart).
export const reactionResults = sqliteTable("reaction_results", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ms: integer("ms").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
}, table => [index("reaction_results_ms_idx").on(table.ms)]);

// The IQ test's results (src/tools/iq-test): how many of the sixteen puzzles were right and in how many seconds, kept
// with no name, account or address, so that a new score can be placed among everyone's (its IQ, rank and the chart).
export const iqResults = sqliteTable("iq_results", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  score: integer("score").notNull(),
  seconds: integer("seconds").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
}, table => [index("iq_results_score_idx").on(table.score)]);

// The personality test's results (src/tools/personality): the five raw trait scores (4-20) of the Mini-IPIP, kept with
// no name, account or address, so that a new result can be placed among everyone's, trait by trait.
export const personalityResults = sqliteTable("personality_results", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  extraversion: integer("extraversion").notNull(),
  agreeableness: integer("agreeableness").notNull(),
  conscientiousness: integer("conscientiousness").notNull(),
  stability: integer("stability").notNull(),
  openness: integer("openness").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

// How often each tool's page is viewed, per day (Japan's date): the tool ranking (src/lib/tool-ranking.ts). Only a tool
// and a number; nothing about who viewed it.
export const toolViews = sqliteTable("tool_views", {
  slug: text("slug").notNull(),
  day: text("day").notNull(),
  views: integer("views").notNull().default(0),
}, table => [primaryKey({ columns: [table.slug, table.day] }), index("tool_views_day_idx").on(table.day)]);

// The typing game's results (src/tools/typing): the score (keys typed right less the misses) and its parts, kept with no
// name, account or address, so that a new result can be placed among everyone's (its rank and the chart).
export const typingResults = sqliteTable("typing_results", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // What was typed: "ja" (Japanese words in romaji) or "en" (English words). Ranked apart: they are not as hard as each other.
  mode: text("mode").notNull().default("ja"),
  score: integer("score").notNull(),
  keys: integer("keys").notNull(),
  misses: integer("misses").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
}, table => [index("typing_results_mode_score_idx").on(table.mode, table.score)]);
