import { env } from 'cloudflare:workers';
import { handleEmbed, restAi } from '../lib/govfaq-embed.server';

// See src/lib/govfaq-embed.server.ts. On your own computer, LOCAL_AI_ACCOUNT_ID and LOCAL_AI_TOKEN in .dev.vars make it call Workers AI by its REST
// address (the binding needs a helper Worker there); nothing deployed sets them.
const local = env as unknown as Record<string, string | undefined>;
const ai = local.LOCAL_AI_ACCOUNT_ID && local.LOCAL_AI_TOKEN ? restAi({ accountId: local.LOCAL_AI_ACCOUNT_ID, token: local.LOCAL_AI_TOKEN }) : env.AI;

export async function action({ request }: { request: Request }) {
  return handleEmbed(request, { within: async key => (await env.GOVFAQ_RATE_LIMIT.limit({ key })).success, ai });
}

export function loader() {
  return new Response(null, { status: 405, headers: { Allow: 'POST' } });
}
