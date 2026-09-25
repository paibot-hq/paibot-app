import { index, route, type RouteConfig } from '@react-router/dev/routes';
import { publicPaths } from './lib/seo';
export default [
  index('routes/redirect.ts'),
  ...[...publicPaths.filter(path => path !== '').map(path => path.slice(1)), 'math', 'sign-in/*', 'sign-up/*']
    .map(path => route(path, 'routes/redirect.ts', { id: `locale-redirect/${path}` })),
  route('sitemap.xml', 'routes/sitemap.ts'),
  route(':locale', 'routes/locale.tsx', [
    index('routes/home.tsx'),
    route('math', 'routes/math.tsx'),
    route('apps', 'routes/apps.tsx'),
    route('about', 'routes/about.tsx'),
    route('wc', 'routes/wc.tsx'),
    route('json', 'routes/json.tsx'),
    route('arith', 'routes/arith.tsx'),
    route('base64', 'routes/base64.tsx'),
    route('urlencode', 'routes/urlencode.tsx'),
    route('password', 'routes/password.tsx'),
    route('stopwatch', 'routes/stopwatch.tsx'),
    route('ip', 'routes/ip.tsx'),
    route('dice', 'routes/dice.tsx'),
    route('reaction', 'routes/reaction.tsx'),
    route('timing', 'routes/timing.tsx'),
    route('age', 'routes/age.tsx'),
    route('sign-in/*', 'routes/sign-in.tsx'),
    route('sign-up/*', 'routes/sign-up.tsx'),
    route('*', 'routes/not-found.tsx'),
  ]),
] satisfies RouteConfig;
