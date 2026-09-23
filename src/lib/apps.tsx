// Central registry of every app shown on /apps — the single place that knows
// an app's route, category, and icon. src/components/apps.tsx only renders
// from this list; it never hardcodes an app's title/description (those come
// from messages/*.json via `messageKey`) or grid position (derived from
// `category`). To add a new app: add one entry here (plus its messages) —
// no JSX changes needed. See CLAUDE.md's "新しいツールページを追加するとき"
// for the rest of the steps (route, component, messages).
import type { ComponentType, SVGProps } from "react";

// next-intl types `t()` against ja.json's literal key paths (see
// src/i18n/types.d.ts), but category/app keys are only known at runtime
// here (and in src/components/cover.tsx's category chips) — cast `t` to
// this once at each call site instead of losing type-checking everywhere.
export type DynamicT = (key: string, values?: Record<string, string | number>) => string;

export type AppCategory = "study" | "dev" | "utility" | "network" | "game" | "daily";

// Display order for category sections on /apps.
export const APP_CATEGORIES: AppCategory[] = ["study", "dev", "utility", "network", "game", "daily"];

export type AppEntry = {
  // Unique, stable id. Matches the route slug for published apps; for a
  // not-yet-built app (no `href`) it's just an id used as the messages key.
  slug: string;
  // Omitted for apps that don't have a page yet — rendered as a
  // non-interactive card instead of a link. `/math` keeps an href even
  // though it's comingSoon: unlike the others, it already has a real page
  // (a placeholder), just not the full problem-set feature yet.
  href?: string;
  category: AppCategory;
  status: "published" | "comingSoon";
  // Key under the `App` namespace in messages/*.json holding this app's
  // `title`/`description`/`keywords` (e.g. "json" → App.json.title).
  messageKey: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

function IpIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M8 15.5a6 6 0 0 1 8 0" />
      <path d="M4.5 12a11 11 0 0 1 15 0" />
      <path d="M12 19h.01" />
    </svg>
  );
}

function WcIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  );
}

function ArithIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 7h8" />
      <path d="M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" />
    </svg>
  );
}

function AgeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 9h16M8 3v4M16 3v4" />
    </svg>
  );
}

function PasswordIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function Base64Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M4 7h13l-3-3" />
      <path d="M20 17H7l3 3" />
    </svg>
  );
}

function JsonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M8 3c-2 0-3 1-3 3v3c0 1-.5 2-2 2 1.5 0 2 1 2 2v3c0 2 1 3 3 3" />
      <path d="M16 3c2 0 3 1 3 3v3c0 1 .5 2 2 2-1.5 0-2 1-2 2v3c0 2-1 3-3 3" />
    </svg>
  );
}

function UrlencodeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <circle cx="7" cy="7" r="2.2" />
      <circle cx="17" cy="17" r="2.2" />
      <path d="M17 7 7 17" />
    </svg>
  );
}

function DiceIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01" />
    </svg>
  );
}

function ReactionIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M13 3 4 14h6l-1 7 9-11h-6l1-7Z" />
    </svg>
  );
}

function TimingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l3 2" />
      <path d="M9 3h6" />
    </svg>
  );
}

function MathIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M4 20 20 20" />
      <path d="M4 20 4 4" />
      <path d="M5 18 Q12 5 19 18" />
    </svg>
  );
}

export const apps: AppEntry[] = [
  // 学習 / Study
  { slug: "math", href: "/math", category: "study", status: "comingSoon", messageKey: "math", icon: MathIcon },
  { slug: "arith", href: "/arith", category: "study", status: "published", messageKey: "arith", icon: ArithIcon },

  // 開発 / Dev
  { slug: "json", href: "/json", category: "dev", status: "published", messageKey: "json", icon: JsonIcon },
  { slug: "base64", href: "/base64", category: "dev", status: "published", messageKey: "base64", icon: Base64Icon },
  { slug: "urlencode", href: "/urlencode", category: "dev", status: "published", messageKey: "urlencode", icon: UrlencodeIcon },

  // ユーティリティ / Utility
  { slug: "wc", href: "/wc", category: "utility", status: "published", messageKey: "wc", icon: WcIcon },
  { slug: "password", href: "/password", category: "utility", status: "published", messageKey: "password", icon: PasswordIcon },

  // ネットワーク / Network
  { slug: "ip", href: "/ip", category: "network", status: "published", messageKey: "ip", icon: IpIcon },

  // ゲーム / Game
  { slug: "dice", href: "/dice", category: "game", status: "published", messageKey: "dice", icon: DiceIcon },
  { slug: "reaction", href: "/reaction", category: "game", status: "published", messageKey: "reaction", icon: ReactionIcon },
  { slug: "timing", href: "/timing", category: "game", status: "published", messageKey: "timing", icon: TimingIcon },

  // 日常 / Daily
  { slug: "age", href: "/age", category: "daily", status: "published", messageKey: "age", icon: AgeIcon },
];

function StudyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M4 5c3 0 5 1 8 1s5-1 8-1v14c-3 0-5 1-8 1s-5-1-8-1V5Z" />
      <path d="M12 6v14" />
    </svg>
  );
}

function DevToolsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M8 8 4 12l4 4" />
      <path d="M16 8l4 4-4 4" />
    </svg>
  );
}

function GameIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect x="3" y="8" width="18" height="9" rx="4" />
      <path d="M8 10.5v4M6 12.5h4" />
      <path d="M16 11.5h.01M18 13.5h.01" />
    </svg>
  );
}

export type HomeCategoryTile = {
  category: AppCategory;
  // Key under `App.home` holding this tile's one-line `description`
  // (the title itself reuses `categories.<category>`, no separate copy).
  messageKey: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

// The homepage only teases the 4 broadest categories (not every /apps
// section — "utility" and "network" are small enough for now that they'd
// just add clutter right below the hero). Each links to that category's
// section on /apps via an anchor (e.g. #study).
export const HOME_CATEGORY_TILES: HomeCategoryTile[] = [
  { category: "study", messageKey: "study", icon: StudyIcon },
  { category: "dev", messageKey: "dev", icon: DevToolsIcon },
  { category: "game", messageKey: "game", icon: GameIcon },
  { category: "daily", messageKey: "daily", icon: AgeIcon },
];
