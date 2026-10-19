import TypingGame from './typing-game';
import PublicHead from '../../components/public-head';
import { getDistribution, recordResult } from './typing.server';
import { isKeptResult } from './game';
import { withinToolLimit } from '../../lib/rate-limit.server';
import { useLocale, useTranslations } from 'use-intl';
import type { Route } from './+types/route';

// Everyone's scores so far, for the chart on the first screen. The game works without them.
export async function loader() {
  try { return { distribution: await getDistribution() }; } catch { return { distribution: null }; }
}

// A finished round: kept (anonymously) and placed among everyone's. Limited per client IP like the other tools that
// write, so a script cannot flood the chart.
export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const score = Number(form.get('score')), keys = Number(form.get('keys')), misses = Number(form.get('misses'));
  if (!isKeptResult(score, keys, misses)) return { error: 'invalid' as const };
  if (!(await withinToolLimit(request, 'typing'))) return { error: 'limited' as const };
  try { return { score, ...(await recordResult(score, keys, misses)) }; } catch { return { error: 'failed' as const }; }
}

export default function Page({ loaderData }: Route.ComponentProps) {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/typing" title={`${t('typing.title')} | PAIBOT.app`} description={t('typing.description')} /><TypingGame distribution={loaderData.distribution} /></>;
}
