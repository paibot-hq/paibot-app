import { clerkMiddleware } from "@clerk/nextjs/server";
import createIntlMiddleware from "next-intl/middleware";
import { hasLocale } from "next-intl";
import { NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { isIndexable, siteOrigin } from "./lib/seo";

const handleI18n = createIntlMiddleware(routing);
// Static asset extensions that must bypass locale rewriting (.json intentionally excluded).
const STATIC_ASSET = /\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|xml|txt)$/i;
const AUTH_PATH = new RegExp(`^/(${routing.locales.join("|")})/(sign-in|sign-up)(/|$)`);
// Clerk uses a `pk_test_`/`pk_live_` prefix to distinguish dev and production instances.
// Restricting authorizedParties only makes sense once we're actually talking to production
// Clerk — gating it on SITE_INDEXABLE instead would tie it to an unrelated SEO setting and
// leave a real (but not-yet-indexable) deployment on production keys unprotected.
const isProductionClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_live_"));

// Applied to every response, including early returns, so pages can never be framed by another
// origin (clickjacking) and browsers never guess a response's content type.
function withSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

export default clerkMiddleware((_auth, request) => {
  const path = request.nextUrl.pathname;
  // Auth transport and API routes must never be rewritten into language pages.
  if (/^\/(api|trpc|__clerk)(\/|$)/.test(path)) return withSecurityHeaders(NextResponse.next());
  if (STATIC_ASSET.test(path)) return withSecurityHeaders(NextResponse.next());
  const response = handleI18n(request);
  if (!isIndexable || AUTH_PATH.test(path)) {
    response.headers.set("X-Robots-Tag", "noindex");
  }
  return withSecurityHeaders(response);
}, request => {
  const segment = request.nextUrl.pathname.split("/")[1];
  const locale = hasLocale(routing.locales, segment) ? segment : routing.defaultLocale;
  return {
    signInUrl: `/${locale}/sign-in`,
    signUpUrl: `/${locale}/sign-up`,
    ...(isProductionClerk ? { authorizedParties: [siteOrigin] } : {}),
    contentSecurityPolicy: { directives: { "frame-ancestors": ["'none'"] } },
  };
});
export const config = {
  matcher: ["/((?!_next).*)"],
};
