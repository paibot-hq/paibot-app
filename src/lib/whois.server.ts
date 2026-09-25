import { connect } from "cloudflare:sockets";
import { env } from "cloudflare:workers";

// Server-only: opens raw TCP sockets and reads runtime env. Only import this
// from a route action — never from component code, or "cloudflare:sockets"/
// "cloudflare:workers" fail to resolve in the client build (neither exists
// in the browser). See src/lib/seo.server.ts for the same convention.

export type ParsedWhois = {
  registrar?: string;
  registrant?: string;
  creationDate?: string;
  expiryDate?: string;
  nameServers: string[];
  status: string[];
};

export type WhoisResult =
  | { status: "ok"; domain: string; server: string; raw: string; parsed: ParsedWhois }
  | { status: "error"; reason: "invalid_domain" | "no_server" | "timeout" | "connection_failed" };

// Total wall-clock budget across every hop (IANA -> registry -> registrar),
// not per-socket — otherwise 3 hops at, say, 5s each could stack to 15s.
const TOTAL_BUDGET_MS = 8000;
// root (IANA or the configured override) -> TLD registry -> registrar.
const MAX_HOPS = 3;

// ASCII domain syntax only (no IDN/punycode for v1): labels of 1-63
// alphanumerics/hyphens (no leading/trailing hyphen), at least one dot,
// 253 chars overall. CR/LF/NUL are rejected before this regex even runs -
// see normalizeDomain.
const DOMAIN_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+\.?$/;

// `domain` is written directly into a raw socket as `${domain}\r\n`, so a
// value containing CR/LF/NUL could inject additional WHOIS protocol lines
// (e.g. "example.com\r\nSTUFF"). Reject those outright before any other
// validation, even though DOMAIN_RE's character class already excludes them.
function normalizeDomain(input: string): string | null {
  if (/[\r\n\0]/.test(input)) return null;
  if (input.length > 253) return null;
  const domain = input.trim().toLowerCase().replace(/\.$/, "");
  if (!domain || !DOMAIN_RE.test(domain)) return null;
  return domain;
}

class WhoisTimeoutError extends Error {}

function parseHostPort(hostPort: string): { hostname: string; port: number } {
  const colon = hostPort.lastIndexOf(":");
  if (colon === -1) return { hostname: hostPort, port: 43 };
  return { hostname: hostPort.slice(0, colon), port: Number(hostPort.slice(colon + 1)) || 43 };
}

// IANA's referral field is `refer:`; a TLD registry's own referral to the
// specific registrar's WHOIS server (thin registries like .com/.net) is
// `Registrar WHOIS Server:` or `ReferralServer:` (sometimes prefixed
// `whois://`). Treating all three as one "referral" concept keeps the hop
// loop in lookupWhois generic instead of hop-index-dependent.
function findReferral(text: string): string | null {
  const match = text.match(/^(?:refer|Registrar WHOIS Server|ReferralServer):\s*(?:whois:\/\/)?(\S+)/im);
  if (!match) return null;
  const value = match[1].replace(/\/$/, "");
  return value.includes(":") ? value : `${value}:43`;
}

async function queryServer(hostPort: string, domain: string, budgetMs: number): Promise<string> {
  const { hostname, port } = parseHostPort(hostPort);
  const socket = connect({ hostname, port });
  const deadline = Date.now() + budgetMs;
  try {
    const writer = socket.writable.getWriter();
    try {
      await writer.write(new TextEncoder().encode(`${domain}\r\n`));
    } finally {
      writer.releaseLock();
    }

    const reader = socket.readable.getReader();
    const chunks: Uint8Array[] = [];
    try {
      while (true) {
        const remaining = deadline - Date.now();
        if (remaining <= 0) throw new WhoisTimeoutError();
        const timer = new Promise<never>((_, reject) => setTimeout(() => reject(new WhoisTimeoutError()), remaining));
        const { value, done } = await Promise.race([reader.read(), timer]);
        if (done) break;
        if (value) chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const total = chunks.reduce((n, chunk) => n + chunk.length, 0);
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    return new TextDecoder().decode(merged);
  } finally {
    await socket.close().catch(() => {});
  }
}

const FIELD_ALIASES: Record<"registrar" | "registrant" | "creationDate" | "expiryDate", string[]> = {
  registrar: ["registrar", "sponsoring registrar"],
  registrant: ["registrant organization", "registrant name", "registrant"],
  creationDate: ["creation date", "registered on", "domain registration date", "created"],
  expiryDate: ["registry expiry date", "registrar registration expiration date", "expiration date", "expiry date", "paid-till"],
};
const NAME_SERVER_KEYS = new Set(["name server", "nserver"]);
const STATUS_KEYS = new Set(["domain status", "status"]);

// WHOIS has no universal schema - every registry/registrar formats fields
// differently. Rather than a per-registry parser, this extracts only the
// handful of fields the UI shows (first-match-wins per field), and the
// caller always keeps the raw text too as a fallback for anything this
// alias table doesn't recognize (registrant address, DNSSEC, abuse contacts,
// ...). Dates are passed through as-is, not normalized across formats.
function parseWhois(raw: string): ParsedWhois {
  const parsed: ParsedWhois = { nameServers: [], status: [] };
  for (const line of raw.split(/\r?\n/)) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (!value) continue;
    if (NAME_SERVER_KEYS.has(key)) {
      if (!parsed.nameServers.includes(value)) parsed.nameServers.push(value);
      continue;
    }
    if (STATUS_KEYS.has(key)) {
      if (!parsed.status.includes(value)) parsed.status.push(value);
      continue;
    }
    for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [keyof typeof FIELD_ALIASES, string[]][]) {
      if (parsed[field]) continue;
      if (aliases.includes(key)) {
        parsed[field] = value;
        break;
      }
    }
  }
  return parsed;
}

// TODO(future): RDAP (JSON-native, IANA has a bootstrap registry for it too)
// is the modern replacement for WHOIS and would avoid this free-text
// referral/parsing dance entirely - worth revisiting if WHOIS's per-registry
// inconsistency or rate-limiting becomes a real problem.
export async function lookupWhois(domainInput: string): Promise<WhoisResult> {
  const domain = normalizeDomain(domainInput);
  if (!domain) return { status: "error", reason: "invalid_domain" };

  const deadline = Date.now() + TOTAL_BUDGET_MS;
  let server = env.WHOIS_ROOT_SERVER || "whois.iana.org:43";
  let raw = "";
  let lastServer = server;
  let lastError: "timeout" | "connection_failed" | null = null;

  for (let hop = 0; hop < MAX_HOPS; hop++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      lastError = "timeout";
      break;
    }
    let response: string;
    try {
      response = await queryServer(server, domain, remaining);
    } catch (error) {
      // A later hop failing after an earlier one already succeeded is a
      // partial result, not a hard error - the loop below returns `raw` as-is.
      lastError = error instanceof WhoisTimeoutError ? "timeout" : "connection_failed";
      break;
    }
    raw = response;
    lastServer = server;
    const referral = findReferral(response);
    if (!referral) break;
    server = referral;
  }

  if (!raw.trim()) return { status: "error", reason: lastError ?? "no_server" };
  return { status: "ok", domain, server: lastServer, raw, parsed: parseWhois(raw) };
}
