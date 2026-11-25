import { execFileSync, spawnSync } from 'node:child_process';

// `npm run deploy -- <dev|production|preview>`: deploys the Worker of a target in void.config.ts with Void.
// - Migrations are not Void's here: run `npm run db:migrate:<dev|prod>` (Wrangler) before, so the new code never sees a
//   schema it does not know, and the preview, which shares dev's database, never changes it.
// - CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY, when set in the environment, are put on the Worker first (production
//   only takes pk_live_/sk_live_ keys, every other target only test keys). Without them the Worker keeps the ones it has.
// - X-App-Version is the commit (PAIBOT_APP_VERSION), so CI can wait until it is served (scripts/wait-for-deploy.mjs).
// - Void checks the uploaded version before it gets traffic. A Worker behind Cloudflare Access (dev) needs
//   CF_ACCESS_CLIENT_ID, CF_ACCESS_CLIENT_SECRET and CF_ACCESS_READINESS_ORIGIN for that; a workers.dev one (preview)
//   needs CLOUDFLARE_WORKERS_SUBDOMAIN on a machine that has not deployed it before.
const [target, ...rest] = process.argv.slice(2);
if (!['dev', 'production', 'preview'].includes(target) || rest.length) {
  console.error('Usage: npm run deploy -- <dev|production|preview>');
  process.exit(1);
}
const env = {
  ...process.env,
  PAIBOT_APP_TARGET: target,
  PAIBOT_APP_WORKERS_AI: '1',
  PAIBOT_APP_VERSION: process.env.PAIBOT_APP_VERSION || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
};
if (target === 'preview') env.CLOUDFLARE_WORKERS_SUBDOMAIN ||= 'proud-leaf-50e3';

function voidCli(args, input) {
  const result = spawnSync(process.execPath, ['node_modules/void/dist/cli/cli.mjs', ...args], { env, input, stdio: [input === undefined ? 'inherit' : 'pipe', 'inherit', 'inherit'] });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Secret commands act on the platform saved in .void/project.json (never committed).
voidCli(['connect', '--platform', 'cloudflare'], '');

const { CLERK_PUBLISHABLE_KEY: publishable, CLERK_SECRET_KEY: secret } = process.env;
if (publishable || secret) {
  const live = target === 'production';
  const ok = live
    ? publishable?.startsWith('pk_live_') && secret?.startsWith('sk_live_')
    : publishable?.startsWith('pk_test_') && secret?.startsWith('sk_test_');
  if (!ok) {
    console.error(`${target} needs both Clerk keys, ${live ? 'pk_live_/sk_live_' : 'pk_test_/sk_test_'}`);
    process.exit(1);
  }
  voidCli(['secret', 'put', 'CLERK_PUBLISHABLE_KEY'], publishable);
  voidCli(['secret', 'put', 'CLERK_SECRET_KEY'], secret);
}

voidCli(['deploy', '--platform', 'cloudflare', '--skip-migrations'], '');
