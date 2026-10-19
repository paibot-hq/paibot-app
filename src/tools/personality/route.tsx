import PersonalityTest from './personality-test';
import PublicHead from '../../components/public-head';
import { countResults, recordResult } from './personality.server';
import { TRAITS, isKeptResult, type Scores } from './personality';
import { withinToolLimit } from '../../lib/rate-limit.server';
import { useLocale, useTranslations } from 'use-intl';
import type { Route } from './+types/route';

// A finished test's five scores: kept (anonymously) and placed among everyone's. Limited per client IP like the other
// tools that write, so a script cannot flood the comparison.
export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const scores = Object.fromEntries(TRAITS.map(t => [t, Number(form.get(t))])) as Scores;
  if (!isKeptResult(scores)) return { error: 'invalid' as const };
  if (!(await withinToolLimit(request, 'personality'))) return { error: 'limited' as const };
  try { return { distributions: await recordResult(scores) }; } catch { return { error: 'failed' as const }; }
}

// Only how many have taken it, for the first screen: everyone's results come with the reply to a finished test.
export async function loader() {
  try { return { total: await countResults() }; } catch { return { total: 0 }; }
}

export default function Page({ loaderData }: Route.ComponentProps) {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/personality" title={`${t('personality.title')} | PAIBOT.app`} description={t('personality.description')} /><PersonalityTest taken={loaderData.total} /></>;
}
