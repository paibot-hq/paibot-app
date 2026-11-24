import { data } from 'react-router';
import DomainLookup from './domain-lookup';
import PublicHead from '../../components/public-head';
import { lookupWhois, type WhoisResult } from './whois.server';
import { readFormPost } from '../../lib/form-post.server';
import { withinToolLimit } from '../../lib/rate-limit.server';
import { useLocale, useTranslations } from 'use-intl';
import type { Route } from './+types/route';

// lookupWhois never throws (invalid input, timeouts and connection failures
// all resolve to a WhoisResult), so this needs no try/catch - the action
// always returns typed data for the client to render, never a 500/ErrorBoundary.
export async function action({ request }: Route.ActionArgs) {
  const parsed = await readFormPost(request);
  if (!parsed.ok) return data({ status: 'error', reason: 'invalid_domain' } as WhoisResult, { status: parsed.status });
  return lookupWhois(String(parsed.form.get('domain') ?? ''), () => withinToolLimit(request, 'domain'));
}

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/domain" title={`${t('domain.title')} | PAIBOT.app`} description={t('domain.description')} /><DomainLookup /></>;
}
