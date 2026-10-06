"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import styles from "./warnings-view.module.css";
import { GRID, PREFECTURES } from "./prefectures";
import { AREA_URL, counts, kindName, listed, mapUrls, overview, staleDays, type PrefectureState, type Report, type Shown } from "./warnings";

type Locale = "ja" | "en" | "zh";
type AreaFile = Parameters<typeof overview>[1];
const REFRESH_MS = 60_000;
const PAGE_URL = "https://www.jma.go.jp/bosai/warning/";
const SHOWN: Shown[] = ["warning", "advisory", "all"];

export default function Warnings() {
  const t = useTranslations("App.warnings");
  const locale = useLocale() as Locale;
  const [map, setMap] = useState<Report[] | null>(null);
  const [area, setArea] = useState<AreaFile>(null);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [shown, setShown] = useState<Shown>("advisory");
  const [open, setOpen] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLLIElement | null>>({});

  const load = useCallback(async () => {
    // The Agency's folder for the year first, then the older places (see mapUrls).
    let found: Report[] | null = null;
    for (const url of mapUrls(new Date().getFullYear())) {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) continue;
        const data: unknown = await response.json();
        if (Array.isArray(data)) { found = data as Report[]; break; }
      } catch { /* try the next place */ }
    }
    if (found) setMap(found);
    setFailed(found === null);
    setNow(new Date());
  }, []);

  // The map file is read when the page opens and every minute while it is in view; the list of area names once.
  useEffect(() => {
    void load();
    fetch(AREA_URL).then(r => (r.ok ? (r.json() as Promise<AreaFile>) : null)).then(setArea).catch(() => setArea(null));
    const timer = setInterval(() => { if (document.visibilityState === "visible") void load(); }, REFRESH_MS);
    const visible = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", visible);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, [load]);

  const states = useMemo(() => overview(map, area), [map, area]);
  const byCode = useMemo(() => Object.fromEntries(states.map(s => [s.code, s])), [states]);
  const tally = counts(states);
  const rows = listed(states, shown);
  const stale = now && map ? staleDays(states, now) : 0;
  const name = (code: string) => { const p = PREFECTURES.find(x => x.code === code); return p ? p[locale] : code; };
  const short = (code: string) => { const p = PREFECTURES.find(x => x.code === code); return p ? (locale === "ja" ? p.shortJa : locale === "zh" ? p.shortZh : p.shortEn) : code; };
  const when = (date: Date) => date.toLocaleString(locale === "ja" ? "ja-JP" : locale === "zh" ? "zh-CN" : "en-US", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const latest = states.reduce<Date | null>((best, s) => (s.reported && (!best || s.reported > best) ? s.reported : best), null);

  // A click on a tile opens that prefecture in the list (widening the list if it is not in it) and scrolls to it.
  function choose(code: string) {
    if (!listed(states, shown).some(s => s.code === code)) setShown("all");
    setOpen(code);
    requestAnimationFrame(() => rowRefs.current[code]?.scrollIntoView({ block: "center", behavior: "smooth" }));
  }

  const chips = (state: PrefectureState) => state.warnings.map(w => (
    <span key={w.code} className={styles.chip} data-level={w.level}>{kindName(w.code, locale)}{w.areas > 1 && <span className={styles.times}>×{w.areas}</span>}</span>
  ));

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      {failed && <p className={styles.error} role="alert">{t("failed")} <button type="button" className={styles.link} onClick={() => void load()} data-warnings="retry">{t("retry")}</button></p>}
      {stale > 0 && <p className={styles.stale} data-warnings="stale">{t("stale", { days: stale })}</p>}
      <section className={styles.stats} aria-label={t("summary")} data-warnings="summary">
        {(["special", "urgent", "warning", "advisory"] as const).map(level => (
          <div key={level} data-level={level}>
            <span className={styles.big}>{map ? tally[level] : "–"}</span>
            <span className={styles.small}>{t(`levels.${level}`)}</span>
          </div>
        ))}
      </section>
      <p className={styles.statsNote}>{t("statsNote")}</p>
      <div className={styles.tiles} style={{ gridTemplateColumns: `repeat(${GRID.cols}, 1fr)`, gridTemplateRows: `repeat(${GRID.rows}, auto)` }} role="group" aria-label={t("mapLabel")} data-warnings="tiles">
        {PREFECTURES.map(p => {
          const state = byCode[p.code];
          return (
            <button key={p.code} type="button" className={styles.tile} style={{ gridColumn: p.col + 1, gridRow: p.row + 1 }} data-level={state.level} data-prefecture={p.code} aria-pressed={open === p.code}
              aria-label={`${p[locale]}: ${t(`levels.${state.level}`)}`} onClick={() => choose(p.code)}>
              {short(p.code)}
            </button>
          );
        })}
      </div>
      <div className={styles.legend} aria-hidden="true">
        {(["special", "urgent", "warning", "advisory", "none", "unknown"] as const).map(level => <span key={level} className={styles.key} data-level={level}>{t(`levels.${level}`)}</span>)}
      </div>
      <div className={styles.filters} role="group" aria-label={t("filter")}>
        {SHOWN.map(choice => <button key={choice} type="button" className={styles.choice} aria-pressed={shown === choice} onClick={() => setShown(choice)}>{t(`show.${choice}`)}</button>)}
      </div>
      {map === null && !failed && <p className={styles.status} role="status">{t("loading")}</p>}
      {map !== null && rows.length === 0 && <p className={styles.status} role="status">{t("none")}</p>}
      <ul className={styles.list} data-warnings="list">
        {rows.map(state => {
          const expanded = open === state.code;
          return (
            <li key={state.code} className={styles.row} data-prefecture={state.code} data-level={state.level} ref={el => { rowRefs.current[state.code] = el; }}>
              <button type="button" className={styles.head} aria-expanded={expanded} onClick={() => setOpen(expanded ? null : state.code)}>
                <span className={styles.badge} data-level={state.level}>{t(`levels.${state.level}`)}</span>
                <span className={styles.name}>{name(state.code)}</span>
                <span className={styles.chips}>{chips(state)}</span>
              </button>
              {expanded && (
                <div className={styles.detail}>
                  {state.areas.length === 0 ? <p>{t("noData")}</p> : state.areas.map(a => (
                    <p key={a.code} className={styles.area} data-level={a.level}>
                      <span className={styles.areaName}>{locale === "en" ? a.enName : a.name}</span>
                      {a.warnings.length === 0 ? <span className={styles.quiet}>{t("levels.none")}</span> : a.warnings.map(w => <span key={w.code} className={styles.chip} data-level={w.level}>{kindName(w.code, locale)}</span>)}
                    </p>
                  ))}
                  {state.reported && <p className={styles.reported}>{t("reported", { time: when(state.reported) })}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className={styles.updated} role="status" data-warnings="updated">{map && now ? t("checked", { time: when(now), report: latest ? when(latest) : "—" }) : ""}</p>
      <p className={controls.label}>{t("note")}</p>
      <p className={styles.credit}>{t("credit")} <a href={PAGE_URL} target="_blank" rel="noopener nofollow">{t("creditLink")}</a>{t("creditEnd")}</p>
    </ToolLayout>
  );
}
