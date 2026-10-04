// The sites of PAIBOT, as the header's switcher shows them. They live on one host for now (app and learn are
// pages of the same app); once the hosts are split, `href` becomes the other host's URL. `live: false` keeps a
// planned site (doc.paibot.dev) out of the header until it exists.
export type SiteKey = "app" | "learn" | "doc";
export const SITES: readonly { key: SiteKey; href: string; external?: string; live: boolean }[] = [
  { key: "app", href: "/apps", live: true },
  { key: "learn", href: "/learn", live: true },
  { key: "doc", href: "/", external: "https://doc.paibot.dev", live: false },
];

// Which site a path (without the locale) belongs to: the learning drills are "learn", the rest is the app.
export function currentSite(pathname: string): SiteKey {
  return /^\/(learn|math|study)(\/|$)/.test(pathname) ? "learn" : "app";
}
