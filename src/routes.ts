import { existsSync } from 'node:fs';
import { index, route, type RouteConfig } from '@react-router/dev/routes';
import { APP_CATALOG } from './lib/app-catalog';
import { publicPaths } from './lib/seo';

// A tool is a folder: src/tools/<slug>/route.tsx serves the catalog entry's
// href, so adding one needs no edit here. Tools whose page lives elsewhere
// (math's set pages, the diary) are routed explicitly below.
const toolRoutes = APP_CATALOG
  .filter(app => app.href && existsSync(new URL(`./tools/${app.slug}/route.tsx`, import.meta.url)))
  .map(app => route(app.href!.slice(1), `tools/${app.slug}/route.tsx`));
export default [
  index('routes/redirect.ts'),
  ...[...publicPaths.filter(path => path !== '').map(path => path.slice(1)), 'diary', 'profile', 'legal/commerce', 'sign-in/*', 'sign-up/*']
    .map(path => route(path, 'routes/redirect.ts', { id: `locale-redirect/${path}` })),
  route('api/quiz', 'routes/api.quiz.ts'),
  route('api/govfaq/embed', 'routes/api.govfaq.embed.ts'),
  route('sitemap.xml', 'routes/sitemap.ts'),
  route(':locale', 'routes/locale.tsx', [
    index('routes/home.tsx'),
    route('diary', 'routes/diary.tsx'),
    route('profile', 'routes/profile.tsx'),
    route('math', 'routes/math.tsx'),
    route('math/units', 'routes/math-redirect.ts', { id: 'math-redirect/units' }),
    route('math/level/:stage', 'routes/math-redirect.ts', { id: 'math-redirect/level' }),
    route('math/:unit', 'routes/math-unit.tsx'),
    route('math/:unit/:item', 'routes/math-item.tsx'),
    route('math/:unit/:item/:set', 'routes/math-quiz.tsx'),
    route('favorites', 'routes/favorites.ts'),
    route('apps', 'routes/site-redirect.ts', { id: 'site-redirect/apps' }),
    route('daily', 'routes/site-redirect.ts', { id: 'site-redirect/daily' }),
    route('game', 'routes/site-redirect.ts', { id: 'site-redirect/game' }),
    route('utility', 'routes/site-redirect.ts', { id: 'site-redirect/utility' }),
    route('study', 'routes/site-redirect.ts', { id: 'site-redirect/study' }),
    route('dev', 'routes/site-redirect.ts', { id: 'site-redirect/dev' }),
    route('network', 'routes/site-redirect.ts', { id: 'site-redirect/network' }),
    route('about', 'routes/about.tsx'),
    route('supporter', 'routes/supporter.tsx'),
    route('legal/terms', 'routes/legal-terms.tsx'),
    route('legal/privacy', 'routes/legal-privacy.tsx'),
    route('legal/commerce', 'routes/legal-commerce.tsx'),
    ...toolRoutes,
    route('sign-in/*', 'routes/sign-in.tsx'),
    route('sign-up/*', 'routes/sign-up.tsx'),
    route('*', 'routes/not-found.tsx'),
  ]),
] satisfies RouteConfig;
