import { data } from 'react-router';
import IqTest from './iq-test';
import PublicHead from '../../components/public-head';
import { getDistribution, recordResult } from './iq.server';
import { isKeptResult } from './matrix';
import { readFormPost } from '../../lib/form-post.server';
import { withinToolLimit } from '../../lib/rate-limit.server';
import { useLocale, useTranslations } from 'use-intl';
import type { Route } from './+types/route';

// Everyone's scores so far, for the chart on the first screen. The test works without them.
export async function loader() {
  try { return { distribution: await getDistribution() }; } catch { return { distribution: null }; }
}

// A finished test's score: kept (anonymously) and placed among everyone's. Limited per client IP like the other tools
// that write, so a script cannot flood the chart.
export async function action({ request }: Route.ActionArgs) {
  const parsed = await readFormPost(request);
  if (!parsed.ok) return data({ error: 'invalid' as const }, { status: parsed.status });
  const score = Number(parsed.form.get('score'));
  const seconds = Number(parsed.form.get('seconds'));
  if (!isKeptResult(score, seconds)) return { error: 'invalid' as const };
  if (!(await withinToolLimit(request, 'iq-test'))) return { error: 'limited' as const };
  try { return { score, ...(await recordResult(score, seconds)) }; } catch { return { error: 'failed' as const }; }
}

export default function Page({ loaderData }: Route.ComponentProps) {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/iq-test" title={`${t('iqTest.title')} | PAIBOT.app`} description={t('iqTest.description')} /><IqTest distribution={loaderData.distribution} /></>;
}
