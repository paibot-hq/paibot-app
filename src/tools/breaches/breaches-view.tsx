"use client";

import BreachesCharts from "./breaches-charts";
import BreachesDashboard, { type Pick } from "./breaches-dashboard";
import { approximate } from "./breaches-stats";
import ToolLayout from "../../components/tool-layout";

import styles from "./breaches.module.css";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "use-intl";

type Sort = "date" | "count";
type Tab = "dashboard" | "list";
type Kind = "leak" | "ransomware" | "outage" | "fraud" | "other";

const KINDS: Kind[] = ["leak", "ransomware", "outage", "fraud", "other"];
const KIND_KEYS = { leak: "typeLeak", ransomware: "typeRansomware", outage: "typeOutage", fraud: "typeFraud", other: "typeOther" } as const;

type Source = { name: string; url: string; kind: string };
type Verification = "official" | "reported" | "single";
type Origin = "attack" | "insider" | "mistake";
export type Item = { id: string; date: string; name: string; type: string; count: number | null; countNote: string; data: string; cause: string; note: string; verification: Verification; origin: Origin; originBasis?: string; checkedAt: string; sources: Source[] };
const ORIGIN_KEYS = { attack: "originAttack", insider: "originInsider", mistake: "originMistake" } as const;
const VERIFY_KEYS = { official: "verifyOfficial", reported: "verifyReported", single: "verifySingle" } as const;
// The list, as the route's loader reads it from D1 (src/data/breaches.json is its source; see docs/breaches.md).
export type Breaches = { asOf: string; note: string; items: Item[] };

