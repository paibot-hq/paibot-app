import { env } from 'cloudflare:workers';
import { handleAnswer, type FaqText } from '../lib/govfaq-answer.server';
import { restAi } from '../lib/govfaq-embed.server';

// See src/lib/govfaq-answer.server.ts. The FAQ is read when the first answer is asked for (not with every request of the site), and kept.
let faqs: Promise<Map<string, FaqText>> | undefined;
function load() {
  faqs ??= import('../data/govfaq.json').then(module => {
    const rows = (module.default as unknown as { items: [string, number, string, string][] }).items;
    return new Map(rows.map(([id, , question, answer]) => [id, { id, question, answer }] as const));
  });
  return faqs;
}

// As in api.govfaq.embed.ts: on your own computer, LOCAL_AI_* in .dev.vars make it call Workers AI by its REST address.
const local = env as unknown as Record<string, string | undefined>;
const ai = local.LOCAL_AI_ACCOUNT_ID && local.LOCAL_AI_TOKEN ? restAi({ accountId: local.LOCAL_AI_ACCOUNT_ID, token: local.LOCAL_AI_TOKEN }) : env.AI;

export async function action({ request }: { request: Request }) {
  return handleAnswer(request, {
    within: async key => (await env.GOVFAQ_ANSWER_RATE_LIMIT.limit({ key })).success,
    ai,
    lookup: async ids => { const all = await load(); return ids.flatMap(id => all.get(id) ?? []); },
  });
}

export function loader() {
  return new Response(null, { status: 405, headers: { Allow: 'POST' } });
}
