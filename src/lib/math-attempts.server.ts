import { data } from 'react-router';
import { getAuth } from '@clerk/react-router/server';
import { and, eq, sql } from 'drizzle-orm';
import { getDb } from '../db/client.server';
import { mathAttempts } from '../db/schema';
import type { MathSetRecord } from './math-attempts';

async function setVersion(problems: readonly object[]): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(problems));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

const privateHeaders = { 'Cache-Control': 'private, no-store' };
type RouteArgs = Parameters<typeof getAuth>[0];

// The action behind every /math/<unit>/<item>/<set> page. Only the chosen indexes
// are trusted from the client: the problems are reloaded and the score is
// recounted here, and an attempt at a set that changed since it was loaded
// (different problem ids) is refused rather than scored against new answers.
export async function saveAttemptAction(
  args: RouteArgs,
  set: { unit: string; item: string; setId: string },
  loadSet: () => Promise<{ id: string; answerIndex: number }[]>,
) {
  const { unit, item, setId } = set;
  const fail = (error: 'signedOut' | 'invalid' | 'stale' | 'unavailable', status: number) =>
    data({ ok: false as const, error }, { status, headers: privateHeaders });
  if (args.request.method !== 'POST') return fail('invalid', 405);
  const { userId } = await getAuth(args);
  if (!userId) return fail('signedOut', 401);
  if (args.request.headers.get('Origin') !== new URL(args.request.url).origin) return fail('invalid', 403);
  let problemIds: unknown;
  let answers: unknown;
  try {
    const form = await args.request.formData();
    problemIds = JSON.parse(String(form.get('problemIds')));
    answers = JSON.parse(String(form.get('answers')));
  } catch { return fail('invalid', 400); }
  if (!Array.isArray(problemIds) || !Array.isArray(answers) || problemIds.length !== answers.length
    || problemIds.length === 0 || problemIds.length > 50
    || !answers.every(answer => Number.isInteger(answer) && answer >= 0 && answer < 4)) return fail('invalid', 400);
  try {
    const problems = await loadSet();
    if (problems.length !== problemIds.length || problems.some((problem, index) => problem.id !== problemIds[index])) return fail('stale', 409);
    const correct = problems.filter((problem, index) => problem.answerIndex === answers[index]).length;
    await getDb().insert(mathAttempts).values({
      id: crypto.randomUUID(), userId, unit, item, setId, setVersion: await setVersion(problems),
      problemIds: problems.map(problem => problem.id), answers: answers as number[],
      correct, total: problems.length, completedAt: new Date().toISOString(),
    }).run();
    return data({ ok: true as const, error: null }, { headers: privateHeaders });
  } catch { return fail('unavailable', 503); }
}

// Latest and best result per set of one learning item, for its page.
// Signed-out visitors never reach D1; a failed read just hides the records.
export async function getSetRecords(args: RouteArgs, unit: string, item: string): Promise<Record<string, MathSetRecord>> {
  const { userId } = await getAuth(args);
  if (!userId) return {};
  try {
    const t = mathAttempts;
    const ranked = getDb().select({
      setId: t.setId, correct: t.correct, total: t.total,
      latest: sql<number>`row_number() over (partition by ${t.setId} order by ${t.completedAt} desc, ${t.id} desc)`.as('latest'),
      best: sql<number>`max(${t.correct}) over (partition by ${t.setId})`.as('best'),
    }).from(t).where(and(eq(t.userId, userId), eq(t.unit, unit), eq(t.item, item))).as('ranked');
    const rows = await getDb().select().from(ranked).where(eq(ranked.latest, 1));
    return Object.fromEntries(rows.map(row => [row.setId, { last: row.correct, best: row.best, total: row.total }]));
  } catch { return {}; }
}
