// Weather warnings across Japan: the Japan Meteorological Agency (気象庁) publishes one file with the warnings and advisories in force in every
// area. This ranks them (emergency warning, urgent warning, warning, advisory), gathers the areas into prefectures and counts them. Pure
// functions, tested without a browser. Source: 気象庁ホームページ.
//
// Since 28 May 2026 the Agency has five levels (the "urgent warning", 危険警報, is new, between the warning and the emergency warning) and keeps
// the data in a new place (data/r8/): a list of reports, each of one kind (rain, landslide, storm surge, wind, waves, others). The old place was
// left as it was on that day.
import { PREFECTURES } from "./prefectures.ts";

export const AREA_URL = "https://www.jma.go.jp/bosai/common/const/area.json";
const BASE = "https://www.jma.go.jp/bosai/warning/data/";
// Where the map file is, in the order to try: this year's folder (r8 is Reiwa 8, 2026; the Agency's folders carry the era year), then the one
// of 2026. The old file (warning/map.json) is not tried: it stopped on 28 May 2026, and showing it would pass off old warnings as current ones.
export function mapUrls(year: number): string[] {
  return [...new Set([`${BASE}r${year - 2018}/map.json`, `${BASE}r8/map.json`])];
}

export type Level = "special" | "urgent" | "warning" | "advisory" | "none";
const SEVERITY: Record<Level | "unknown", number> = { unknown: -1, none: 0, advisory: 1, warning: 2, urgent: 3, special: 4 };
export const severity = (level: Level | "unknown") => SEVERITY[level];

type Locale = "ja" | "en" | "zh";
// The Agency's codes for each kind of warning, in three languages.
export const KINDS: Record<string, { level: Exclude<Level, "none">; ja: string; en: string; zh: string }> = {
  "09": { level: "warning", ja: "土砂災害警報", en: "Landslide Warning", zh: "土砂灾害警报" },
  "29": { level: "advisory", ja: "土砂災害注意報", en: "Landslide Advisory", zh: "土砂灾害注意报" },
  "39": { level: "special", ja: "土砂災害特別警報", en: "Landslide Emergency Warning", zh: "土砂灾害特别警报" },
  "49": { level: "urgent", ja: "土砂災害危険警報", en: "Landslide Urgent Warning", zh: "土砂灾害危险警报" },
  "43": { level: "urgent", ja: "大雨危険警報", en: "Heavy Rain Urgent Warning", zh: "暴雨危险警报" },
  "48": { level: "urgent", ja: "高潮危険警報", en: "Storm Surge Urgent Warning", zh: "风暴潮危险警报" },
  "02": { level: "warning", ja: "暴風雪警報", en: "Blizzard Warning", zh: "暴风雪警报" },
  "03": { level: "warning", ja: "大雨警報", en: "Heavy Rain Warning", zh: "暴雨警报" },
  "04": { level: "warning", ja: "洪水警報", en: "Flood Warning", zh: "洪水警报" },
  "05": { level: "warning", ja: "暴風警報", en: "Storm Warning", zh: "暴风警报" },
  "06": { level: "warning", ja: "大雪警報", en: "Heavy Snow Warning", zh: "暴雪警报" },
  "07": { level: "warning", ja: "波浪警報", en: "High Wave Warning", zh: "海浪警报" },
  "08": { level: "warning", ja: "高潮警報", en: "Storm Surge Warning", zh: "风暴潮警报" },
  "10": { level: "advisory", ja: "大雨注意報", en: "Heavy Rain Advisory", zh: "大雨注意报" },
  "12": { level: "advisory", ja: "大雪注意報", en: "Heavy Snow Advisory", zh: "大雪注意报" },
  "13": { level: "advisory", ja: "風雪注意報", en: "Wind and Snow Advisory", zh: "风雪注意报" },
  "14": { level: "advisory", ja: "雷注意報", en: "Thunderstorm Advisory", zh: "雷电注意报" },
  "15": { level: "advisory", ja: "強風注意報", en: "Strong Wind Advisory", zh: "强风注意报" },
  "16": { level: "advisory", ja: "波浪注意報", en: "High Wave Advisory", zh: "海浪注意报" },
  "17": { level: "advisory", ja: "融雪注意報", en: "Snow Melting Advisory", zh: "融雪注意报" },
  "18": { level: "advisory", ja: "洪水注意報", en: "Flood Advisory", zh: "洪水注意报" },
  "19": { level: "advisory", ja: "高潮注意報", en: "Storm Surge Advisory", zh: "风暴潮注意报" },
  "20": { level: "advisory", ja: "濃霧注意報", en: "Dense Fog Advisory", zh: "浓雾注意报" },
  "21": { level: "advisory", ja: "乾燥注意報", en: "Dry Air Advisory", zh: "干燥注意报" },
  "22": { level: "advisory", ja: "なだれ注意報", en: "Avalanche Advisory", zh: "雪崩注意报" },
  "23": { level: "advisory", ja: "低温注意報", en: "Low Temperature Advisory", zh: "低温注意报" },
  "24": { level: "advisory", ja: "霜注意報", en: "Frost Advisory", zh: "霜冻注意报" },
  "25": { level: "advisory", ja: "着氷注意報", en: "Ice Accretion Advisory", zh: "结冰注意报" },
  "26": { level: "advisory", ja: "着雪注意報", en: "Snow Accretion Advisory", zh: "附雪注意报" },
  "27": { level: "advisory", ja: "その他の注意報", en: "Other Advisory", zh: "其他注意报" },
  "32": { level: "special", ja: "暴風雪特別警報", en: "Blizzard Emergency Warning", zh: "暴风雪特别警报" },
  "33": { level: "special", ja: "大雨特別警報", en: "Heavy Rain Emergency Warning", zh: "暴雨特别警报" },
  "35": { level: "special", ja: "暴風特別警報", en: "Storm Emergency Warning", zh: "暴风特别警报" },
  "36": { level: "special", ja: "大雪特別警報", en: "Heavy Snow Emergency Warning", zh: "暴雪特别警报" },
  "37": { level: "special", ja: "波浪特別警報", en: "High Wave Emergency Warning", zh: "海浪特别警报" },
  "38": { level: "special", ja: "高潮特別警報", en: "Storm Surge Emergency Warning", zh: "风暴潮特别警报" },
};
export const kindName = (code: string, locale: Locale) => KINDS[code]?.[locale] ?? code;

