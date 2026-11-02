import { useMemo, useState } from 'react';
import { data, useRevalidator } from 'react-router';
import { useTranslations } from 'use-intl';
import MathBreadcrumb from '../components/math-breadcrumb';
import { useMixedMathQuestions } from '../components/math-questions';
import MathSetQuiz from '../components/math-set-quiz';
import ToolLayout from '../components/tool-layout';
import { Link } from '../i18n/navigation';
import type { DynamicT } from '../lib/apps';
import { findUnit } from '../lib/math-catalog';
import { nextPlacement, placementResult, PLACEMENT_LEVELS, PLACEMENT_SIZE, PLACEMENT_STARTS, startPlacement, type PlacementStart, type PlacementState } from '../lib/math-placement';
import { getProblemsByIds, getTestCandidates } from '../lib/math-problems.server';
import { pickTest } from '../lib/math-test';
import styles from './math-placement.module.css';
import type { Route } from './+types/math-placement';

// The placement test (lib/math-placement.ts): a few problems of every level are drawn on each visit (each from a different item where
// possible); the page picks from them as the learner answers. Never cached, nor indexed, and nothing is saved.
const PER_LEVEL = 8;
const noStore = { 'Cache-Control': 'private, no-store' };
export function headers() { return noStore; }
export const handle = { noindex: true };
export async function loader() {
  const candidates = await getTestCandidates(PLACEMENT_LEVELS.flat());
  const pools = PLACEMENT_LEVELS.map(grades => pickTest(candidates.filter(problem => grades.includes(problem.grade)), PER_LEVEL).map(problem => problem.id));
  const problems = await getProblemsByIds(pools.flat());
  return data({
    pools: pools.map(ids => ids.filter(id => problems.some(problem => problem.id === id))),
    problems: problems.map(problem => ({ ...problem, kind: findUnit(problem.unit)?.kind })),
  }, { headers: noStore });
}

export default function MathPlacement({ loaderData: { pools, problems } }: Route.ComponentProps) {
  const t = useTranslations('App.math') as unknown as DynamicT;
  const tp = useTranslations('App.math.placement');
  const tt = useTranslations('App.math.test');
  const revalidator = useRevalidator();
  const built = useMixedMathQuestions(problems);
  const byId = useMemo(() => new Map(problems.map((problem, index) => [problem.id, { problem, question: built[index] }])), [problems, built]);
  const levelName = (level: number) => {
    const [grade] = PLACEMENT_LEVELS[level];
    return grade.startsWith('h-') ? tp(`levels.${level}` as 'levels.9') : t(`grades.${grade}`);
  };
  const [run, setRun] = useState<{ state: PlacementState; asked: { id: string; level: number }[]; history: { level: number; correct: boolean }[] } | null>(null);

  // The next problem at a level: one not asked yet, from the level, else from the nearest level that still has one.
  const pick = (level: number, asked: readonly { id: string }[]) => {
    for (let distance = 0; distance < PLACEMENT_LEVELS.length; distance++) {
      for (const at of [level - distance, level + distance]) {
        const id = pools[at]?.find(candidate => !asked.some(question => question.id === candidate));
        if (id) return { id, level: at };
      }
    }
    return null;
  };
  const begin = (start: PlacementStart) => {
    const state = startPlacement(start);
    const first = pick(state.level, []);
    if (first) setRun({ state, asked: [first], history: [] });
  };
  const answered = (index: number, correct: boolean) => setRun(previous => {
    if (!previous || index !== previous.history.length) return previous;
    const history = [...previous.history, { level: previous.asked[index].level, correct }];
    const state = nextPlacement(previous.state, correct);
    const next = history.length < PLACEMENT_SIZE ? pick(state.level, previous.asked) : null;
    return { state, history, asked: next ? [...previous.asked, next] : previous.asked };
  });

  const title = tp('title');
  const crumbs = [{ label: tt('title'), href: '/math/test' }, { label: title }];
  if (!run) {
    return <>
      <title>{`${title} | PAIBOT.app`}</title>
      <ToolLayout title={title} centerTitle compact aboveTitle={<MathBreadcrumb crumbs={crumbs} />}>
        <p className={styles.intro}>{tp('intro', { count: PLACEMENT_SIZE })}</p>
        <h2 className={styles.ask}>{tp('ask')}</h2>
        <ul className={styles.starts}>
          {(Object.keys(PLACEMENT_STARTS) as PlacementStart[]).map(start => <li key={start}>
            <button type="button" className={styles.start} onClick={() => begin(start)} data-placement-start={start}>{tp(`starts.${start}`)}</button>
          </li>)}
        </ul>
      </ToolLayout>
    </>;
  }

  const questions = run.asked.map(({ id, level }) => {
    const { problem, question } = byId.get(id)!;
    return { ...question, tier: problem.tier, source: { label: `${levelName(level)}・${t(`units.${problem.unit}.items.${problem.item}.title`)}`, href: `/math/${problem.unit}/${problem.item}` } };
  });
  const outcome = run.history.length === PLACEMENT_SIZE ? placementResult(run.history) : null;
  const testOf = (level: number) => `/math/test/${PLACEMENT_LEVELS[level][0]}`;
  const result = <div className={styles.result} data-placement-result>
    <p className={styles.resultLabel}>{tp('resultLabel')}</p>
    <p className={styles.level}>{outcome ? (outcome.top ? tp('resultTop', { level: levelName(outcome.level) }) : tp('resultLevel', { level: levelName(outcome.level) })) : tp('resultBelow')}</p>
    <div className={styles.links}>
      <Link href={testOf(outcome?.level ?? 0)} className={styles.link}>{tp('takeTest', { level: levelName(outcome?.level ?? 0) })}</Link>
      {outcome && !outcome.top && <Link href={testOf(outcome.level + 1)} className={styles.link}>{tp('challenge', { level: levelName(outcome.level + 1) })}</Link>}
    </div>
  </div>;
  return <>
    <title>{`${title} | PAIBOT.app`}</title>
    <MathSetQuiz key={pools.flat().join()} title={title} setLabel={tp('setLabel', { count: PLACEMENT_SIZE })} questions={questions} total={PLACEMENT_SIZE} sharePath="/math/test/placement"
      shareText={(correct, total) => tp('shareText', { level: outcome ? (outcome.top ? tp('resultTop', { level: levelName(outcome.level) }) : tp('resultLevel', { level: levelName(outcome.level) })) : tp('resultBelow'), correct, total })}
      crumbs={crumbs} onAnswered={answered} result={result}
      onRetry={() => { setRun(null); revalidator.revalidate(); }} retryLabel={tp('retry')} />
  </>;
}
