import { env } from "cloudflare:workers";
import { parsePublishableKey } from "@clerk/shared/keys";

// Server-only (reads Workers runtime env + Node-oriented Clerk internals) —
// only import this from workers/app.ts, never from component/loader code
// that's reachable from the client bundle.

const clerkFrontendApi = parsePublishableKey(env.CLERK_PUBLISHABLE_KEY)?.frontendApi ?? "";
const clerkHost = clerkFrontendApi ? `https://${clerkFrontendApi}` : "";

// @clerk/react-router's clerkMiddleware() has no `contentSecurityPolicy`
// option (unlike @clerk/nextjs), so there's no SDK-generated CSP to lean on
// here. This hand-replicates @clerk/nextjs's default directive set (see
// content-security-policy.js in that package — DEFAULT_DIRECTIVES) plus this
// app's own additions: frame-ancestors, and the IP tool's
// ipv4/ipv6.icanhazip.com connect-src (see ip-lookup.tsx). Re-check against
// @clerk/nextjs's DEFAULT_DIRECTIVES if Clerk's requirements change.
//
// Scripts: a page (src/entry.server.tsx) gets a new nonce on every request, and only the scripts its own HTML names
// carry it (React Router's, React's, Google Analytics'). 'strict-dynamic' lets those load what they load in turn
// (Clerk's script, its captcha, gtag's), so no host list is needed, and an inline script someone else manages to put
// into a page does not run. 'unsafe-inline' and https: are there only for browsers that know neither nonces nor
// 'strict-dynamic' (a browser that knows them ignores both). A response that is not a page (data, an API, robots.txt)
// gets no nonce and runs no script but the site's own files.
export function buildContentSecurityPolicy(nonce?: string): string {
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
      // Google AdSense (root.tsx ADSENSE_CLIENT): the ad requests and the ad-quality checks. Whole domains, not the
      // hosts seen so far: the ads pick among numbered hosts (ep1., ep2. ...), so listing hosts broke smoke twice.
      "https://*.adtrafficquality.google",
      "https://*.googlesyndication.com",
      "https://*.doubleclick.net",
      // Its timing beacon (csi.gstatic.com) and conversion requests.
      "https://*.gstatic.com",
      "https://*.googleadservices.com",
      // The Japan Meteorological Agency's earthquake list and reports, read by the quake page (https://www.jma.go.jp allows any origin).
      "https://www.jma.go.jp",
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
      // Google AdSense ad frames and ad-quality frames (see connect-src).
      "https://*.adtrafficquality.google",
      "https://*.googlesyndication.com",
      "https://*.doubleclick.net",
      "https://*.googleadservices.com",
      "https://*.google.com",
    ],
    // "data:" is needed for a Clerk UI background asset (an inline noise
    // SVG data URI) — Clerk's own DEFAULT_DIRECTIVES for @clerk/nextjs
    // lack it too, so this is likely a latent gap there as well, not
    // something specific to this hand-rolled CSP. Found via an actual CSP
    // violation on /sign-in, not from Clerk's docs.
    // "blob:" shows a photo the visitor chose, from the browser's own memory (the photo checker); nothing is fetched.
    "img-src": ["'self'", "https://img.clerk.com", "data:", "blob:", "https://www.googletagmanager.com", "https://*.google-analytics.com", "https://pagead2.googlesyndication.com", "https://*.googlesyndication.com", "https://*.doubleclick.net", "https://*.google.com", "https://*.adtrafficquality.google", "https://*.gstatic.com", "https://*.googleadservices.com"],
    "script-src": nonce ? ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", "'unsafe-inline'", "https:"] : ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
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