// The Agency's map file: a list of reports, the latest of each kind (rain, landslide, ...) for each of its offices. A report names the warnings in
// each area: the first kind of area is the large districts (一次細分区域, such as "Tokyo Region"), the second the municipalities (hundreds in
// Hokkaido alone), which are too many to show: the districts are what is listed.
type Item = { areaCode?: string; kinds?: { code?: string; status?: string }[] };
export type Report = {
  reportDatetime?: string;
  controlDatetime?: string;
  dataTypeCode?: string;
  warning?: { class10Items?: Item[]; class20Items?: Item[] };
};
type AreaFile = {
  class10s?: Record<string, { name: string; enName?: string; parent?: string }>;
};

export type Warning = { code: string; level: Exclude<Level, "none"> };
export type AreaState = { code: string; name: string; enName: string; level: Level; warnings: Warning[] };
export type PrefectureState = {
  code: string;
  level: Level | "unknown";
  warnings: (Warning & { areas: number })[];   // the kinds in force somewhere in the prefecture, strongest first, with how many areas
  areas: AreaState[];                          // the districts of the prefecture, strongest first
  reported: Date | null;                       // the latest report among its offices
};

// In force: issued, continuing, or lowered to a lesser one ("警報から注意報"); not lifted, and not "none issued".
const inForceStatus = (status: string | undefined) => status === "発表" || status === "継続" || /から/.test(status ?? "");

// The warnings in force (issued or continuing, not lifted), strongest first.
export function inForce(warnings: { code?: string; status?: string }[] | undefined): Warning[] {
  return (warnings ?? [])
    .filter(w => w.code && inForceStatus(w.status) && KINDS[w.code])
    .map(w => ({ code: w.code as string, level: KINDS[w.code as string].level }))
    .sort((a, b) => severity(b.level) - severity(a.level) || a.code.localeCompare(b.code));
}
const levelOf = (warnings: Warning[]): Level => warnings[0]?.level ?? "none";

// The office a district belongs to (a district of Hokkaido or Okinawa is its own office; its code begins with the prefecture's).
const officeOf = (code: string, area: AreaFile | null | undefined) => area?.class10s?.[code]?.parent ?? code;

