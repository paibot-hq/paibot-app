// The site moved from paibot.app to paibot.io. A request for the old domain is answered with a 301 to the same
// path and query on the new one (workers/app.ts), so links and bookmarks keep working.
export const LEGACY_HOSTS = ['paibot.app', 'www.paibot.app'];

// Where a request for `url` should go, or null when it is not for a legacy host (or `origin` is itself legacy).
export function legacyRedirect(url: URL, origin: string): string | null {
  if (!LEGACY_HOSTS.includes(url.hostname) || LEGACY_HOSTS.includes(new URL(origin).hostname)) return null;
  return `${origin}${url.pathname}${url.search}`;
}
