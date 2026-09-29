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
// src/lib/math-catalog.ts). `difficulty` (1-5) is estimated from the problem
// itself on import (scripts/lib/math-difficulty.mjs), for assembling tests
// across items and units; it can later be recalibrated from attempts.
export const mathProblems = sqliteTable('math_problems', {
  id: text('id').primaryKey().notNull(),
  unit: text('unit').notNull(),
  item: text('item').notNull().default(''),
  setId: text('set_id').notNull(),
  position: integer('position').notNull(),
  published: integer('published', { mode: 'boolean' }).notNull(),
  answerIndex: integer('answer_index').notNull(),
  payload: text('payload', { mode: 'json' }).$type<ArithPayload | FactorizationPayload | PythagorasPayload | FormulaPayload>().notNull(),
  difficulty: integer('difficulty').notNull().default(1),
  reviewedAt: text('reviewed_at').notNull(),
}, table => [
  index('math_problems_set_idx').on(table.unit, table.item, table.setId, table.published, table.position),
  index('math_problems_difficulty_idx').on(table.unit, table.item, table.difficulty, table.published),
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
