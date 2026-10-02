import { redirect } from 'react-router';
import { siteOrigins } from '../lib/sites';
import { pathWithoutLocale } from '../lib/seo';
import type { Route } from './+types/site-redirect';

// The former category pages whose tools moved to another site (src/lib/sites.ts): the learning drills to the
// learning site, the developer and network tools to the tools site.
const TARGET = { '/study': 'learn', '/dev': 'tools', '/network': 'tools' } as const;
export function loader({ request, params }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const site = TARGET[pathWithoutLocale(url.pathname) as keyof typeof TARGET] ?? 'app';
  return redirect(`${siteOrigins(url.origin)[site]}/${params.locale}`, 301);
}
