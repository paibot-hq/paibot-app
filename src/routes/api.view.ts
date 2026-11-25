import { env, waitUntil } from 'cloudflare:workers';
import { beaconView, dayOf, isBot } from '../lib/tool-ranking';

// One more view of a tool today, for the tool ranking (src/lib/tool-ranking.ts): the page itself reports its document
// load once it runs in the browser (src/lib/view-beacon.ts). The count moved here from the response middleware so that
// crawlers wearing a browser's User-Agent, which fetch pages but never run their scripts, stay out of it. The response
// is 204 whether or not the view counted: the beacon ignores it, and junk is not told what passed. A failed write only
// loses that one view.
const COUNT_VIEW = 'INSERT INTO tool_views (slug, day, views) VALUES (?1, ?2, 1) ON CONFLICT (slug, day) DO UPDATE SET views = views + 1';

export async function action({ request }: { request: Request }) {
  const done = new Response(null, { status: 204 });
  const origin = new URL(request.url).origin;
  // The beacon is a same-origin POST from a page of ours; a browser extension's or another site's fetch is not.
  if (isBot(request.headers.get('User-Agent') ?? '')) return done;
  const site = request.headers.get('Sec-Fetch-Site');
  if (site !== null && site !== 'same-origin') return done;
  const from = request.headers.get('Origin');
  if (from !== null && from !== origin) return done;
  let body: { path?: unknown; referrer?: unknown };
  try { body = await request.json(); } catch { return done; }
  const slug = beaconView(body?.path, body?.referrer, origin);
  if (slug) waitUntil(env.DB.prepare(COUNT_VIEW).bind(slug, dayOf(new Date())).run().catch(() => {}));
  return done;
}
