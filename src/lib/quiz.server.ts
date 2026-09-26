import { eq, sql } from 'drizzle-orm';
import { getDb } from '../db/client.server';
import { quizQuestions } from '../db/schema';
import type { QuizLocale, QuizQuestion } from './quiz';

export async function getQuizRound(locale: QuizLocale): Promise<QuizQuestion[]> {
  // Sampling IDs keeps the random sort narrow; only five JSON payloads are read.
  const sample = getDb().select({ id: quizQuestions.id }).from(quizQuestions)
    .where(eq(quizQuestions.published, true)).orderBy(sql`random()`).limit(5).as('sample');
  const rows = await getDb().select({ question: quizQuestions }).from(quizQuestions)
    .innerJoin(sample, eq(quizQuestions.id, sample.id));
  return rows.map(({ question: q }) => ({
    id: q.id, ...q.translations[locale], answerIndex: q.answerIndex, source: q.source,
  }));
}
