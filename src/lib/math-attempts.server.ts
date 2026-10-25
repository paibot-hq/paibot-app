import { data } from 'react-router';
import { getAuth } from '@clerk/react-router/server';
import { and, eq, sql } from 'drizzle-orm';
import { getDb } from '../db/client.server';
import { mathAttempts, mathSetResults } from '../db/schema';
import { dayOf, isBot } from './tool-ranking';
import { MAX_SET_PROBLEMS, type MathSetRecord } from './math-attempts';

// A fingerprint of the problems as served (ids, answers, payloads): a change in any of them is a new version.
export async function mathSetVersion(problems: readonly object[]): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(problems));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

const privateHeaders = { 'Cache-Control': 'private, no-store' };
type RouteArgs = Parameters<typeof getAuth>[0];

// The action behind every /math/<unit>/<item>/<set> page. Only the chosen indexes
// are trusted from the client: the problems are reloaded and the score is
// recounted here, and an attempt at a set that changed since it was loaded
// (its `version` no longer matches: other ids, choices or answers) is refused
// rather than scored against the new answers. A signed-in user's attempt is kept
// as theirs (math_attempts); every finished set, signed in or not, also adds one
// to the set's count for the score and day (math_set_results), which holds nothing
// about who played.
export async function saveAttemptAction(
  args: RouteArgs,
  set: { unit: string; item: string; setId: string },
  loadSet: () => Promise<{ id: string; answerIndex: number }[]>,
) {
  const { unit, item, setId } = set;
  const fail = (error: 'invalid' | 'stale' | 'unavailable', status: number) =>
    data({ ok: false as const, error }, { status, headers: privateHeaders });
  if (args.request.method !== 'POST') return fail('invalid', 405);
  const { userId } = await getAuth(args);
  if (args.request.headers.get('Origin') !== new URL(args.request.url).origin) return fail('invalid', 403);
  let problemIds: unknown;
  let answers: unknown;
  let version: string;
  try {
    const form = await args.request.formData();
    problemIds = JSON.parse(String(form.get('problemIds')));
    answers = JSON.parse(String(form.get('answers')));
    version = String(form.get('version') ?? '');
  } catch { return fail('invalid', 400); }
  if (!Array.isArray(problemIds) || !Array.isArray(answers) || problemIds.length !== answers.length
    || problemIds.length === 0 || problemIds.length > MAX_SET_PROBLEMS
    || !answers.every(answer => Number.isInteger(answer) && answer >= 0 && answer < 4)) return fail('invalid', 400);
  try {
    const problems = await loadSet();
    const current = await mathSetVersion(problems);
    if (version !== current || problems.length !== problemIds.length || problems.some((problem, index) => problem.id !== problemIds[index])) return fail('stale', 409);
    const correct = problems.filter((problem, index) => problem.answerIndex === answers[index]).length;
    if (userId) {
      await getDb().insert(mathAttempts).values({
        id: crypto.randomUUID(), userId, unit, item, setId, setVersion: current,
        problemIds: problems.map(problem => problem.id), answers: answers as number[],
        correct, total: problems.length, completedAt: new Date().toISOString(),
      }).run();
    }
    // Crawlers and headless browsers are not counted, as for the tool ranking; a failed count never fails the attempt.
    if (!isBot(args.request.headers.get('User-Agent') ?? '')) {
      await getDb().insert(mathSetResults).values({ unit, item, setId, day: dayOf(new Date()), correct, total: problems.length, count: 1 })
        .onConflictDoUpdate({ target: [mathSetResults.unit, mathSetResults.item, mathSetResults.setId, mathSetResults.day, mathSetResults.correct, mathSetResults.total], set: { count: sql`${mathSetResults.count} + 1` } })
        .run().catch(() => {});
    }
    return data({ ok: true as const, error: null }, { headers: privateHeaders });
  } catch { return fail('unavailable', 503); }
}

// Latest and best result per set of one learning item, for its page; the best counts
// only attempts at the version of the set the latest attempt was made at.
// Signed-out visitors never reach D1; a failed read just hides the records.
export async function getSetRecords(args: RouteArgs, unit: string, item: string): Promise<Record<string, MathSetRecord>> {
  const { userId } = await getAuth(args);
  if (!userId) return {};
  try {
    const t = mathAttempts;
    const ranked = getDb().select({
      setId: t.setId, correct: t.correct, total: t.total,
      latest: sql<number>`row_number() over (partition by ${t.setId} order by ${t.completedAt} desc, ${t.id} desc)`.as('latest'),
      // The best of the attempts at the same version of the set as the latest one, so a best score never exceeds the total.
      best: sql<number>`max(${t.correct}) over (partition by ${t.setId}, ${t.setVersion})`.as('best'),
    }).from(t).where(and(eq(t.userId, userId), eq(t.unit, unit), eq(t.item, item))).as('ranked');
    const rows = await getDb().select().from(ranked).where(eq(ranked.latest, 1));
    return Object.fromEntries(rows.map(row => [row.setId, { last: row.correct, best: row.best, total: row.total }]));
  } catch { return {}; }
}

// The sets the signed-in visitor has finished at least once, as "unit/item/set": a practice card turns green for these.
// Signed-out visitors never reach D1; a failed read just shows nothing as done.
export async function getDoneSets(args: RouteArgs): Promise<string[]> {
  const { userId } = await getAuth(args);
  if (!userId) return [];
  try {
    const rows = await getDb().selectDistinct({ unit: mathAttempts.unit, item: mathAttempts.item, setId: mathAttempts.setId }).from(mathAttempts).where(eq(mathAttempts.userId, userId));
    return rows.map(row => `${row.unit}/${row.item}/${row.setId}`);
  } catch { return []; }
}
