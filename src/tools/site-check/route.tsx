import { data } from 'react-router';
import SiteCheck from './site-check';
import PublicHead from '../../components/public-head';
import { checkSite, type SiteCheckResult } from './site-check.server';
import { readFormPost } from '../../lib/form-post.server';
import { withinToolLimit } from '../../lib/rate-limit.server';
import { useLocale, useTranslations } from 'use-intl';
import type { Route } from './+types/route';

// checkSite never throws, so the action always returns data to render.
export async function action({ request }: Route.ActionArgs) {
  const parsed = await readFormPost(request);
  if (!parsed.ok) return data({ status: 'error', reason: 'invalid_url' } as SiteCheckResult, { status: parsed.status });
  return checkSite(String(parsed.form.get('url') ?? ''), () => withinToolLimit(request, 'site-check'));
}

export default function Page() {
  const t = useTranslations('App');
  const locale = useLocale();
  return <><PublicHead locale={locale} path="/site-check" title={`${t('siteCheck.title')} | PAIBOT.app`} description={t('siteCheck.description')} /><SiteCheck /></>;
}
