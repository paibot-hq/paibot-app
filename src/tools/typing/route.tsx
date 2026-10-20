import TypingGame from './typing-game';
import PublicHead from '../../components/public-head';
import { getDistribution, recordResult } from './typing.server';
import { isKeptResult, isMode } from './game';
import { withinToolLimit } from '../../lib/rate-limit.server';
import { useLocale, useTranslations } from 'use-intl';
import type { Route } from './+types/route';

// Everyone's scores so far in each mode, for the chart on the first screen. The game works without them.
export async function loader() {
  try { const [ja, en] = await Promise.all([getDistribution('ja'), getDistribution('en')]); return { distributions: { ja, en } }; } catch { return { distributions: null }; }
}

// A finished round: kept (anonymously) and placed among everyone's. Limited per client IP like the other tools that
// write, so a script cannot flood the chart.
export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const mode = form.get('mode');
  const score = Number(form.get('score')), keys = Number(form.get('keys')), misses = Number(form.get('misses'));
  if (!isMode(mode) || !isKeptResult(score, keys, misses)) return { error: 'invalid' as const };
  if (!(await withinToolLimit(request, 'typing'))) return { error: 'limited' as const };
  try { return { score, ...(await recordResult(mode, score, keys, misses)) }; } catch { return { error: 'failed' as const }; }
}

export default function Page({ loaderData }: Route.ComponentProps) {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/typing" title={`${t('typing.title')} | PAIBOT.app`} description={t('typing.description')} /><TypingGame distributions={loaderData.distributions} locale={locale} /></>;
}
