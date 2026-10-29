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
  { slug: "color-trick", href: "/color-trick", category: "game", status: "published", messageKey: "colorTrick" },
  // 学習 / Study
  { slug: "math", href: "/math", category: "study", status: "published", messageKey: "math" },
  { slug: "quiz", href: "/quiz", category: "game", status: "published", messageKey: "quiz" },
  { slug: "arith", href: "/arith", category: "study", status: "published", messageKey: "arith" },

  // 開発 / Dev
  { slug: "json", href: "/json", category: "dev", status: "published", messageKey: "json" },
  { slug: "base64", href: "/base64", category: "dev", status: "published", messageKey: "base64" },
  { slug: "urlencode", href: "/urlencode", category: "dev", status: "published", messageKey: "urlencode" },
  { slug: "llm-memory", href: "/llm-memory", category: "dev", status: "published", messageKey: "llmMemory" },

  // ユーティリティ / Utility
  { slug: "wc", href: "/wc", category: "utility", status: "published", messageKey: "wc" },
  { slug: "mosaic", href: "/mosaic", category: "utility", status: "published", messageKey: "mosaic" },
  { slug: "password", href: "/password", category: "utility", status: "published", messageKey: "password" },
  { slug: "life", href: "/life", category: "game", status: "published", messageKey: "life" },
  { slug: "pendulum", href: "/pendulum", category: "game", status: "published", messageKey: "pendulum" },
  { slug: "fourier", href: "/fourier", category: "game", status: "published", messageKey: "fourier" },
  { slug: "series", href: "/series", category: "game", status: "published", messageKey: "series" },
  { slug: "stocks", href: "/stocks", category: "utility", status: "published", messageKey: "stocks" },
  { slug: "quake", href: "/quake", category: "daily", status: "published", messageKey: "quake" },
  { slug: "warnings", href: "/warnings", category: "daily", status: "published", messageKey: "warnings" },
  { slug: "approx", href: "/approx", category: "game", status: "published", messageKey: "approx" },
  { slug: "govfaq", href: "/govfaq", category: "daily", status: "published", messageKey: "govfaq" },
  { slug: "metadata", href: "/metadata", category: "utility", status: "published", messageKey: "metadata" },
  { slug: "grapher", href: "/grapher", category: "utility", status: "published", messageKey: "grapher" },
  { slug: "noise", href: "/noise", category: "utility", status: "published", messageKey: "noise" },
  { slug: "stopwatch", href: "/stopwatch", category: "utility", status: "published", messageKey: "stopwatch" },
  { slug: "metronome", href: "/metronome", category: "utility", status: "published", messageKey: "metronome" },
  { slug: "business-card", href: "/business-card", category: "utility", status: "published", messageKey: "businessCard" },
  { slug: "resignation", href: "/resignation", category: "utility", status: "published", messageKey: "resignation" },
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
  { slug: "typing", href: "/typing", category: "game", status: "published", messageKey: "typing" },
  { slug: "iq-test", href: "/iq-test", category: "game", status: "published", messageKey: "iqTest" },
  { slug: "personality", href: "/personality", category: "game", status: "published", messageKey: "personality" },
  { slug: "timing", href: "/timing", category: "game", status: "published", messageKey: "timing" },
  { slug: "pinball", href: "/pinball", category: "game", status: "published", messageKey: "pinball" },
  { slug: "strings", href: "/strings", category: "game", status: "published", messageKey: "strings" },
  { slug: "koma", href: "/koma", category: "game", status: "published", messageKey: "koma" },
  { slug: "polyhedra", href: "/polyhedra", category: "game", status: "published", messageKey: "polyhedra" },
  { slug: "balls", href: "/balls", category: "game", status: "published", messageKey: "balls" },
  { slug: "kaleidoscope", href: "/kaleidoscope", category: "game", status: "published", messageKey: "kaleidoscope" },
  { slug: "glitch", href: "/glitch", category: "game", status: "published", messageKey: "glitch" },
  { slug: "random-video", href: "/random-video", category: "game", status: "published", messageKey: "randomVideo" },
  { slug: "circle", href: "/circle", category: "game", status: "published", messageKey: "circle" },

  // 日常 / Daily
  { slug: "calendar", href: "/calendar", category: "daily", status: "published", messageKey: "calendar" },
  { slug: "life-calendar", href: "/life-calendar", category: "daily", status: "published", messageKey: "lifeCalendar" },
  { slug: "puchi", href: "/puchi", category: "game", status: "published", messageKey: "puchi" },
  { slug: "crane-game", href: "/crane-game", category: "game", status: "published", messageKey: "craneGame" },
  { slug: "fruit-merge", href: "/fruit-merge", category: "game", status: "published", messageKey: "fruitMerge" },
  { slug: "goldfish", href: "/goldfish", category: "game", status: "published", messageKey: "goldfish" },
  { slug: "goldfish-escape", href: "/goldfish-escape", category: "game", status: "published", messageKey: "goldfishEscape" },
  { slug: "number-merge", href: "/number-merge", category: "game", status: "published", messageKey: "numberMerge" },
  { slug: "fireworks", href: "/fireworks", category: "game", status: "published", messageKey: "fireworks" },
  { slug: "clock", href: "/clock", category: "daily", status: "published", messageKey: "clock" },
  { slug: "heart-rate", href: "/heart-rate", category: "daily", status: "published", messageKey: "heartRate" },
  { slug: "diary", href: "/diary", category: "daily", status: "published", messageKey: "diary", private: true },
  { slug: "breaches", href: "/breaches", category: "daily", status: "published", messageKey: "breaches" },
  { slug: "birthday-fortune", href: "/birthday-fortune", category: "daily", status: "published", messageKey: "birthdayFortune" },
  { slug: "omikuji", href: "/omikuji", category: "daily", status: "published", messageKey: "omikuji" },
  { slug: "age", href: "/age", category: "daily", status: "published", messageKey: "age" },
  { slug: "date-calc", href: "/date-calc", category: "daily", status: "published", messageKey: "dateCalc" },
  { slug: "pomodoro", href: "/pomodoro", category: "daily", status: "published", messageKey: "pomodoro" },
  { slug: "roulette", href: "/roulette", category: "game", status: "published", messageKey: "roulette" },
] as const satisfies readonly AppData[];

export type AppSlug = (typeof APP_CATALOG)[number]["slug"];

// Shown on the top page under the most viewed tools, in this order (those already among the most viewed are not repeated):
// the tools people search for and the ones found nowhere else. Every other tool is found by the search box or on /apps.
export const FEATURED_SLUGS: readonly AppSlug[] = ["math", "breaches", "date-calc", "wc", "tax", "password", "metadata", "mosaic"];

// The tools to go to from a tool's page: those of the same kind first, then the others, up to six, so that every page links onwards.
export function relatedApps(app: AppData, list: readonly AppData[] = APP_CATALOG, limit = 6): AppData[] {
  const published = list.filter(other => other.status === "published" && other.href && !other.private && other.slug !== app.slug);
  return [...published.filter(other => other.category === app.category), ...published.filter(other => other.category !== app.category)].slice(0, limit);
}
