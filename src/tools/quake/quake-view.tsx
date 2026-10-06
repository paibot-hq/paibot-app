"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useLocale, useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import styles from "./quake-view.module.css";
import { OUTLINE } from "./outline";
import { COLORS, DETAIL_URL, INTENSITIES, LIST_URL, MAP, MAP_ASPECT, ago, filter, intensityLabel, last24h, onMap, parseDetail, parseList, project, rank, type Detail, type Entry, type Intensity, type Raw } from "./quake";

type Locale = "ja" | "en" | "zh";
const REFRESH_MS = 60_000;
const SHOWN = 40;
const MIN_CHOICES: (Intensity | null)[] = [null, "3", "4", "5-"];
const PAGE_URL = "https://www.jma.go.jp/bosai/map.html#contents=earthquake_map";

export default function Quake() {
  const t = useTranslations("App.quake");
  const locale = useLocale() as Locale;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frame = useRef(0);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [updated, setUpdated] = useState<Date | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [minIntensity, setMinIntensity] = useState<Intensity | null>(null);
  const [overseas, setOverseas] = useState(false);
  const [more, setMore] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, Detail | "loading" | "failed">>({});

  const load = useCallback(async () => {
    try {
      const response = await fetch(LIST_URL, { cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      setEntries(parseList((await response.json()) as Raw[]));
      setUpdated(new Date());
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  // The list is read when the page opens, again every minute while it is in view, and when it comes back into view.
  useEffect(() => {
    setNow(new Date());
    void load();
    const timer = setInterval(() => { if (document.visibilityState === "visible") { setNow(new Date()); void load(); } }, REFRESH_MS);
    const visible = () => { if (document.visibilityState === "visible") { setNow(new Date()); void load(); } };
    document.addEventListener("visibilitychange", visible);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, [load]);

  const shown = useMemo(() => (entries ? filter(entries, { minIntensity, overseas }) : []), [entries, minIntensity, overseas]);
  const stats = useMemo(() => (entries && now ? last24h(entries, now) : null), [entries, now]);
  const liveRef = useRef({ shown, open, now });
  liveRef.current = { shown, open, now };

  const placeOf = (e: Entry) => (locale === "en" && e.placeEn ? e.placeEn : e.place);
  const label = (i: Intensity) => intensityLabel(i, locale);
  const when = (date: Date) => date.toLocaleString(locale === "ja" ? "ja-JP" : locale === "zh" ? "zh-CN" : "en-US", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const agoText = (date: Date) => {
    const { unit, value } = ago(now ?? new Date(), date);
    return t(unit === "minutes" ? "agoMinutes" : unit === "hours" ? "agoHours" : "agoDays", { n: value });
  };

  function toggle(entry: Entry) {
    const next = open === entry.id ? null : entry.id;
    setOpen(next);
    if (next && !details[entry.id]) {
      setDetails(d => ({ ...d, [entry.id]: "loading" }));
      fetch(DETAIL_URL + entry.json)
        .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
        .then(json => setDetails(d => ({ ...d, [entry.id]: parseDetail(json) ?? "failed" })))
        .catch(() => setDetails(d => ({ ...d, [entry.id]: "failed" })));
    }
  }

  // The map, redrawn whenever what it shows changes.
  const draw = useCallback(() => {
    frame.current = 0;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) { canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr); }
    const W = rect.width, H = rect.height;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const dark = document.documentElement.dataset.theme === "dark";
    const sea = dark ? "#0e1a2b" : "#dbe9f6", land = dark ? "#22344d" : "#f6f2e7", edge = dark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.3)", grid = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
    ctx.fillStyle = sea;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = grid; ctx.lineWidth = 1;
    for (let lon = Math.ceil(MAP.lonMin / 5) * 5; lon <= MAP.lonMax; lon += 5) { const p = project(MAP.latMin, lon, W, H); ctx.beginPath(); ctx.moveTo(p.x, 0); ctx.lineTo(p.x, H); ctx.stroke(); }
    for (let lat = Math.ceil(MAP.latMin / 5) * 5; lat <= MAP.latMax; lat += 5) { const p = project(lat, MAP.lonMin, W, H); ctx.beginPath(); ctx.moveTo(0, p.y); ctx.lineTo(W, p.y); ctx.stroke(); }
    ctx.fillStyle = land; ctx.strokeStyle = edge; ctx.lineWidth = 0.8; ctx.lineJoin = "round";
    for (const ring of OUTLINE) {
      ctx.beginPath();
      ring.forEach(([lon, lat], i) => { const p = project(lat, lon, W, H); if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    const { shown: list, open: chosen, now: current } = liveRef.current;
    const hour = 3600_000;
    // Oldest first, so the newest lie on top.
    for (const e of [...list].reverse()) {
      if (e.lat === null || e.lon === null || !onMap(e.lat, e.lon)) continue;
      const age = current ? current.getTime() - e.at.getTime() : 0;
      const p = project(e.lat, e.lon, W, H);
      const r = e.magnitude === null ? 3 : 2 + 1.7 * Math.max(0, e.magnitude - 1);
      ctx.globalAlpha = age < 24 * hour ? 0.95 : age < 7 * 24 * hour ? 0.75 : 0.5;
      ctx.fillStyle = e.intensity ? COLORS[e.intensity].fill : dark ? "#8a98ad" : "#9aa7b8";
      ctx.strokeStyle = dark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.55)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (e.id === chosen) { ctx.globalAlpha = 1; ctx.strokeStyle = "#e5456d"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(p.x, p.y, r + 5, 0, Math.PI * 2); ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
  }, []);
  const schedule = useCallback(() => { if (!frame.current) frame.current = requestAnimationFrame(draw); }, [draw]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(schedule);
    observer.observe(canvas);
    const theme = new MutationObserver(schedule);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => { observer.disconnect(); theme.disconnect(); cancelAnimationFrame(frame.current); };
  }, [schedule]);
  useEffect(() => { schedule(); }, [shown, open, now, schedule]);

  // A click on the map picks the nearest epicentre within reach.
  function pick(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    let best: Entry | null = null, bestDistance = 14;
    for (const e of shown) {
      if (e.lat === null || e.lon === null || !onMap(e.lat, e.lon)) continue;
      const p = project(e.lat, e.lon, rect.width, rect.height);
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestDistance) { best = e; bestDistance = d; }
    }
    if (best) { toggle(best); setMore(m => m || shown.indexOf(best as Entry) >= SHOWN); }
  }

  const visible = more ? shown : shown.slice(0, SHOWN);
  const badge = (i: Intensity | null) => (i ? <span className={styles.badge} style={{ background: COLORS[i].fill, color: COLORS[i].text }} aria-label={t("intensityLabel", { value: label(i) })}>{label(i)}</span> : <span className={`${styles.badge} ${styles.none}`}>{t("noIntensity")}</span>);

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      {failed && (
        <p className={styles.error} role="alert">
          {t("failed")} <button type="button" className={styles.link} onClick={() => void load()} data-quake="retry">{t("retry")}</button>
        </p>
      )}
      {stats && (
        <section className={styles.summary} aria-label={t("last24h")} data-quake="summary">
          <div><span className={styles.big}>{stats.total}</span><span className={styles.small}>{t("count24h")}</span></div>
          <div><span className={styles.big}>{stats.felt3}</span><span className={styles.small}>{t("felt3")}</span></div>
          <div>
            {stats.strongest ? <>{badge(stats.strongest.intensity)}<span className={styles.small}>{t("strongest", { place: placeOf(stats.strongest) })}</span></> : <span className={styles.small}>—</span>}
          </div>
        </section>
      )}
      <div className={styles.mapWrap}>
        <canvas ref={canvasRef} className={styles.map} style={{ aspectRatio: String(MAP_ASPECT) }} role="img" aria-label={t("mapLabel")} onPointerDown={pick} />
      </div>
      <div className={styles.legend} aria-hidden="true">
        {INTENSITIES.map(i => <span key={i} className={styles.badge} style={{ background: COLORS[i].fill, color: COLORS[i].text }}>{label(i)}</span>)}
        <span className={styles.legendNote}>{t("legend")}</span>
      </div>
      <div className={styles.filters} role="group" aria-label={t("filter")}>
        {MIN_CHOICES.map(choice => (
          <button key={choice ?? "all"} type="button" className={styles.choice} aria-pressed={minIntensity === choice} onClick={() => setMinIntensity(choice)}>
            {choice === null ? t("all") : t("atLeast", { value: label(choice) })}
          </button>
        ))}
        <button type="button" className={styles.choice} aria-pressed={overseas} onClick={() => setOverseas(on => !on)}>{t("overseas")}</button>
      </div>
      {entries === null && !failed && <p className={styles.status} role="status">{t("loading")}</p>}
      {entries !== null && shown.length === 0 && <p className={styles.status} role="status">{t("none")}</p>}
      <ul className={styles.list} data-quake="list">
        {visible.map(entry => {
          const detail = details[entry.id];
          const expanded = open === entry.id;
          return (
            <li key={entry.id} className={styles.row} data-quake-id={entry.id} data-open={expanded}>
              <button type="button" className={styles.head} aria-expanded={expanded} onClick={() => toggle(entry)}>
                {badge(entry.intensity)}
                <span className={styles.place}>{placeOf(entry)}{entry.kind === "overseas" && <span className={styles.tag}>{t("abroad")}</span>}</span>
                <span className={styles.facts}>
                  {entry.magnitude !== null ? `M${entry.magnitude.toFixed(1)}` : t("magnitudeUnknown")}
                  {entry.depthKm !== null && ` · ${entry.depthKm === 0 ? t("veryShallow") : t("depth", { km: entry.depthKm })}`}
                </span>
                <span className={styles.time}>{when(entry.at)}<span className={styles.ago}>{agoText(entry.at)}</span></span>
              </button>
              {expanded && (
                <div className={styles.detail}>
                  {detail === "loading" || detail === undefined ? <p>{t("loading")}</p> : detail === "failed" ? <p className={styles.error}>{t("detailFailed")}</p> : (
                    <>
                      {detail.areas.length > 0 ? detail.areas.map(group => (
                        <p key={group.intensity} className={styles.areas}>{badge(group.intensity)} <span>{(locale === "en" && group.namesEn ? group.namesEn : group.names).join(locale === "en" ? ", " : "、")}</span></p>
                      )) : <p>{t("noAreas")}</p>}
                      {detail.tsunami && <p className={styles.tsunami}>{locale === "en" && detail.tsunami.en ? detail.tsunami.en : detail.tsunami.ja}</p>}
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {!more && shown.length > SHOWN && <p className={styles.more}><button type="button" className={styles.choice} onClick={() => setMore(true)}>{t("showMore", { n: shown.length - SHOWN })}</button></p>}
      <p className={styles.updated} role="status" data-quake="updated">{updated ? t("updated", { time: when(updated) }) : ""}</p>
      <p className={controls.label}>{t("note")}</p>
      <p className={styles.credit}>{t("credit")} <a href={PAGE_URL} target="_blank" rel="noopener nofollow">{t("creditLink")}</a>{t("creditEnd")}</p>
    </ToolLayout>
  );
}
