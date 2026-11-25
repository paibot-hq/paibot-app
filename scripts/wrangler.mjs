import { spawnSync } from 'node:child_process';
import { wranglerConfigArgs } from './lib/wrangler-target.mjs';

// `node scripts/wrangler.mjs <dev|production|preview> <wrangler arguments...>`: Wrangler against a deployment target
// of void.config.ts, for what Void does not do itself (scripts/lib/wrangler-target.mjs). For example:
//   node scripts/wrangler.mjs dev d1 migrations apply DB --local
//   node scripts/wrangler.mjs production d1 migrations apply DB --remote
const [target, ...args] = process.argv.slice(2);
if (!target || !args.length) {
  console.error('Usage: node scripts/wrangler.mjs <dev|production|preview> <wrangler arguments...>');
  process.exit(1);
}
const config = await wranglerConfigArgs(target);
// --persist-to is only for the commands that work on local state.
const extra = args.includes('--local') ? config : config.slice(0, 2);
const result = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', ...args, ...extra], { stdio: 'inherit' });
process.exit(result.status ?? 1);
