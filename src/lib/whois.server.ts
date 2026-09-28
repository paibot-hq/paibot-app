import { connect } from "cloudflare:sockets";
import { env } from "cloudflare:workers";

// Server-only: opens raw TCP sockets and reads runtime env. Only import this
// from a route action — never from component code, or "cloudflare:sockets"/
// "cloudflare:workers" fail to resolve in the client build (neither exists
// in the browser). See src/lib/seo.server.ts for the same convention.
//
// RDAP is tried first: its registries answer 404 for an unregistered domain,
// and some TLDs (.app, .dev) have no WHOIS server at all. TLDs without RDAP
// (.jp, .io, ...) fall back to WHOIS, where "not registered" can only be
// read from each registry's wording.

export type ParsedWhois = {
  registrar?: string;
  registrant?: string;
  creationDate?: string;
  expiryDate?: string;
  nameServers: string[];
  status: string[];
};

// "available" means the registry has no record, not that it can be bought:
// reserved and premium names also have no record.
export type Availability = "available" | "registered" | "unknown";

export type WhoisResult =
  | { status: "ok"; domain: string; source: "rdap" | "whois"; server: string; availability: Availability; raw: string; parsed: ParsedWhois }
  | { status: "error"; reason: "invalid_domain" | "unknown_tld" | "no_server" | "timeout" | "connection_failed" };

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
  registrant: ["registrant organization", "registrant name", "registrant", "登録者名", "組織名", "organization"],
  creationDate: ["creation date", "registered on", "domain registration date", "created", "登録年月日"],
  expiryDate: ["registry expiry date", "registrar registration expiration date", "expiration date", "expiry date", "paid-till", "有効期限"],
};
const NAME_SERVER_KEYS = new Set(["name server", "nserver", "ネームサーバ"]);
const STATUS_KEYS = new Set(["domain status", "status", "状態"]);

