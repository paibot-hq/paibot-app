import DomainLookup from './domain-lookup';
import PublicHead from '../../components/public-head';
import { lookupWhois, type WhoisResult } from './whois.server';
import { withinToolLimit } from '../../lib/rate-limit.server';
import { useLocale, useTranslations } from 'use-intl';
import type { Route } from './+types/route';

// lookupWhois never throws (invalid input, timeouts and connection failures
// all resolve to a WhoisResult), so this needs no try/catch - the action
// always returns typed data for the client to render, never a 500/ErrorBoundary.
export async function action({ request }: Route.ActionArgs): Promise<WhoisResult> {
  const form = await request.formData();
  return lookupWhois(String(form.get('domain') ?? ''), () => withinToolLimit(request, 'domain'));
}

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/domain" title={`${t('domain.title')} | PAIBOT`} description={t('domain.description')} /><DomainLookup /></>;
}
