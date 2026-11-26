"use client";

import { TreemapChart, useWidth } from "./breaches-charts";
import { approximate, attention, KINDS, percent, severity, summarize, type Kind, type SummaryItem } from "./breaches-stats";

import styles from "./breaches-dashboard.module.css";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "use-intl";

// Counts the number up from zero once, on the first client render; the server and anyone who prefers reduced motion get the final value at once.
function useCountUp(value: number): number {
  const [shown, setShown] = useState(value);
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(value); return; }
    ran.current = true;
    const started = performance.now(), duration = 700;
    let frame = requestAnimationFrame(function tick(now) {
      const eased = 1 - (1 - Math.min(1, (now - started) / duration)) ** 3;
      setShown(Math.round(value * eased));
      if (eased < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return shown;
}

function KpiValue({ value, id, className }: { value: number; id: string; className: string }) {
  return <strong className={className} data-dash={id}>{useCountUp(value)}</strong>;
}

const KIND_KEYS = { leak: "typeLeak", ransomware: "typeRansomware", outage: "typeOutage", fraud: "typeFraud", other: "typeOther" } as const;
const ORIGIN_KEYS = { attack: "originAttack", insider: "originInsider", mistake: "originMistake" } as const;
const VERIFY_KEYS = { official: "verifyOfficial", reported: "verifyReported", single: "verifySingle" } as const;
type Origin = keyof typeof ORIGIN_KEYS;
type Verification = keyof typeof VERIFY_KEYS;

// What a click on the summary narrows the list to; the rest of the filters are cleared.
export type Pick = { kind?: Kind; origin?: Origin; verification?: Verification; query?: string };

type Row = { key: string; label: string; count: number; pick: Pick; kind?: Kind };

// The summary at the top of the page: the numbers that say how things stand, how the list divides, and the largest and the newest. It always shows the
// whole list (the filters below narrow the list and the charts, not this), and everything in it is a way into the list.
export default function BreachesDashboard({ items, asOf, onPick }: { items: SummaryItem[]; asOf: string; onPick: (pick: Pick) => void }) {
  const t = useTranslations("App");
  const locale = useLocale();
  const s = useMemo(() => summarize(items, asOf), [items, asOf]);
  const attack = s.byOrigin.attack ?? 0;
  const official = s.byVerification.official ?? 0;
  const size = (value: number) => t("breaches.dashCount", { value: approximate(value, locale) });

  const groups: { id: string; title: string; rows: Row[] }[] = [
    { id: "kind", title: t("breaches.dashByKind"), rows: KINDS.map(k => ({ key: k, kind: k, label: t(`breaches.${KIND_KEYS[k]}`), count: s.byKind[k], pick: { kind: k } })) },
    { id: "origin", title: t("breaches.dashByOrigin"), rows: (Object.keys(ORIGIN_KEYS) as Origin[]).map(v => ({ key: v, label: t(`breaches.${ORIGIN_KEYS[v]}`), count: s.byOrigin[v] ?? 0, pick: { origin: v } })) },
    { id: "verify", title: t("breaches.dashByVerify"), rows: (Object.keys(VERIFY_KEYS) as Verification[]).map(v => ({ key: v, label: t(`breaches.${VERIFY_KEYS[v]}`), count: s.byVerification[v] ?? 0, pick: { verification: v } })) },
  ];
  const kpis = [
    { id: "total", label: t("breaches.dashTotal"), value: s.total, sub: t("breaches.asOf", { date: asOf }) },
    { id: "attack", label: t("breaches.originAttack"), value: attack, sub: `${percent(attack, s.total)}%` },
    { id: "official", label: t("breaches.verifyOfficial"), value: official, sub: `${percent(official, s.total)}%` },
    { id: "big", label: t("breaches.dashBig"), value: s.big, sub: t("breaches.dashBigSub", { count: s.withCount }) },
    { id: "recent", label: t("breaches.dashRecent"), value: s.recent, sub: t("breaches.dashRecentSub") },
  ];

  const heroes = useMemo(() => attention(items, asOf), [items, asOf]);
  const [mapRef, mapWidth] = useWidth();

  return (
    <section className={styles.dash} aria-labelledby="breaches-dash-title" data-dash="root">
      <h2 id="breaches-dash-title" className={styles.title}>{t("breaches.dashTitle")}</h2>
      <p className={styles.hint}>{t("breaches.dashHint")}</p>
      {heroes.length > 0 && (
        <div className={styles.heroBlock}>
          <h3 className={styles.heroTitle}>{t("breaches.heroTitle")}<span>{t("breaches.heroSub")}</span></h3>
          <div className={styles.hero} data-dash="hero">
            {heroes.map((item, index) => {
              const tier = severity(item.count);
              return (
                <button
                  key={item.id} type="button" className={index === 0 ? `${styles.heroCard} ${styles.heroLead}` : styles.heroCard}
                  data-severity={tier ?? undefined} onClick={() => onPick({ query: item.name })} data-dash-hero={item.id}
                >
                  <span className={styles.heroBadge}>
                    {tier && <strong data-severity={tier}>{t(tier === "critical" ? "breaches.heroCritical" : "breaches.heroSerious")}</strong>}
                    <time dateTime={item.date}>{item.date}</time>
                  </span>
                  <strong className={styles.heroCount}>{size(item.count)}</strong>
                  <span className={styles.heroName} lang="ja">{item.name}</span>
                  <span className={styles.heroKind}><span className={styles.dot} data-dash-kind={item.type} aria-hidden="true" />{t(`breaches.${KIND_KEYS[item.type as Kind]}`)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className={styles.kpis}>
        {kpis.map(kpi => (
          <div key={kpi.id} className={styles.kpi}>
            <span className={styles.kpiLabel}>{kpi.label}</span>
            <KpiValue className={styles.kpiValue} id={kpi.id} value={kpi.value} />
            <span className={styles.kpiSub}>{kpi.sub}</span>
          </div>
        ))}
      </div>
      <div className={styles.map} ref={mapRef}>
        <h3 className={styles.mapTitle}>{t("breaches.chartTreemap")}</h3>
        <p className={styles.mapHelp}>{t("breaches.chartTreemapHelp")}</p>
        <TreemapChart items={items} width={mapWidth} />
      </div>
      <div className={styles.groups}>
        {groups.map(group => (
          <div key={group.id} className={styles.group}>
            <h3>{group.title}</h3>
            <ul>
              {group.rows.map(row => (
                <li key={row.key}>
                  <button type="button" className={styles.row} onClick={() => onPick(row.pick)} disabled={row.count === 0} data-dash-row={`${group.id}:${row.key}`}>
                    <span className={styles.rowHead}>
                      {row.kind && <span className={styles.dot} data-dash-kind={row.kind} aria-hidden="true" />}
                      <span className={styles.rowLabel}>{row.label}</span>
                      <strong className={styles.rowCount}>{row.count}</strong>
                      <span className={styles.rowPct}>{percent(row.count, s.total)}%</span>
                    </span>
                    <span className={styles.bar} aria-hidden="true"><span data-dash-kind={row.kind} style={{ width: `${row.count ? Math.max(2, (row.count / s.total) * 100) : 0}%` }} /></span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className={styles.lists}>
        <div className={styles.group}>
          <h3>{t("breaches.dashLargest")}</h3>
          <ol>
            {s.largest.map(item => (
              <li key={item.id}>
                <button type="button" className={styles.item} onClick={() => onPick({ query: item.name })} data-dash-item={item.id}>
                  <span className={styles.itemName} lang="ja">{item.name}</span>
                  <span className={styles.itemMeta}><strong>{size(item.count as number)}</strong><time dateTime={item.date}>{item.date}</time></span>
                </button>
              </li>
            ))}
          </ol>
        </div>
        <div className={styles.group}>
          <h3>{t("breaches.dashLatest")}</h3>
          <ol>
            {s.latest.map(item => (
              <li key={item.id}>
                <button type="button" className={styles.item} onClick={() => onPick({ query: item.name })} data-dash-item={item.id}>
                  <span className={styles.itemName} lang="ja">{item.name}</span>
                  <span className={styles.itemMeta}><span className={styles.itemKind}><span className={styles.dot} data-dash-kind={item.type} aria-hidden="true" />{t(`breaches.${KIND_KEYS[item.type as Kind]}`)}</span><time dateTime={item.date}>{item.date}</time></span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <p className={styles.note}>{t("breaches.dashNote")}</p>
    </section>
  );
}
