import { data } from 'react-router';
import { sql } from 'drizzle-orm';
import { getDb } from '../../db/client.server';
import { englishSetResults } from '../../db/schema';
import { dayOf, isBot } from '../../lib/tool-ranking';

const privateHeaders = { 'Cache-Control': 'private, no-store' };

// The action behind every /english/<unit>/<item>/<set> page, as math's saveAttemptAction: only the chosen indexes are trusted from
// the client; the set is reloaded and the score recounted here, and answers to a set that changed since it was loaded (other
// problems) are refused. A finished set adds one to its count for the score and the day (english_set_results), which holds
// nothing about who played; crawlers and headless browsers are not counted, and a failed count only loses that one.
export async function countResultAction(
  request: Request,
  set: { unit: string; item: string; setId: string },
  loadSet: () => Promise<{ id: string; answerIndex: number }[]>,
) {
  const fail = (status: number) => data({ ok: false as const }, { status, headers: privateHeaders });
  if (request.method !== 'POST') return fail(405);
  if (request.headers.get('Origin') !== new URL(request.url).origin) return fail(403);
  let problemIds: unknown;
  let answers: unknown;
  try {
    const form = await request.formData();
    problemIds = JSON.parse(String(form.get('problemIds')));
    answers = JSON.parse(String(form.get('answers')));
  } catch { return fail(400); }
  if (!Array.isArray(problemIds) || !Array.isArray(answers) || problemIds.length !== answers.length || problemIds.length === 0 || problemIds.length > 50
    || !answers.every(answer => Number.isInteger(answer) && answer >= 0 && answer < 4)) return fail(400);
  try {
    const problems = await loadSet();
    if (problems.length !== problemIds.length || problems.some((problem, index) => problem.id !== problemIds[index])) return fail(409);
    const correct = problems.filter((problem, index) => problem.answerIndex === answers[index]).length;
    if (!isBot(request.headers.get('User-Agent') ?? '')) {
      const t = englishSetResults;
      await getDb().insert(t).values({ ...set, day: dayOf(new Date()), correct, total: problems.length, count: 1 })
        .onConflictDoUpdate({ target: [t.unit, t.item, t.setId, t.day, t.correct, t.total], set: { count: sql`${t.count} + 1` } })
        .run().catch(() => {});
    }
    return data({ ok: true as const }, { headers: privateHeaders });
  } catch { return fail(503); }
}
