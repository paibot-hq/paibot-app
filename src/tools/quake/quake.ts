// Earthquake information from the Japan Meteorological Agency (気象庁): the list of reports it publishes at
// https://www.jma.go.jp/bosai/quake/data/list.json and each report's detail file. This turns them into plain entries (one per
// earthquake, the latest report of it), filters and counts them, and places epicentres on the map. Pure functions, tested without a
// browser. Source: 気象庁ホームページ; the page says that the information was processed.

export const LIST_URL = "https://www.jma.go.jp/bosai/quake/data/list.json";
export const DETAIL_URL = "https://www.jma.go.jp/bosai/quake/data/";

// The scale of seismic intensity (震度): 5 and 6 each have a lower and an upper degree.
export const INTENSITIES = ["1", "2", "3", "4", "5-", "5+", "6-", "6+", "7"] as const;
export type Intensity = (typeof INTENSITIES)[number];

export type Kind = "report" | "hypocenter" | "overseas";
export type Entry = {
  id: string;
  at: Date;          // when the earthquake happened
  reported: Date;    // when this report was issued
  place: string;
  placeEn: string;
  magnitude: number | null;
  depthKm: number | null;   // 0 is "very shallow"
  lat: number | null;
  lon: number | null;
  intensity: Intensity | null;
  kind: Kind;
  json: string;
};

export type Raw = {
  eid?: string; ctt?: string; ttl?: string; at?: string; rdt?: string; anm?: string; en_anm?: string; cod?: string; mag?: string; maxi?: string; json?: string;
};

const KINDS: Record<string, Kind> = { "震源・震度情報": "report", "震源に関する情報": "hypocenter", "遠地地震に関する情報": "overseas" };

// "+36.1+139.9-50000/" is latitude, longitude and height in metres (minus is depth); "+0" is at the surface.
export function parseCoordinate(code: string | undefined): { lat: number; lon: number; depthKm: number | null } | null {
  const m = /^([+-]\d+(?:\.\d+)?)([+-]\d+(?:\.\d+)?)(?:([+-]\d+(?:\.\d+)?))?\/?$/.exec(code ?? "");
  if (!m) return null;
  return { lat: Number(m[1]), lon: Number(m[2]), depthKm: m[3] === undefined ? null : Math.round(Math.abs(Number(m[3])) / 1000) };
}

export function parseIntensity(code: string | undefined): Intensity | null {
  return (INTENSITIES as readonly string[]).includes(code ?? "") ? (code as Intensity) : null;
}

export function parseEntry(raw: Raw): Entry | null {
  const kind = KINDS[raw.ttl ?? ""];
  if (!kind || !raw.eid || !raw.at || !raw.json) return null;   // the preliminary "震度速報" and other kinds are left out
  const at = new Date(raw.at), reported = new Date(raw.rdt ?? raw.at);
  if (Number.isNaN(at.getTime())) return null;
  const where = parseCoordinate(raw.cod);
  const magnitude = raw.mag && /^\d+(\.\d+)?$/.test(raw.mag) ? Number(raw.mag) : null;
  return {
    id: raw.eid, at, reported, place: raw.anm ?? "", placeEn: raw.en_anm?.replace(/\s+/g, " ").trim() ?? "", magnitude,
    depthKm: where?.depthKm ?? null, lat: where?.lat ?? null, lon: where?.lon ?? null, intensity: parseIntensity(raw.maxi), kind, json: raw.json,
  };
}

// One entry per earthquake: its latest report (a quake is reported again as the figures are corrected), newest earthquake first.
export function parseList(list: Raw[]): Entry[] {
  const latest = new Map<string, { entry: Entry; issued: string }>();
  for (const raw of list) {
    const entry = parseEntry(raw);
    if (!entry) continue;
    const issued = raw.ctt ?? "";
    const known = latest.get(entry.id);
    if (!known || issued > known.issued) latest.set(entry.id, { entry, issued });
  }
  return [...latest.values()].map(v => v.entry).sort((a, b) => b.at.getTime() - a.at.getTime());
}

// 0 for none, 1-9 along the scale.
export const rank = (i: Intensity | null) => (i === null ? 0 : INTENSITIES.indexOf(i) + 1);

export type Filter = { minIntensity: Intensity | null; overseas: boolean };
export function filter(entries: Entry[], { minIntensity, overseas }: Filter): Entry[] {
  return entries.filter(e => (overseas || e.kind !== "overseas") && rank(e.intensity) >= rank(minIntensity));
}

export type Stats = { total: number; felt3: number; strongest: Entry | null };
// The earthquakes of the 24 hours before `now`: how many, how many of intensity 3 or more, and the strongest (by intensity, then magnitude).
export function last24h(entries: Entry[], now: Date): Stats {
  const recent = entries.filter(e => e.kind !== "overseas" && now.getTime() - e.at.getTime() <= 24 * 3600_000 && e.at.getTime() <= now.getTime() + 60_000);
  let strongest: Entry | null = null;
  for (const e of recent) {
    if (!strongest || rank(e.intensity) > rank(strongest.intensity) || (rank(e.intensity) === rank(strongest.intensity) && (e.magnitude ?? 0) > (strongest.magnitude ?? 0))) strongest = e;
  }
  return { total: recent.length, felt3: recent.filter(e => rank(e.intensity) >= 3).length, strongest };
}

