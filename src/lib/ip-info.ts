// What the site can see of a request, for the IP address page: the address, where the network says it is, who runs the network, and how the
// request arrived. It comes from the request itself (Cloudflare's `cf` data and the headers); nothing is looked up elsewhere or stored.
// Pure, so it is tested without a Worker. Location is as coarse as the network's data is (country, region, city), never coordinates.
export type RequestInfo = {
  ip: string | null;
  country: string | null;      // ISO 3166-1 alpha-2
  region: string | null;
  city: string | null;
  timezone: string | null;     // IANA name
  asn: number | null;
  organization: string | null; // who runs the network (the provider)
  colo: string | null;         // the Cloudflare data centre that answered, by airport code
  protocol: string | null;     // HTTP/2, HTTP/3 ...
  tls: string | null;
  userAgent: string | null;
  acceptLanguage: string | null;
};

const text = (value: unknown, max = 200): string | null => (typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null);

export function requestInfo(headers: Headers, cf: Record<string, unknown> | undefined): RequestInfo {
  const info = cf ?? {};
  const asn = typeof info.asn === "number" && Number.isFinite(info.asn) ? info.asn : null;
  const country = text(info.country, 8);
  return {
    ip: text(headers.get("cf-connecting-ip"), 45),
    country: country && /^[A-Za-z]{2}$/.test(country) ? country.toUpperCase() : null,
    region: text(info.region),
    city: text(info.city),
    timezone: text(info.timezone, 64),
    asn,
    organization: text(info.asOrganization),
    colo: text(info.colo, 8),
    protocol: text(info.httpProtocol, 16),
    tls: text(info.tlsVersion, 16),
    userAgent: text(headers.get("user-agent"), 400),
    acceptLanguage: text(headers.get("accept-language"), 200),
  };
}