export default function BreachesView({ list }: { list: Breaches }) {
  const entries = list.items;
  const first = useMemo(() => entries.reduce((min, item) => (item.date < min ? item.date : min), entries[0].date), [entries]);
  const t = useTranslations("App");
  const locale = useLocale();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [sort, setSort] = useState<Sort>("date");
  const [kind, setKind] = useState<Kind | "all">("all");
  const [query, setQuery] = useState("");
  const [verification, setVerification] = useState<Verification | "all">("all");
  const [origin, setOrigin] = useState<Origin | "all">("all");
  const statusRef = useRef<HTMLParagraphElement>(null);

  // The dashboard is the page; the list is kept in the address (?tab=list), so a link opens the list. (The old ?tab=stats opens the dashboard, where the statistics are now.)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "list") setTab("list");
  }, []);
  function choose(next: Tab) {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "list") url.searchParams.set("tab", next); else url.searchParams.delete("tab");
    window.history.replaceState(null, "", url);
  }

  // A click in the summary narrows the list to it (the other filters are cleared), opens the list and brings it into view.
  function showList(pick: Pick) {
    setKind(pick.kind ?? "all");
    setOrigin(pick.origin ?? "all");
    setVerification(pick.verification ?? "all");
    setQuery(pick.query ?? "");
    choose("list");
    requestAnimationFrame(() => statusRef.current?.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }));
  }

  const items = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return entries
      .filter(item => kind === "all" || item.type === kind)
      .filter(item => verification === "all" || item.verification === verification)
      .filter(item => origin === "all" || item.origin === origin)
      .filter(item => {
        const text = [item.name, item.countNote, item.data, item.cause, item.note].join(" ").toLowerCase();
        return words.every(word => text.includes(word));
      })
      .sort((a, b) => (sort === "date" ? b.date.localeCompare(a.date) : (b.count ?? -1) - (a.count ?? -1)));
  }, [entries, sort, kind, verification, origin, query]);

  return (
    <ToolLayout title={t("breaches.title")}>
      {/* The page explains itself in the tool header's description; the switch sits on a hairline, like the header's own tabs. */}
      <div className={styles.tabs} role="tablist" aria-label={t("breaches.mode")}>
        <button type="button" role="tab" id="breaches-tab-dashboard" aria-controls="breaches-panel-dashboard" aria-selected={tab === "dashboard"} className={styles.tab} onClick={() => choose("dashboard")} data-breaches="tab-dashboard">{t("breaches.tabDashboard")}</button>
        <button type="button" role="tab" id="breaches-tab-list" aria-controls="breaches-panel-list" aria-selected={tab === "list"} className={styles.tab} onClick={() => choose("list")} data-breaches="tab-list">{t("breaches.tabList")}</button>
      </div>
      {/* Both panels are always in the page (the one not shown is hidden), so the text of the list is there for search engines whichever tab opens. */}
      <div role="tabpanel" className={styles.panel} id="breaches-panel-dashboard" aria-labelledby="breaches-tab-dashboard" hidden={tab !== "dashboard"} data-breaches="panel-dashboard">
        <BreachesDashboard items={entries} asOf={list.asOf} onPick={showList} />
        <BreachesCharts items={entries} first={first} until={list.asOf} />
      </div>
      <div role="tabpanel" className={styles.panel} id="breaches-panel-list" aria-labelledby="breaches-tab-list" hidden={tab !== "list"} data-breaches="panel-list">
        <div className={styles.bar}>
          <input type="search" className={styles.search} value={query} onChange={event => setQuery(event.target.value)} placeholder={t("breaches.search")} aria-label={t("breaches.search")} data-breaches="query" />
          <div role="radiogroup" aria-label={t("breaches.sort")} className={styles.sort}>
            <button type="button" aria-pressed={sort === "date"} onClick={() => setSort("date")}>{t("breaches.sortDate")}</button>
            <button type="button" aria-pressed={sort === "count"} onClick={() => setSort("count")}>{t("breaches.sortCount")}</button>
          </div>
        </div>
        <div className={styles.filters} data-breaches="filters">
          <div className={styles.filterRow} role="group" aria-labelledby="filter-kind">
            <span id="filter-kind" className={styles.filterLabel}>{t("breaches.kindFilter")}</span>
            <div className={styles.kinds}>
              <button type="button" aria-pressed={kind === "all"} onClick={() => setKind("all")}>{t("breaches.typeAll")}</button>
              {KINDS.map(k => (
                <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} data-kind={k}>{t(`breaches.${KIND_KEYS[k]}`)}</button>
              ))}
            </div>
          </div>
          <div className={styles.filterRow} role="group" aria-labelledby="filter-origin">
            <span id="filter-origin" className={styles.filterLabel}>{t("breaches.originFilter")}</span>
            <div className={styles.kinds}>
              <button type="button" aria-pressed={origin === "all"} onClick={() => setOrigin("all")}>{t("breaches.originAll")}</button>
              {(Object.keys(ORIGIN_KEYS) as Origin[]).map(v => (
                <button key={v} type="button" aria-pressed={origin === v} onClick={() => setOrigin(v)} data-origin={v}>{t(`breaches.${ORIGIN_KEYS[v]}`)}</button>
              ))}
            </div>
          </div>
          <div className={styles.filterRow} role="group" aria-labelledby="filter-verify">
            <span id="filter-verify" className={styles.filterLabel}>{t("breaches.verifyFilter")}</span>
            <div className={styles.kinds}>
              <button type="button" aria-pressed={verification === "all"} onClick={() => setVerification("all")}>{t("breaches.verifyAll")}</button>
              {(Object.keys(VERIFY_KEYS) as Verification[]).map(v => (
                <button key={v} type="button" aria-pressed={verification === v} onClick={() => setVerification(v)} data-verify={v}>{t(`breaches.${VERIFY_KEYS[v]}`)}</button>
              ))}
            </div>
          </div>
          <details className={styles.help} data-breaches="help">
            <summary>{t("breaches.helpTitle")}</summary>
            <p>{t("breaches.originHelp")}</p>
            <p>{t("breaches.verifyHelp")}</p>
          </details>
        </div>
        <p className={styles.status} aria-live="polite" data-breaches="status" ref={statusRef}>
          {t("breaches.results", { count: items.length })} · {t("breaches.asOf", { date: list.asOf })}
        </p>
        {items.length === 0 && <p className={styles.status}>{t("breaches.none")}</p>}
        {/* One compact row per incident — the whole list can be scanned — and the row opens to the full entry. */}
        <ul className={styles.list}>
          {items.map(item => (
            <li key={item.id} data-breach={item.id}>
              <details className={styles.entry}>
                <summary className={styles.entryRow}>
                  <time dateTime={item.date}>{item.date}</time>
                  <h2 lang="ja"><span className={styles.entryDot} data-kind={item.type} aria-hidden="true" />{item.name}</h2>
                  <span className={styles.entryCount}>{item.count != null ? t("breaches.dashCount", { value: approximate(item.count, locale) }) : ""}</span>
                  <span className={styles.verify} data-verification={item.verification}>{t(`breaches.${VERIFY_KEYS[item.verification]}`)}</span>
                </summary>
                <div className={styles.entryBody}>
              <div className={styles.tags}>
                <span className={styles.kind} data-kind={item.type}>{t(`breaches.${KIND_KEYS[item.type as Kind]}`)}</span>
                {item.origin !== "attack" && <span className={styles.verify} data-origin-tag={item.origin}>{t(`breaches.${ORIGIN_KEYS[item.origin]}`)}</span>}
              </div>
              {item.countNote && <p className={styles.count} lang="ja">{item.countNote}</p>}
              <dl lang="ja">
                {item.data && <><dt>{t("breaches.data")}</dt><dd>{item.data}</dd></>}
                {item.cause && <><dt>{t("breaches.cause")}</dt><dd>{item.cause}</dd></>}
              </dl>
              {item.originBasis && <p className={styles.note} lang="ja" data-breaches="origin-basis">{t("breaches.originBasis")}: {item.originBasis}</p>}
              {item.note && <p className={styles.note} lang="ja">{item.note}</p>}
              <p className={styles.src}>
                {t("breaches.sourcesLabel")}:{" "}
                {item.sources.map((source, index) => (
                  <span key={source.url}>
                    {index > 0 && " / "}
                    <a href={source.url} target="_blank" rel="noopener noreferrer" lang="ja" data-source-kind={source.kind}>{source.name}</a>
                  </span>
                ))}
                {" · "}{t("breaches.checked", { date: item.checkedAt })}
              </p>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </div>
      <p className={styles.footnote}>{list.note}{locale !== "ja" && ` ${t("breaches.jaOnly")}`}</p>
      <p className={styles.footnote}>{t("breaches.tail")}</p>
      <p className={styles.footnote}>{t("breaches.advice")}</p>
    </ToolLayout>
  );
}