// How long ago, as whole minutes, hours or days.
export function ago(now: Date, then: Date): { unit: "minutes" | "hours" | "days"; value: number } {
  const minutes = Math.max(0, Math.floor((now.getTime() - then.getTime()) / 60000));
  if (minutes < 60) return { unit: "minutes", value: minutes };
  if (minutes < 1440) return { unit: "hours", value: Math.floor(minutes / 60) };
  return { unit: "days", value: Math.floor(minutes / 1440) };
}

// The colours of the scale as the Agency draws them, with a text colour that can be read on each.
export const COLORS: Record<Intensity, { fill: string; text: string }> = {
  "1": { fill: "#f2f2ff", text: "#1a1a2e" }, "2": { fill: "#00aaff", text: "#03203a" }, "3": { fill: "#0041ff", text: "#ffffff" },
  "4": { fill: "#fae696", text: "#3a3000" }, "5-": { fill: "#ffe600", text: "#3a3000" }, "5+": { fill: "#ff9900", text: "#2e1a00" },
  "6-": { fill: "#ff2800", text: "#ffffff" }, "6+": { fill: "#a50021", text: "#ffffff" }, "7": { fill: "#b40068", text: "#ffffff" },
};

export function intensityLabel(i: Intensity, locale: "ja" | "en" | "zh"): string {
  if (i === "5-" || i === "6-") return locale === "ja" ? `${i[0]}弱` : locale === "zh" ? `${i[0]}弱` : `${i[0]} lower`;
  if (i === "5+" || i === "6+") return locale === "ja" ? `${i[0]}強` : locale === "zh" ? `${i[0]}强` : `${i[0]} upper`;
  return i;
}

// The map: longitude 122-150, latitude 24-46, drawn without stretching (a degree of longitude is shorter than one of latitude).
export const MAP = { lonMin: 122, lonMax: 150, latMin: 24, latMax: 46, centreLat: 35 };
export const MAP_ASPECT = ((MAP.lonMax - MAP.lonMin) * Math.cos((MAP.centreLat * Math.PI) / 180)) / (MAP.latMax - MAP.latMin);
export function project(lat: number, lon: number, width: number, height: number): { x: number; y: number } {
  return { x: ((lon - MAP.lonMin) / (MAP.lonMax - MAP.lonMin)) * width, y: ((MAP.latMax - lat) / (MAP.latMax - MAP.latMin)) * height };
}
export const onMap = (lat: number, lon: number) => lat >= MAP.latMin && lat <= MAP.latMax && lon >= MAP.lonMin && lon <= MAP.lonMax;

// A report's detail file: the areas by intensity and the comment on a tsunami. The headline lists the areas of intensity 3 and more; for a
// weaker earthquake it is empty, and the areas are taken from the observations instead (the areas of each prefecture, with their English names).
export type Detail = { areas: { intensity: Intensity; names: string[]; namesEn: string[] | null }[]; tsunami: { ja: string; en: string } | null };

const fromKind = (name: string): Intensity | null => {
  const m = /震度(\d)([弱強])?/.exec(name.normalize("NFKC"));
  return m ? parseIntensity(m[2] === "弱" ? `${m[1]}-` : m[2] === "強" ? `${m[1]}+` : m[1]) : null;
};

type DetailFile = {
  Head?: { Headline?: { Information?: { Item?: { Kind?: { Name?: string }; Areas?: { Area?: { Name?: string }[] } }[] }[] } };
  Body?: {
    Intensity?: { Observation?: { Pref?: { Area?: { Name?: string; enName?: string; MaxInt?: string }[] }[] } };
    Comments?: { ForecastComment?: { Text?: string; enText?: string } };
  };
};

export function parseDetail(json: unknown): Detail | null {
  const data = json as DetailFile | null;
  if (!data || typeof data !== "object") return null;
  const areas: Detail["areas"] = [];
  for (const item of data.Head?.Headline?.Information?.[0]?.Item ?? []) {
    const intensity = fromKind(item.Kind?.Name ?? "");
    const names = (item.Areas?.Area ?? []).map(a => a.Name ?? "").filter(Boolean);
    if (intensity && names.length) areas.push({ intensity, names, namesEn: null });
  }
  if (areas.length === 0) {
    const grouped = new Map<Intensity, { names: string[]; namesEn: string[] }>();
    for (const pref of data.Body?.Intensity?.Observation?.Pref ?? []) {
      for (const area of pref.Area ?? []) {
        const intensity = parseIntensity(area.MaxInt);
        if (!intensity || !area.Name) continue;
        const group = grouped.get(intensity) ?? { names: [], namesEn: [] };
        group.names.push(area.Name);
        group.namesEn.push(area.enName?.trim() || area.Name);
        grouped.set(intensity, group);
      }
    }
    for (const [intensity, group] of [...grouped].sort((a, b) => rank(b[0]) - rank(a[0]))) areas.push({ intensity, names: group.names, namesEn: group.namesEn });
  }
  const comment = data.Body?.Comments?.ForecastComment;
  return { areas, tsunami: comment?.Text ? { ja: comment.Text.trim(), en: (comment.enText ?? "").trim() } : null };
}
