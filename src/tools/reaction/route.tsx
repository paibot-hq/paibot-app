import { data } from 'react-router';
import ReactionTest from './reaction-test';
import PublicHead from '../../components/public-head';
import { getDistribution, recordResult } from './reaction.server';
import { isKeptResult } from './reaction';
import { readFormPost } from '../../lib/form-post.server';
import { withinToolLimit } from '../../lib/rate-limit.server';
import { useLocale, useTranslations } from 'use-intl';
import type { Route } from './+types/route';

// Everyone's results so far, for the chart before a round is played. The page works without them (no database, or it
// failed): the test needs none.
export async function loader() {
  try { return { distribution: await getDistribution() }; } catch { return { distribution: null }; }
}

// A finished round's average: kept (anonymously) and placed among everyone's. Limited per client IP like the other
// tools that write, so a script cannot flood the chart.
export async function action({ request }: Route.ActionArgs) {
  const parsed = await readFormPost(request);
  if (!parsed.ok) return data({ error: 'invalid' as const }, { status: parsed.status });
  const ms = Number(parsed.form.get('ms'));
  if (!isKeptResult(ms)) return { error: 'invalid' as const };
  if (!(await withinToolLimit(request, 'reaction'))) return { error: 'limited' as const };
  try { return { ms, ...(await recordResult(ms)) }; } catch { return { error: 'failed' as const }; }
}

export default function Page({ loaderData }: Route.ComponentProps) {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/reaction" title={`${t('reaction.title')} | PAIBOT.app`} description={t('reaction.description')} /><ReactionTest distribution={loaderData.distribution} /></>;
}
