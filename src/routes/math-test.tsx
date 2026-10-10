import { data, useRevalidator } from 'react-router';
import { useTranslations } from 'use-intl';
import { useMixedMathQuestions } from '../components/math-questions';
import MathSetQuiz from '../components/math-set-quiz';
import type { DynamicT } from '../lib/apps';
import { findUnit } from '../lib/math-catalog';
import { JP_GRADES, type JpGrade } from '../lib/math-curriculum-jp';
import { getProblemsByIds, getTestCandidates } from '../lib/math-problems.server';
import { pickTest, TEST_MIN_PROBLEMS } from '../lib/math-test';
import type { Route } from './+types/math-test';

// A school year's test: ten problems drawn anew on every visit (see lib/math-test.ts), so the page is never cached.
const noStore = { 'Cache-Control': 'private, no-store' };
export function headers() { return noStore; }
export async function loader({ params }: Route.LoaderArgs) {
  const grade = params.grade as JpGrade;
  if (!(JP_GRADES as readonly string[]).includes(grade)) throw new Response('Not Found', { status: 404 });
  const candidates = await getTestCandidates(grade);
  if (candidates.length < TEST_MIN_PROBLEMS) throw new Response('Not Found', { status: 404 });
  const problems = await getProblemsByIds(pickTest(candidates).map(problem => problem.id));
  return data({ grade, problems: problems.map(problem => ({ ...problem, kind: findUnit(problem.unit)?.kind })) }, { headers: noStore });
}

export default function MathTest({ loaderData: { grade, problems } }: Route.ComponentProps) {
  const t = useTranslations('App.math') as unknown as DynamicT;
  const tt = useTranslations('App.math.test');
  const revalidator = useRevalidator();
  const questions = useMixedMathQuestions(problems).map((question, index) => ({
    ...question, tier: problems[index].tier,
    source: { label: t(`units.${problems[index].unit}.items.${problems[index].item}.title`), href: `/math/${problems[index].unit}/${problems[index].item}` },
  }));
  const title = tt('gradeTitle', { grade: t(`grades.${grade}`) });
  return <>
    <title>{`${title} | PAIBOT`}</title>
    <meta name="robots" content="noindex" />
    <MathSetQuiz key={problems.map(problem => problem.id).join()} title={title} setLabel={tt('setLabel', { count: problems.length })} questions={questions}
      crumbs={[{ label: tt('title'), href: '/math/test' }, { label: t(`grades.${grade}`) }]}
      onRetry={() => revalidator.revalidate()} retryLabel={tt('retry')} />
  </>;
}
