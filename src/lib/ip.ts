import { isIP } from "node:net";

// This app is only ever deployed behind Cloudflare (see wrangler.jsonc), which overwrites
// cf-connecting-ip at its edge for a request arriving from the public internet — a client
// can't spoof it that way. It isn't an absolute guarantee: a same-zone Worker-to-Worker
// subrequest can carry a caller-supplied value (see Cloudflare's docs on cf-connecting-ip).
// That's an acceptable trade-off for a display-only feature with no such caller today.
// x-real-ip/x-forwarded-for carry no guarantee at all (a proxy may just forward whatever a
// client sent), so they aren't trusted even as a fallback.
export function clientIpFromHeaders(headerList: Headers): string | null {
  const value = headerList.get("cf-connecting-ip");
  return value && isIP(value) ? value : null;
}
