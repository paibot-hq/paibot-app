import { redirect } from 'react-router';
import { siteOrigins, type SiteKey } from '../lib/sites';
import { pathWithoutLocale } from '../lib/seo';
import type { Route } from './+types/site-redirect';

// The former list and category pages: the app's list is now on its cover, and the learning drills moved to the
// learning site, the developer and network tools to the tools site (src/lib/sites.ts).
const TARGET: Record<string, { site: SiteKey; hash?: string }> = {
  '/study': { site: 'learn' }, '/dev': { site: 'tools' }, '/network': { site: 'tools' },
  '/apps': { site: 'app', hash: '#apps' }, '/daily': { site: 'app', hash: '#daily' }, '/game': { site: 'app', hash: '#game' }, '/utility': { site: 'app', hash: '#utility' },
};
export function loader({ request, params }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const { site, hash = '' } = TARGET[pathWithoutLocale(url.pathname)] ?? { site: 'app' };
  return redirect(`${siteOrigins(url.origin)[site]}/${params.locale}${hash}`, 301);
}
