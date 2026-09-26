import { getQuizRound } from '../lib/quiz.server';
import type { Route } from './+types/api.quiz';

export async function loader({ request }: Route.LoaderArgs) {
  const headers = { 'Cache-Control': 'no-store' };
  const locale = new URL(request.url).searchParams.get('locale');
  if (locale !== 'ja' && locale !== 'en' && locale !== 'zh') {
    return Response.json({ error: 'Invalid locale' }, { status: 400, headers });
  }
  try {
    const questions = await getQuizRound(locale);
    if (questions.length !== 5) return Response.json({ error: 'Quiz unavailable' }, { status: 503, headers });
    return Response.json({ questions }, { headers });
  } catch {
    return Response.json({ error: 'Quiz unavailable' }, { status: 503, headers });
  }
}
