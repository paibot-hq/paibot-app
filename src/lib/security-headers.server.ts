import { env } from "cloudflare:workers";
import { parsePublishableKey } from "@clerk/shared/keys";

// Server-only (reads Workers runtime env + Node-oriented Clerk internals) —
// only import this from workers/app.ts, never from component/loader code
// that's reachable from the client bundle.

const clerkFrontendApi = parsePublishableKey(env.CLERK_PUBLISHABLE_KEY)?.frontendApi ?? "";
const clerkHost = clerkFrontendApi ? `https://${clerkFrontendApi}` : "";

// @clerk/react-router's clerkMiddleware() has no `contentSecurityPolicy`
// option (unlike @clerk/nextjs), so there's no SDK-generated CSP to lean on
// here. This hand-replicates @clerk/nextjs's non-strict default directive
// set (see content-security-policy.js in that package — DEFAULT_DIRECTIVES,
// no `strict`/nonce mode, since the main app doesn't use strict mode
// either) plus this app's own additions: frame-ancestors, and the IP
// tool's ipv4/ipv6.icanhazip.com connect-src (see ip-lookup.tsx). Re-check
// against @clerk/nextjs's DEFAULT_DIRECTIVES if Clerk's requirements change.
export function buildContentSecurityPolicy(): string {
  const directives: Record<string, string[]> = {
    "connect-src": [
      "'self'",
      "https://clerk-telemetry.com",
      "https://*.clerk-telemetry.com",
      "https://api.stripe.com",
      "https://maps.googleapis.com",
      "https://img.clerk.com",
      "https://images.clerkstage.dev",
      "https://*.protect.clerk.com:*",
      "https://ipv4.icanhazip.com",
      "https://ipv6.icanhazip.com",
      // Google Analytics (gtag.js, only loaded when isIndexable - see root.tsx).
      // Host set is Google's documented CSP list for GA4 without advertising
      // features (developers.google.com/tag-platform/security/guides/csp) -
      // don't guess at it: gtag also fires an image beacon
      // (googletagmanager.com/a?...) only under some conditions, which is how
      // a missing img-src slipped past local checks and broke production smoke.
      "https://www.google-analytics.com",
      "https://*.google-analytics.com",
      "https://www.googletagmanager.com",
      "https://*.google.com",
      ...(clerkHost ? [clerkHost] : []),
    ],
    "default-src": ["'self'"],
    "form-action": ["'self'"],
    "frame-src": [
      "'self'",
      "https://challenges.cloudflare.com",
      "https://*.js.stripe.com",
      "https://js.stripe.com",
      "https://hooks.stripe.com",
      "https://*.protect.clerk.com",
      // The TradingView widgets of the stocks page, shown in a frame only after the visitor asks for them.
      "https://www.tradingview-widget.com",
    ],
    // "data:" is needed for a Clerk UI background asset (an inline noise
    // SVG data URI) — Clerk's own DEFAULT_DIRECTIVES for @clerk/nextjs
    // lack it too, so this is likely a latent gap there as well, not
    // something specific to this hand-rolled CSP. Found via an actual CSP
    // violation on /sign-in, not from Clerk's docs.
    "img-src": ["'self'", "https://img.clerk.com", "data:", "https://www.googletagmanager.com", "https://*.google-analytics.com"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      "https:",
      "http:",
      "https://*.js.stripe.com",
      "https://js.stripe.com",
      "https://maps.googleapis.com",
      "https://*.protect.clerk.com",
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "worker-src": ["'self'", "blob:"],
    // Not part of Clerk's default set — this app's own clickjacking guard,
    // ported from the main app's proxy.ts.
    "frame-ancestors": ["'none'"],
  };
  return Object.entries(directives)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .join("; ");
}