// All 47 prefectures, from the map file and the list of areas. A report covers one kind of warning in the districts of one office; an office's
// state is all of its latest reports together (the newest of each kind). Each office's districts go to the prefecture its code begins with
// (Hokkaido and Okinawa have several offices). A prefecture that the file does not mention is "unknown".
export function overview(reports: Report[] | null | undefined, area: AreaFile | null | undefined): PrefectureState[] {
  const states = new Map<string, PrefectureState>(PREFECTURES.map(p => [p.code, { code: p.code, level: "unknown", warnings: [], areas: [], reported: null }]));
  // The newest report of each kind for each office.
  const latest = new Map<string, { report: Report; office: string }>();
  for (const report of reports ?? []) {
    const first = report.warning?.class10Items?.[0]?.areaCode ?? "";
    if (!first) continue;
    const office = officeOf(first, area);
    const key = `${office}/${report.dataTypeCode ?? ""}`;
    const stamp = report.controlDatetime ?? report.reportDatetime ?? "";
    const known = latest.get(key);
    if (!known || stamp > (known.report.controlDatetime ?? known.report.reportDatetime ?? "")) latest.set(key, { report, office });
  }
  // Each district's warnings in force, from all the reports that name it.
  const districts = new Map<string, Map<string, Map<string, Warning>>>();   // prefecture -> district -> kind code -> warning
  for (const { report, office } of latest.values()) {
    const prefecture = states.get(office.slice(0, 2));
    if (!prefecture) continue;
    const reported = report.reportDatetime ? new Date(report.reportDatetime) : null;
    if (reported && !Number.isNaN(reported.getTime()) && (!prefecture.reported || reported > prefecture.reported)) prefecture.reported = reported;
    const byDistrict = districts.get(prefecture.code) ?? new Map<string, Map<string, Warning>>();
    districts.set(prefecture.code, byDistrict);
    for (const item of report.warning?.class10Items ?? []) {
      if (!item.areaCode) continue;
      const kinds = byDistrict.get(item.areaCode) ?? new Map<string, Warning>();
      byDistrict.set(item.areaCode, kinds);
      for (const w of inForce(item.kinds)) kinds.set(w.code, w);
    }
  }
  for (const [code, byDistrict] of districts) {
    const prefecture = states.get(code) as PrefectureState;
    const tally = new Map<string, Warning & { areas: number }>();
    for (const [districtCode, kinds] of byDistrict) {
      const warnings = [...kinds.values()].sort((a, b) => severity(b.level) - severity(a.level) || a.code.localeCompare(b.code));
      const known = area?.class10s?.[districtCode];
      prefecture.areas.push({ code: districtCode, name: known?.name ?? districtCode, enName: known?.enName ?? known?.name ?? districtCode, level: levelOf(warnings), warnings });
      for (const w of warnings) tally.set(w.code, { ...w, areas: (tally.get(w.code)?.areas ?? 0) + 1 });
    }
    prefecture.areas.sort((a, b) => severity(b.level) - severity(a.level) || a.code.localeCompare(b.code));
    prefecture.warnings = [...tally.values()].sort((a, b) => severity(b.level) - severity(a.level) || b.areas - a.areas || a.code.localeCompare(b.code));
    prefecture.level = prefecture.areas.length > 0 ? levelOf(prefecture.warnings) : "unknown";
  }
  return PREFECTURES.map(p => states.get(p.code) as PrefectureState);
}

// How many prefectures are at each level.
export function counts(states: PrefectureState[]): Record<Level | "unknown", number> {
  const out: Record<Level | "unknown", number> = { special: 0, urgent: 0, warning: 0, advisory: 0, none: 0, unknown: 0 };
  for (const s of states) out[s.level]++;
  return out;
}

export type Shown = "warning" | "advisory" | "all";
// The prefectures to list: with a warning (or an emergency one), with an advisory too, or all; the strongest first, then in order of code.
export function listed(states: PrefectureState[], shown: Shown): PrefectureState[] {
  const least = shown === "warning" ? 2 : shown === "advisory" ? 1 : -1;
  return states.filter(s => severity(s.level) >= least).sort((a, b) => severity(b.level) - severity(a.level) || a.code.localeCompare(b.code));
}

// The latest report anywhere, and whole days since it when it is two or more (a map that old is probably not being updated).
export function staleDays(states: PrefectureState[], now: Date): number {
  const latest = states.reduce<number>((t, s) => Math.max(t, s.reported?.getTime() ?? 0), 0);
  if (!latest) return 0;
  const days = Math.floor((now.getTime() - latest) / 86_400_000);
  return days >= 2 ? days : 0;
}

export const warningPageUrl = (code: string) => `https://www.jma.go.jp/bosai/warning/#area_type=class20s&area_code=${code}`;
