// The app list as plain data, without icons (those live in apps.tsx), so
// Node scripts such as tests/e2e/smoke.mjs can import it and derive their
// expectations instead of repeating the list.

// What an app is for or about. An app has one to three; its first gives its card its colour and its place on /apps, where
// the tags (names under App.tags in messages/*.json) narrow the list, in this order.
export const APP_TAGS = ["learn", "math", "dev", "ai", "security", "text", "photo", "calc", "info", "network", "document", "time", "science", "sound", "art", "game", "fortune"] as const;
export type AppTag = (typeof APP_TAGS)[number];

export type AppData = {
  // Unique, stable id. Matches the route slug for published apps; for a
  // not-yet-built app (no `href`) it's just an id used as the messages key.
  slug: string;
  // Omitted for apps that don't have a page yet — rendered as a
  // non-interactive card instead of a link.
  href?: string;
  tags: readonly [AppTag, ...AppTag[]];
  status: "published" | "comingSoon";
  // Key under the `App` namespace in messages/*.json holding this app's
  // `title`/`description`/`keywords` (e.g. "json" → App.json.title).
  messageKey: string;
  // Signed-in only (noindex, not in the sitemap); every other published app
  // with an href is a public SEO page (see publicPaths in seo.ts).
  private?: true;
  // Processes user input (files, photos, text, code, SQL, dates) entirely in
  // the browser without sending it to a server.
  localOnly?: true;
};