// WHOIS has no universal schema - every registry/registrar formats fields
// differently. Rather than a per-registry parser, this extracts only the
// handful of fields the UI shows (first-match-wins per field), and the
// caller always keeps the raw text too as a fallback for anything this
// alias table doesn't recognize (registrant address, DNSSEC, abuse contacts,
// ...). Dates are passed through as-is, not normalized across formats.
function parseWhois(raw: string): ParsedWhois {
  const parsed: ParsedWhois = { nameServers: [], status: [] };
  for (const line of raw.split(/\r?\n/)) {
    // JPRS (.jp) writes `p. [ネームサーバ]   ns1.example.jp` instead of `key: value`.
    const bracket = line.match(/^(?:[a-z]\.\s*)?\[([^\]]+)\]\s+(\S.*)$/);
    const colon = line.indexOf(":");
    if (!bracket && colon === -1) continue;
    const key = (bracket ? bracket[1] : line.slice(0, colon)).trim().toLowerCase();
    const value = (bracket ? bracket[2] : line.slice(colon + 1)).trim();
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

// Registry wording for "no such domain", e.g. Verisign `No match for domain`,
// JPRS `No match!!`, Identity Digital `Domain not found.`, .co
// `The queried object does not exist: DOMAIN NOT FOUND`, DENIC `Status: free`.
const NOT_FOUND_RE = /\bno match\b|\bdomain not found\b|^\s*not found\.?\s*$|\bno (?:data|entries|object) found\b|\bqueried object does not exist\b|^status:\s*(?:free|available)\s*$/im;

function whoisAvailability(raw: string, parsed: ParsedWhois): Availability {
  if (NOT_FOUND_RE.test(raw)) return "available";
  if (parsed.registrar || parsed.creationDate || parsed.expiryDate || parsed.nameServers.length || parsed.status.length) return "registered";
  return "unknown";
}

type RdapEntity = { roles?: string[]; vcardArray?: [string, [string, unknown, string, unknown][]]; entities?: RdapEntity[] };
type RdapDomain = {
  entities?: RdapEntity[];
  events?: { eventAction?: string; eventDate?: string }[];
  nameservers?: { ldhName?: string }[];
  status?: string[];
};

function vcardName(entity: RdapEntity | undefined): string | undefined {
  const properties = entity?.vcardArray?.[1] ?? [];
  const value = (properties.find(([name]) => name === "org") ?? properties.find(([name]) => name === "fn"))?.[3];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseRdap(json: RdapDomain): ParsedWhois {
  const entities = (json.entities ?? []).flatMap(entity => [entity, ...(entity.entities ?? [])]);
  const withRole = (role: string) => entities.find(entity => entity.roles?.includes(role));
  const event = (action: string) => json.events?.find(e => e.eventAction === action)?.eventDate;
  return {
    registrar: vcardName(withRole("registrar")),
    registrant: vcardName(withRole("registrant")),
    creationDate: event("registration"),
    expiryDate: event("expiration"),
    nameServers: [...new Set((json.nameservers ?? []).flatMap(ns => ns.ldhName ? [ns.ldhName.toLowerCase()] : []))],
    status: json.status ?? [],
  };
}

type Bootstrap = { services: [string[], string[]][] };
let bootstrap: Promise<Map<string, string> | null> | undefined;

function rdapServers(budgetMs: number): Promise<Map<string, string> | null> {
  bootstrap ??= fetch(env.RDAP_BOOTSTRAP_URL || "https://data.iana.org/rdap/dns.json", { signal: AbortSignal.timeout(budgetMs), cf: { cacheTtl: 86400, cacheEverything: true } })
    .then(response => response.ok ? response.json() as Promise<Bootstrap> : null)
    .then(json => json && new Map(json.services.flatMap(([tlds, urls]) => {
      const url = urls.find(u => u.startsWith("https://")) ?? urls[0];
      return url ? tlds.map(tld => [tld.toLowerCase(), url.endsWith("/") ? url : `${url}/`] as [string, string]) : [];
    })))
    .catch(() => null)
    .then(servers => { if (!servers) bootstrap = undefined; return servers; });
  return bootstrap;
}

// Returns null when RDAP cannot answer (no service for the TLD, errors,
// rate limits), so the caller falls back to WHOIS.
async function lookupRdap(domain: string, deadline: number): Promise<WhoisResult | null> {
  const servers = await rdapServers(Math.max(1, deadline - Date.now()));
  const labels = domain.split(".");
  const base = labels.map((_, i) => servers?.get(labels.slice(i).join("."))).find(Boolean);
  if (!base) return null;
  const url = `${base}domain/${domain}`;
  try {
    const response = await fetch(url, { headers: { accept: "application/rdap+json" }, signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())) });
    if (response.status === 404) {
      // The status alone is the answer; Verisign sometimes drops the
      // connection while the 404 body is still being read.
      const raw = await response.text().catch(() => "");
      return { status: "ok", domain, source: "rdap", server: url, availability: "available", raw, parsed: { nameServers: [], status: [] } };
    }
    if (!response.ok) return null;
    const json = await response.json() as RdapDomain;
    return { status: "ok", domain, source: "rdap", server: url, availability: "registered", raw: JSON.stringify(json, null, 2), parsed: parseRdap(json) };
  } catch {
    return null;
  }
}

export async function lookupWhois(domainInput: string): Promise<WhoisResult> {
  const domain = normalizeDomain(domainInput);
  if (!domain) return { status: "error", reason: "invalid_domain" };

  const deadline = Date.now() + TOTAL_BUDGET_MS;
  const rdap = await lookupRdap(domain, deadline);
  if (rdap) return rdap;

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
  // IANA knows every TLD, so "0 objects" from it means the TLD does not exist.
  if (/^%\s*This query returned 0 objects/im.test(raw)) return { status: "error", reason: "unknown_tld" };
  // IANA answered with its record for the TLD itself and no referral: the TLD
  // has no WHOIS server, and that record says nothing about this domain.
  if (/^source:\s*IANA\s*$/im.test(raw)) return { status: "error", reason: lastError ?? "no_server" };
  const parsed = parseWhois(raw);
  return { status: "ok", domain, source: "whois", server: lastServer, availability: whoisAvailability(raw, parsed), raw, parsed };
}
