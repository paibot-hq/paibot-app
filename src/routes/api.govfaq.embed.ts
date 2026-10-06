import { env } from 'cloudflare:workers';
import { handleEmbed } from '../lib/govfaq-embed.server';

// See src/lib/govfaq-embed.server.ts.
export async function action({ request }: { request: Request }) {
  return handleEmbed(request, { within: async key => (await env.GOVFAQ_RATE_LIMIT.limit({ key })).success, ai: env.AI });
}

export function loader() {
  return new Response(null, { status: 405, headers: { Allow: 'POST' } });
}
