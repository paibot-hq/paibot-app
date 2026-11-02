import { data, useRevalidator } from 'react-router';
import { useTranslations } from 'use-intl';
import { useMixedMathQuestions } from '../components/math-questions';
import MathSetQuiz from '../components/math-set-quiz';
import type { DynamicT } from '../lib/apps';
import { findUnit } from '../lib/math-catalog';
import { KENTEI_LOCALES } from '../lib/math-kentei';
import { getProblemsByIds, getTestCandidates } from '../lib/math-problems.server';
import { drawTest, findTest, testSize } from '../lib/math-test';
import type { Route } from './+types/math-test';

// A test (lib/math-test.ts): its problems drawn anew on every visit, so the page is never cached, nor indexed, and nothing is saved.
const noStore = { 'Cache-Control': 'private, no-store' };
export function headers() { return noStore; }
export const handle = { noindex: true };
export async function loader({ params }: Route.LoaderArgs) {
  const test = findTest(params.test);
  if (!test || (test.kind === 'kentei' && !(KENTEI_LOCALES as readonly string[]).includes(params.locale))) throw new Response('Not Found', { status: 404 });
  const candidates = await Promise.all(test.parts.map(part => getTestCandidates(part.grades, part.extra)));
  if (test.parts.some((part, index) => candidates[index].length < part.size)) throw new Response('Not Found', { status: 404 });
  const drawn = drawTest(test, part => candidates[test.parts.indexOf(part as never)]);
  const problems = await getProblemsByIds(drawn.map(problem => problem.id));
  return data({ id: test.id, kind: test.kind, key: test.key, size: testSize(test), problems: problems.map(problem => ({ ...problem, kind: findUnit(problem.unit)?.kind })) }, { headers: noStore });
}

export default function MathTest({ loaderData: { id, kind, key, problems } }: Route.ComponentProps) {
  const t = useTranslations('App.math') as unknown as DynamicT;
  const tt = useTranslations('App.math.test');
  const tq = useTranslations('App.math.quiz');
  const revalidator = useRevalidator();
  const questions = useMixedMathQuestions(problems).map((question, index) => ({
    ...question, tier: problems[index].tier,
    source: { label: t(`units.${problems[index].unit}.items.${problems[index].item}.title`), href: `/math/${problems[index].unit}/${problems[index].item}` },
  }));
  const name = kind === 'grade' ? t(`grades.${key}`) : kind === 'kentei' ? t(`kentei.levels.${key}`).replace(/（.*）/, '') : tt(`summaries.${key}` as 'summaries.middle');
  const title = kind === 'kentei' ? tt('kenteiTitle', { level: name }) : kind === 'grade' ? tt('gradeTitle', { grade: name }) : name;
  return <>
    <title>{`${title} | PAIBOT.app`}</title>
    <MathSetQuiz key={problems.map(problem => problem.id).join()} title={title} setLabel={tt('setLabel', { count: problems.length })} questions={questions} sharePath={`/math/test/${id}`} shareText={(correct, total) => tq('shareText', { title, correct, total })}
      crumbs={[{ label: tt('title'), href: '/math/test' }, { label: name }]}
      onRetry={() => revalidator.revalidate()} retryLabel={tt('retry')} />
  </>;
}
