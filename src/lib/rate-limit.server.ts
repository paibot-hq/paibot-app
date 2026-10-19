import { env } from "cloudflare:workers";

// Server-only (reads runtime env); import only from a route action.
//
// Tools that make requests to other sites on a visitor's behalf are limited
// per client IP (TOOL_RATE_LIMIT in wrangler.jsonc: 10 a minute per tool), so
// the site cannot be scripted into a relay that floods someone else; so are
// tools that keep what visitors send (the reaction and IQ tests' shared
// results), so a script cannot flood them.
export type LimitedTool = "site-check" | "domain" | "reaction" | "iq-test";

export async function withinToolLimit(request: Request, tool: LimitedTool): Promise<boolean> {
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const { success } = await env.TOOL_RATE_LIMIT.limit({ key: `${tool}:${ip}` });
  return success;
}
