// Icons for the app list. The list itself (routes, categories, status) is
// plain data in app-catalog.ts so Node scripts can read it too;
// src/components/apps.tsx only renders from `apps` below. To add an app, add
// it to APP_CATALOG and give it an icon in APP_ICONS (TypeScript requires
// one per slug), plus its messages. See CLAUDE.md's "Adding a tool".
import type { ComponentType, SVGProps } from "react";
import { APP_CATALOG, type AppCategory, type AppData, type AppSlug } from "./app-catalog";

export { APP_CATEGORIES, APP_SITE_CATEGORIES, type AppCategory } from "./app-catalog";

// use-intl types `t()` against ja.json's literal key paths (see
// src/i18n/types.d.ts), but category/app keys are only known at runtime
// here (and in src/components/cover.tsx's category chips) — cast `t` to
// this once at each call site instead of losing type-checking everywhere.
export type DynamicT = (key: string, values?: Record<string, string | number>) => string;

type Icon = ComponentType<SVGProps<SVGSVGElement>>;
export type AppEntry = AppData & { icon: Icon };

function CidrIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect x="9" y="3" width="6" height="5" rx="1" />
      <rect x="3" y="16" width="6" height="5" rx="1" />
      <rect x="15" y="16" width="6" height="5" rx="1" />
      <path d="M12 8v4M6 16v-4h12v4" />
    </svg>
  );
}

function IpIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M8 15.5a6 6 0 0 1 8 0" />
      <path d="M4.5 12a11 11 0 0 1 15 0" />
      <path d="M12 19h.01" />
    </svg>
  );
}

function DomainIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18" />
    </svg>
  );
}

function PulseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M3 12h4l2-5 4 10 2-5h6" />
    </svg>
  );
}

function BallsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" r="9.5" />
      <circle cx="9" cy="10" r="2.6" />
      <circle cx="15.5" cy="14.5" r="1.9" />
      <circle cx="15" cy="8" r="1.2" />
    </svg>
  );
}

function KaleidoscopeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17M3.5 12h17M6 6l12 12M18 6L6 18" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function LifeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect x="4" y="4" width="4" height="4" />
      <rect x="10" y="10" width="4" height="4" />
      <rect x="16" y="4" width="4" height="4" />
      <rect x="4" y="16" width="4" height="4" />
      <rect x="16" y="16" width="4" height="4" />
    </svg>
  );
}

function PendulumIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M12 3v6" />
      <circle cx="12" cy="11" r="2" />
      <path d="M12 13l5 6" />
      <circle cx="17.5" cy="20" r="2" />
    </svg>
  );
}

function FourierIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <circle cx="9" cy="12" r="6" />
      <circle cx="17.5" cy="7" r="2.5" />
      <path d="M9 12l8.5-5" />
    </svg>
  );
}

function SeriesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M18 5H7l6 7-6 7h11" />
    </svg>
  );
}

function StocksIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M4 4v16h16" />
      <path d="M7 15l4-5 3 3 5-7" />
    </svg>
  );
}

function QuakeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M3 12h4l2-6 3 12 2-8 2 4h5" />
    </svg>
  );
}

function WarningsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M12 3l10 18H2L12 3z" />
      <path d="M12 10v5M12 18v.5" />
    </svg>
  );
}

function ApproxIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M3 18C7 18 8 6 12 6s5 12 9 12" />
      <path d="M3 12h18" strokeDasharray="2 2" />
    </svg>
  );
}

function GovFaqIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M4 5h16v11H9l-4 3v-3H4z" />
      <path d="M10.5 8.5a1.7 1.7 0 113 .8c-.6.6-1.5.9-1.5 1.8M12 13.2v.1" />
    </svg>
  );
}

function MetadataIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M3 17l5-4 4 3 3-2 6 4" />
    </svg>
  );
}

function GrapherIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M3.5 20.5h17M3.5 3.5v17" />
      <path d="M5.5 17c3-9 5-9 7-4s4 5 6-6" />
    </svg>
  );
}

function PolyhedraIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M12 2.5l8.5 5v9L12 21.5l-8.5-5v-9z" />
      <path d="M12 21.5v-9M12 12.5l8.5-5M12 12.5l-8.5-5" />
    </svg>
  );
}

function TaxIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M6 18L18 6" />
      <circle cx="7.5" cy="7.5" r="2" />
      <circle cx="16.5" cy="16.5" r="2" />
    </svg>
  );
}

function SplitIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4v16M4 12h16" />
    </svg>
  );
}

function UnitConverterIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M4 9h13M13 5l4 4-4 4" />
      <path d="M20 15H7M11 11l-4 4 4 4" />
    </svg>
  );
}

function DateCalcIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M8 3v4M16 3v4M12 13v4M10 15h4" />
    </svg>
  );
}

function PomodoroIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="13.5" r="7" />
      <path d="M12 6.5C12 4.5 13.5 3.5 15 3.5M9 5.5c1 .5 2 1 3 1s2-.5 3-1" />
      <path d="M12 10v4l2.5 1.5" />
    </svg>
  );
}

function RouletteIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 13V5M12 13l6 4M12 13l-6 4" />
      <path d="M12 2.5l-1.6 2h3.2z" />
    </svg>
  );
}

function FireworksIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M12 21v-6" />
      <path d="M12 12V4M12 12L6.5 6.5M12 12l5.5-5.5M12 12H5M12 12h7" />
      <circle cx="12" cy="12" r="1" />
    </svg>
  );
}

function PinballIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="7" r="2.5" />
      <path d="M4 18l5 2M20 18l-5 2" />
      <circle cx="12" cy="14" r="1.2" />
    </svg>
  );
}

function CardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M6.5 10h6M6.5 13h4M15 12.5h3v3h-3z" />
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

function QuizIcon(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4M12 17h.01" />
  </svg>;
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

function CalendarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 9h16M8 3v4M16 3v4M8 13h3v3H8z" />
    </svg>
  );
}

function MosaicIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
      <rect x="9" y="9" width="6" height="6" fill="currentColor" stroke="none" />
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

function StopwatchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="14" r="8" />
      <path d="M12 14V9" />
      <path d="M9 3h6" />
      <path d="M19 7l1.4-1.4" />
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

const APP_ICONS: Record<AppSlug, Icon> = {
  math: MathIcon, quiz: QuizIcon, arith: ArithIcon,
  json: JsonIcon, base64: Base64Icon, urlencode: UrlencodeIcon,
  wc: WcIcon, password: PasswordIcon, "mosaic": MosaicIcon, stopwatch: StopwatchIcon, "business-card": CardIcon,
  ip: IpIcon, domain: DomainIcon, cidr: CidrIcon, "site-check": PulseIcon,
  dice: DiceIcon, reaction: ReactionIcon, timing: TimingIcon, pinball: PinballIcon, polyhedra: PolyhedraIcon, grapher: GrapherIcon, "metadata": MetadataIcon, govfaq: GovFaqIcon, "approx": ApproxIcon, "warnings": WarningsIcon, "quake": QuakeIcon, "stocks": StocksIcon, "series": SeriesIcon, "fourier": FourierIcon, "pendulum": PendulumIcon, "life": LifeIcon, balls: BallsIcon, kaleidoscope: KaleidoscopeIcon, fireworks: FireworksIcon,
  tax: TaxIcon, split: SplitIcon, "unit-converter": UnitConverterIcon, "date-calc": DateCalcIcon, pomodoro: PomodoroIcon, roulette: RouletteIcon,
  calendar: CalendarIcon, "life-calendar": AgeIcon, clock: TimingIcon, diary: WcIcon, age: AgeIcon,
};

export const apps: AppEntry[] = APP_CATALOG.map(app => ({ ...app, icon: APP_ICONS[app.slug] }));

function StudyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M4 5c3 0 5 1 8 1s5-1 8-1v14c-3 0-5 1-8 1s-5-1-8-1V5Z" />
      <path d="M12 6v14" />
    </svg>
  );
}

function UtilityIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M4 7h10M18 7h2M4 17h2M8 17h12" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="6" cy="17" r="2" />
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

// The app's categories, each with its own landing page linked from the app's cover; learn, developer and network
// tools are on their own sites.
export const HOME_CATEGORY_TILES: HomeCategoryTile[] = [
  { category: "daily", messageKey: "daily", icon: AgeIcon },
  { category: "game", messageKey: "game", icon: GameIcon },
  { category: "utility", messageKey: "utility", icon: UtilityIcon },
];
