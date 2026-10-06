// The app list as plain data, without icons (those live in apps.tsx), so
// Node scripts such as tests/e2e/smoke.mjs can import it and derive their
// expectations instead of repeating the list.

export type AppCategory = "study" | "dev" | "utility" | "network" | "game" | "daily";

// Display order for category sections on /apps.
export const APP_CATEGORIES: AppCategory[] = ["daily", "game", "utility", "study", "dev", "network"];

// The categories listed on the top page's search as apps; study is the math drills, dev and network the developer tools.
export const APP_SITE_CATEGORIES: AppCategory[] = ["daily", "game", "utility"];

export type AppData = {
  // Unique, stable id. Matches the route slug for published apps; for a
  // not-yet-built app (no `href`) it's just an id used as the messages key.
  slug: string;
  // Omitted for apps that don't have a page yet — rendered as a
  // non-interactive card instead of a link.
  href?: string;
  category: AppCategory;
  status: "published" | "comingSoon";
  // Key under the `App` namespace in messages/*.json holding this app's
  // `title`/`description`/`keywords` (e.g. "json" → App.json.title).
  messageKey: string;
  // Signed-in only (noindex, not in the sitemap); every other published app
  // with an href is a public SEO page (see publicPaths in seo.ts).
  private?: true;
};

export const APP_CATALOG = [
  // 学習 / Study
  { slug: "math", href: "/math", category: "study", status: "published", messageKey: "math" },
  { slug: "quiz", href: "/quiz", category: "game", status: "published", messageKey: "quiz" },
  { slug: "arith", href: "/arith", category: "study", status: "published", messageKey: "arith" },

  // 開発 / Dev
  { slug: "json", href: "/json", category: "dev", status: "published", messageKey: "json" },
  { slug: "base64", href: "/base64", category: "dev", status: "published", messageKey: "base64" },
  { slug: "urlencode", href: "/urlencode", category: "dev", status: "published", messageKey: "urlencode" },

  // ユーティリティ / Utility
  { slug: "wc", href: "/wc", category: "utility", status: "published", messageKey: "wc" },
  { slug: "password", href: "/password", category: "utility", status: "published", messageKey: "password" },
  { slug: "grapher", href: "/grapher", category: "utility", status: "published", messageKey: "grapher" },
  { slug: "stopwatch", href: "/stopwatch", category: "utility", status: "published", messageKey: "stopwatch" },
  { slug: "business-card", href: "/business-card", category: "utility", status: "published", messageKey: "businessCard" },
  { slug: "tax", href: "/tax", category: "utility", status: "published", messageKey: "tax" },
  { slug: "split", href: "/split", category: "utility", status: "published", messageKey: "split" },
  { slug: "unit-converter", href: "/unit-converter", category: "utility", status: "published", messageKey: "unitConverter" },

  // ネットワーク / Network
  { slug: "ip", href: "/ip", category: "network", status: "published", messageKey: "ip" },
  { slug: "domain", href: "/domain", category: "network", status: "published", messageKey: "domain" },
  { slug: "cidr", href: "/cidr", category: "network", status: "published", messageKey: "cidr" },
  { slug: "site-check", href: "/site-check", category: "network", status: "published", messageKey: "siteCheck" },

  // ゲーム / Game
  { slug: "dice", href: "/dice", category: "game", status: "published", messageKey: "dice" },
  { slug: "reaction", href: "/reaction", category: "game", status: "published", messageKey: "reaction" },
  { slug: "timing", href: "/timing", category: "game", status: "published", messageKey: "timing" },
  { slug: "pinball", href: "/pinball", category: "game", status: "published", messageKey: "pinball" },
  { slug: "polyhedra", href: "/polyhedra", category: "game", status: "published", messageKey: "polyhedra" },
  { slug: "balls", href: "/balls", category: "game", status: "published", messageKey: "balls" },
  { slug: "kaleidoscope", href: "/kaleidoscope", category: "game", status: "published", messageKey: "kaleidoscope" },

  // 日常 / Daily
  { slug: "calendar", href: "/calendar", category: "daily", status: "published", messageKey: "calendar" },
  { slug: "life-calendar", href: "/life-calendar", category: "daily", status: "published", messageKey: "lifeCalendar" },
  { slug: "fireworks", href: "/fireworks", category: "game", status: "published", messageKey: "fireworks" },
  { slug: "clock", href: "/clock", category: "daily", status: "published", messageKey: "clock" },
  { slug: "diary", href: "/diary", category: "daily", status: "published", messageKey: "diary", private: true },
  { slug: "age", href: "/age", category: "daily", status: "published", messageKey: "age" },
  { slug: "date-calc", href: "/date-calc", category: "daily", status: "published", messageKey: "dateCalc" },
  { slug: "pomodoro", href: "/pomodoro", category: "daily", status: "published", messageKey: "pomodoro" },
  { slug: "roulette", href: "/roulette", category: "game", status: "published", messageKey: "roulette" },
] as const satisfies readonly AppData[];

export type AppSlug = (typeof APP_CATALOG)[number]["slug"];
