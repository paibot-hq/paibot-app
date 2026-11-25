import { existsSync } from 'node:fs';
import { index, route, type RouteConfig } from '@react-router/dev/routes';
import { APP_CATALOG } from './lib/app-catalog';
import { HOME_SECTIONS } from './lib/home-sections';
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
  route('api/govfaq/answer', 'routes/api.govfaq.answer.ts'),
  route('api/ip', 'routes/api.ip.ts'),
  route('sitemap.xml', 'routes/sitemap.ts'),
  route('robots.txt', 'routes/robots.ts'),
  route(':locale', 'routes/locale.tsx', [
    index('routes/home.tsx'),
    ...HOME_SECTIONS.map(section => route(section, 'routes/section-directory.tsx', { id: `sections/${section}` })),
    route('diary', 'routes/diary.tsx'),
    route('profile', 'routes/profile.tsx'),
    route('math', 'routes/math.tsx'),
    route('math/units', 'routes/math-redirect.ts', { id: 'math-redirect/units' }),
    route('math/level/:stage', 'routes/math-redirect.ts', { id: 'math-redirect/level' }),
    route('math/test', 'routes/math-tests.tsx'),
    route('math/test/placement', 'routes/math-placement.tsx'),
    route('math/test/:test', 'routes/math-test.tsx'),
    route('math/:unit', 'routes/math-unit.tsx'),
    route('math/:unit/:item', 'routes/math-item.tsx'),
    route('math/:unit/:item/:set', 'routes/math-quiz.tsx'),
    // AI and data science practice is not in the app catalog yet (src/tools/ai-ds/catalog.ts), so its top page is routed here too;
    // drop that line when it is registered in src/lib/app-catalog.ts.
    route('ai-ds', 'tools/ai-ds/route.tsx'),
    route('ai-ds/:unit/:item', 'tools/ai-ds/item.tsx'),
    route('ai-ds/:unit/:item/:set', 'tools/ai-ds/set.tsx'),
    // Computer science practice, the same (src/tools/cs/catalog.ts).
    route('cs', 'tools/cs/route.tsx'),
    route('cs/:unit/:item', 'tools/cs/item.tsx'),
    route('cs/:unit/:item/:set', 'tools/cs/set.tsx'),
    route('favorites', 'routes/favorites.ts'),
    route('apps', 'routes/apps.tsx'),
    route('daily', 'routes/site-redirect.ts', { id: 'site-redirect/daily' }),
    route('game', 'routes/site-redirect.ts', { id: 'site-redirect/game' }),
    route('utility', 'routes/site-redirect.ts', { id: 'site-redirect/utility' }),
    route('study', 'routes/site-redirect.ts', { id: 'site-redirect/study' }),
    route('dev', 'routes/site-redirect.ts', { id: 'site-redirect/dev' }),
    route('network', 'routes/site-redirect.ts', { id: 'site-redirect/network' }),
    route('about', 'routes/about.tsx'),
    route('ranking', 'routes/ranking.tsx'),
    route('legal/terms', 'routes/legal-terms.tsx'),
    route('legal/privacy', 'routes/legal-privacy.tsx'),
    route('legal/commerce', 'routes/legal-commerce.tsx'),
    ...toolRoutes,
    route('sign-in/*', 'routes/sign-in.tsx'),
    route('sign-up/*', 'routes/sign-up.tsx'),
    route('*', 'routes/not-found.tsx'),
  ]),
] satisfies RouteConfig;
