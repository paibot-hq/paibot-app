import { env } from "cloudflare:workers";

// Server-only (reads runtime env); import only from a route action.
//
// Fetches a user-supplied URL once, following redirects by hand so every hop
// can be shown and checked. Cloudflare's egress cannot reach this project's
// private networks, but loopback/private literals and internal names are
// still refused on every hop so the tool never probes local services
// (including under `vite preview`, where fetch does reach localhost).

export type SiteCheckHop = { url: string; status: number; ms: number };

export type SiteCheckResult =
  | {
      status: "ok";
      url: string;
      finalUrl: string;
      httpStatus: number;
      totalMs: number;
      hops: SiteCheckHop[];
      tooManyRedirects: boolean;
      contentType?: string;
      server?: string;
    }
  | { status: "error"; reason: "invalid_url" | "blocked_host" | "timeout" | "connection_failed" };

const TOTAL_BUDGET_MS = 10_000;
const MAX_REDIRECTS = 5;
const USER_AGENT = "PAIBOT.app site check (+https://paibot.app/site-check)";

function parseUrl(text: string, base?: URL): URL | null {
  let url: URL;
  try {
    url = new URL(text, base);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  return url;
}

export function normalizeUrl(input: string): URL | null {
  const text = input.trim();
  if (!text || text.length > 2048 || /[\s\0]/.test(text)) return null;
  const url = parseUrl(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`);
  if (!url) return null;
  // A bare word like "example" is almost always a typo, not an intranet host.
  if (!url.hostname.includes(".") && !url.hostname.startsWith("[")) return null;
  return url;
}

// The URL parser has already turned forms like 2130706433 or 0x7f.1 into
// dotted IPv4, so only canonical literals need matching here.
export function isPrivateHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase().replace(/\.$/, "");
  if (host === "localhost" || /\.(?:localhost|local|internal|home\.arpa)$/.test(host)) return true;
  const v4 = host.match(/^(\d+)\.(\d+)\.\d+\.\d+$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  if (host.includes(":")) {
    return host === "::" || host === "::1" || host.startsWith("::ffff:") || /^f[cd]/.test(host) || /^fe[89ab]/.test(host);
  }
  return false;
}

export async function checkSite(input: string): Promise<SiteCheckResult> {
  const start = normalizeUrl(input);
  if (!start) return { status: "error", reason: "invalid_url" };
  // Test seam, like WHOIS_ROOT_SERVER: scripts/check-site-check.mjs sets it
  // to reach a fake server on 127.0.0.1. "false" in every deployed config.
  const allowPrivate = (env.SITE_CHECK_ALLOW_PRIVATE as string) === "true";
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  const hops: SiteCheckHop[] = [];
  let url = start;

  for (let hop = 0; ; hop++) {
    if (!allowPrivate && isPrivateHost(url.hostname)) return { status: "error", reason: "blocked_host" };
    const began = Date.now();
    let response: Response;
    try {
      response = await fetch(url, {
        redirect: "manual",
        headers: { "user-agent": USER_AGENT, accept: "*/*" },
        signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())),
      });
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      return { status: "error", reason: name === "TimeoutError" || name === "AbortError" ? "timeout" : "connection_failed" };
    }
    // Only the headers are needed; don't download the page.
    await response.body?.cancel().catch(() => {});
    hops.push({ url: url.href, status: response.status, ms: Date.now() - began });

    const location = response.headers.get("location");
    const next = response.status >= 300 && response.status < 400 && location ? parseUrl(location, url) : null;
    const tooManyRedirects = next !== null && hop === MAX_REDIRECTS;
    if (!next || tooManyRedirects) {
      return {
        status: "ok",
        url: start.href,
        finalUrl: url.href,
        httpStatus: response.status,
        totalMs: hops.reduce((sum, h) => sum + h.ms, 0),
        hops,
        tooManyRedirects,
        contentType: response.headers.get("content-type") ?? undefined,
        server: response.headers.get("server") ?? undefined,
      };
    }
    url = next;
  }
}