export const APP_CATALOG = [
  // 学習 / Study
  { slug: "math", href: "/math", tags: ["learn", "math"], status: "published", messageKey: "math" },
  { slug: "quiz", href: "/quiz", tags: ["learn", "game"], status: "published", messageKey: "quiz" },
  { slug: "arith", href: "/arith", tags: ["learn", "math"], status: "published", messageKey: "arith", localOnly: true },

  // 開発 / Dev
  { slug: "linux", href: "/linux", tags: ["dev", "learn"], status: "published", messageKey: "linux", localOnly: true },
  { slug: "json", href: "/json", tags: ["dev", "text"], status: "published", messageKey: "json", localOnly: true },
  { slug: "base64", href: "/base64", tags: ["dev", "text"], status: "published", messageKey: "base64", localOnly: true },
  { slug: "urlencode", href: "/urlencode", tags: ["dev", "text"], status: "published", messageKey: "urlencode", localOnly: true },
  { slug: "llm-memory", href: "/llm-memory", tags: ["ai", "calc"], status: "published", messageKey: "llmMemory", localOnly: true },
  { slug: "code-runner", href: "/code-runner", tags: ["dev", "learn"], status: "published", messageKey: "codeRunner", localOnly: true },
  { slug: "sql", href: "/sql", tags: ["dev", "learn"], status: "published", messageKey: "sql", localOnly: true },
  { slug: "browser-ai", href: "/browser-ai", tags: ["ai"], status: "published", messageKey: "browserAi", localOnly: true },

  // ユーティリティ / Utility
  { slug: "wc", href: "/wc", tags: ["text"], status: "published", messageKey: "wc", localOnly: true },
  { slug: "mosaic", href: "/mosaic", tags: ["photo", "security"], status: "published", messageKey: "mosaic", localOnly: true },
  { slug: "password", href: "/password", tags: ["security"], status: "published", messageKey: "password", localOnly: true },
  { slug: "life", href: "/life", tags: ["science", "math"], status: "published", messageKey: "life", localOnly: true },
  { slug: "pendulum", href: "/pendulum", tags: ["science"], status: "published", messageKey: "pendulum", localOnly: true },
  { slug: "fourier", href: "/fourier", tags: ["math", "art"], status: "published", messageKey: "fourier", localOnly: true },
  { slug: "series", href: "/series", tags: ["math"], status: "published", messageKey: "series", localOnly: true },
  { slug: "stocks", href: "/stocks", tags: ["info"], status: "published", messageKey: "stocks" },
  { slug: "quake", href: "/quake", tags: ["info"], status: "published", messageKey: "quake" },
  { slug: "warnings", href: "/warnings", tags: ["info"], status: "published", messageKey: "warnings" },
  { slug: "approx", href: "/approx", tags: ["math", "game"], status: "published", messageKey: "approx", localOnly: true },
  { slug: "collector", href: "/collector", tags: ["math"], status: "published", messageKey: "collector", localOnly: true },
  { slug: "govfaq", href: "/govfaq", tags: ["info"], status: "published", messageKey: "govfaq" },
  { slug: "metadata", href: "/metadata", tags: ["photo", "security"], status: "published", messageKey: "metadata", localOnly: true },
  { slug: "grapher", href: "/grapher", tags: ["math", "calc"], status: "published", messageKey: "grapher", localOnly: true },
  { slug: "noise", href: "/noise", tags: ["sound"], status: "published", messageKey: "noise" },
  { slug: "stopwatch", href: "/stopwatch", tags: ["time"], status: "published", messageKey: "stopwatch", localOnly: true },
  { slug: "metronome", href: "/metronome", tags: ["sound", "time"], status: "published", messageKey: "metronome" },
  { slug: "business-card", href: "/business-card", tags: ["document"], status: "published", messageKey: "businessCard", localOnly: true },
  { slug: "resignation", href: "/resignation", tags: ["document"], status: "published", messageKey: "resignation", localOnly: true },
  { slug: "tax", href: "/tax", tags: ["calc"], status: "published", messageKey: "tax", localOnly: true },
  { slug: "split", href: "/split", tags: ["calc"], status: "published", messageKey: "split", localOnly: true },
  { slug: "unit-converter", href: "/unit-converter", tags: ["calc"], status: "published", messageKey: "unitConverter", localOnly: true },

  // ネットワーク / Network
  { slug: "ip", href: "/ip", tags: ["network"], status: "published", messageKey: "ip" },
  { slug: "domain", href: "/domain", tags: ["network"], status: "published", messageKey: "domain" },
  { slug: "cidr", href: "/cidr", tags: ["network", "calc"], status: "published", messageKey: "cidr", localOnly: true },
  { slug: "site-check", href: "/site-check", tags: ["network"], status: "published", messageKey: "siteCheck" },

  // ゲーム / Game
  { slug: "color-trick", href: "/color-trick", tags: ["game"], status: "published", messageKey: "colorTrick" },
  { slug: "dice", href: "/dice", tags: ["game"], status: "published", messageKey: "dice" },
  { slug: "reaction", href: "/reaction", tags: ["game"], status: "published", messageKey: "reaction" },
  { slug: "typing", href: "/typing", tags: ["game", "text"], status: "published", messageKey: "typing" },
  { slug: "iq-test", href: "/iq-test", tags: ["fortune"], status: "published", messageKey: "iqTest" },
  { slug: "personality", href: "/personality", tags: ["fortune"], status: "published", messageKey: "personality" },
  { slug: "timing", href: "/timing", tags: ["game", "time"], status: "published", messageKey: "timing" },
  { slug: "pinball", href: "/pinball", tags: ["game", "science"], status: "published", messageKey: "pinball" },
  { slug: "strings", href: "/strings", tags: ["sound", "science"], status: "published", messageKey: "strings" },
  { slug: "koma", href: "/koma", tags: ["game", "science"], status: "published", messageKey: "koma" },
  { slug: "polyhedra", href: "/polyhedra", tags: ["math", "art"], status: "published", messageKey: "polyhedra", localOnly: true },
  { slug: "balls", href: "/balls", tags: ["game"], status: "published", messageKey: "balls" },
  { slug: "kaleidoscope", href: "/kaleidoscope", tags: ["art"], status: "published", messageKey: "kaleidoscope" },
  { slug: "glitch", href: "/glitch", tags: ["art"], status: "published", messageKey: "glitch" },
  { slug: "random-video", href: "/random-video", tags: ["art"], status: "published", messageKey: "randomVideo" },
  { slug: "circle", href: "/circle", tags: ["game"], status: "published", messageKey: "circle" },

  // 日常 / Daily
  { slug: "calendar", href: "/calendar", tags: ["time"], status: "published", messageKey: "calendar" },
  { slug: "life-calendar", href: "/life-calendar", tags: ["time"], status: "published", messageKey: "lifeCalendar", localOnly: true },
  { slug: "puchi", href: "/puchi", tags: ["game"], status: "published", messageKey: "puchi" },
  { slug: "crane-game", href: "/crane-game", tags: ["game"], status: "published", messageKey: "craneGame" },
  { slug: "fruit-merge", href: "/fruit-merge", tags: ["game"], status: "published", messageKey: "fruitMerge" },
  { slug: "goldfish", href: "/goldfish", tags: ["art", "science"], status: "published", messageKey: "goldfish" },
  { slug: "goldfish-escape", href: "/goldfish-escape", tags: ["game"], status: "published", messageKey: "goldfishEscape" },
  { slug: "code-draw", href: "/code-draw", tags: ["art", "learn"], status: "published", messageKey: "codeDraw" },
  { slug: "number-merge", href: "/number-merge", tags: ["game", "math"], status: "published", messageKey: "numberMerge" },
  { slug: "fireworks", href: "/fireworks", tags: ["art"], status: "published", messageKey: "fireworks" },
  { slug: "clock", href: "/clock", tags: ["time"], status: "published", messageKey: "clock" },
  { slug: "heart-rate", href: "/heart-rate", tags: ["science"], status: "published", messageKey: "heartRate", localOnly: true },
  { slug: "diary", href: "/diary", tags: ["text", "time"], status: "published", messageKey: "diary", private: true },
  { slug: "breaches", href: "/breaches", tags: ["info", "security"], status: "published", messageKey: "breaches" },
  { slug: "birthday-fortune", href: "/birthday-fortune", tags: ["fortune"], status: "published", messageKey: "birthdayFortune" },
  { slug: "omikuji", href: "/omikuji", tags: ["fortune"], status: "published", messageKey: "omikuji" },
  { slug: "age", href: "/age", tags: ["time", "calc"], status: "published", messageKey: "age", localOnly: true },
  { slug: "date-calc", href: "/date-calc", tags: ["time", "calc"], status: "published", messageKey: "dateCalc", localOnly: true },
  { slug: "pomodoro", href: "/pomodoro", tags: ["time"], status: "published", messageKey: "pomodoro", localOnly: true },
  { slug: "roulette", href: "/roulette", tags: ["game"], status: "published", messageKey: "roulette" },
] as const satisfies readonly AppData[];

export type AppSlug = (typeof APP_CATALOG)[number]["slug"];

// Shown on the top page under the most viewed tools, in this order (those already among the most viewed are not repeated):
// the tools people search for and the ones found nowhere else. Every other tool is found by the search box or on /apps.
export const FEATURED_SLUGS: readonly AppSlug[] = ["math", "breaches", "date-calc", "wc", "tax", "password", "metadata", "mosaic"];

// The apps to go to from an app's page: those sharing the most tags first (in catalog order among equals), up to six, so that
// every page links onwards.
export function relatedApps(app: AppData, list: readonly AppData[] = APP_CATALOG, limit = 6): AppData[] {
  const published = list.filter(other => other.status === "published" && other.href && !other.private && other.slug !== app.slug);
  const shared = (other: AppData) => other.tags.filter(tag => app.tags.includes(tag)).length;
  return published.map((other, index) => ({ other, index, n: shared(other) })).sort((a, b) => b.n - a.n || a.index - b.index).slice(0, limit).map(entry => entry.other);
}
