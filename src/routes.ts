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
  ...[...publicPaths.filter(path => path !== '').map(path => path.slice(1)), 'diary', 'profile', 'sign-in/*', 'sign-up/*']
    .map(path => route(path, 'routes/redirect.ts', { id: `locale-redirect/${path}` })),
  route('api/quiz', 'routes/api.quiz.ts'),
  route('sitemap.xml', 'routes/sitemap.ts'),
  route(':locale', 'routes/locale.tsx', [
    index('routes/home.tsx'),
    route('diary', 'routes/diary.tsx'),
    route('profile', 'routes/profile.tsx'),
    route('math', 'routes/math.tsx'),
    route('math/units', 'routes/math-redirect.ts', { id: 'math-redirect/units' }),
    route('math/level/:stage', 'routes/math-redirect.ts', { id: 'math-redirect/level' }),
    route('math/pythagoras/:setId', 'routes/math-pythagoras.tsx'),
    route('math/factorization/:setId', 'routes/math-factorization.tsx'),
    route('math/signed/:setId', 'routes/math-signed.tsx'),
    route('math/arith/:setId', 'routes/math-arith.tsx'),
    // Units have no page of their own: /math lists every set.
    route('math/:unit', 'routes/math-redirect.ts', { id: 'math-redirect/unit' }),
    route('math/:unit/:setId', 'routes/math-unit-set.tsx'),
    route('apps', 'routes/apps.tsx'),
    route('daily', 'routes/category-daily.tsx'),
    route('game', 'routes/category-game.tsx'),
    route('utility', 'routes/category-utility.tsx'),
    route('study', 'routes/category-study.tsx'),
    route('dev', 'routes/category-dev.tsx'),
    route('network', 'routes/category-network.tsx'),
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
