"use client";

import BreachesCharts from "./breaches-charts";
import ToolLayout from "../../components/tool-layout";
import data from "../../data/breaches.json";

import styles from "./breaches.module.css";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "use-intl";

type Sort = "date" | "count";
type Tab = "list" | "stats";
type Kind = "leak" | "ransomware" | "outage" | "fraud" | "other";

const KINDS: Kind[] = ["leak", "ransomware", "outage", "fraud", "other"];
const KIND_KEYS = { leak: "typeLeak", ransomware: "typeRansomware", outage: "typeOutage", fraud: "typeFraud", other: "typeOther" } as const;

type Source = { name: string; url: string; kind: string };
type Verification = "official" | "reported" | "single";
type Origin = "attack" | "insider" | "mistake";
type Item = { id: string; date: string; name: string; type: string; count: number | null; countNote: string; data: string; cause: string; note: string; verification: Verification; origin: Origin; originBasis?: string; checkedAt: string; sources: Source[] };
const ORIGIN_KEYS = { attack: "originAttack", insider: "originInsider", mistake: "originMistake" } as const;
const VERIFY_KEYS = { official: "verifyOfficial", reported: "verifyReported", single: "verifySingle" } as const;
const ITEMS = data.items as Item[];
type Advisory = { date: string; name: string; title: string; url: string };
const ADVISORIES = ((data as { advisories?: Advisory[] }).advisories ?? []) as Advisory[];
const FIRST = ITEMS.reduce((min, item) => (item.date < min ? item.date : min), ITEMS[0].date);

export default function BreachesView() {
  const t = useTranslations("App");
  const locale = useLocale();
  const [tab, setTab] = useState<Tab>("list");
  const [sort, setSort] = useState<Sort>("date");
  const [kind, setKind] = useState<Kind | "all">("all");
  const [query, setQuery] = useState("");
  const [verification, setVerification] = useState<Verification | "all">("all");
  const [origin, setOrigin] = useState<Origin | "all">("all");

  // The tab is kept in the address (?tab=stats), so a link opens the statistics.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "stats") setTab("stats");
  }, []);
  function choose(next: Tab) {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "stats") url.searchParams.set("tab", next); else url.searchParams.delete("tab");
    window.history.replaceState(null, "", url);
  }

  const items = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return ITEMS
      .filter(item => kind === "all" || item.type === kind)
      .filter(item => verification === "all" || item.verification === verification)
      .filter(item => origin === "all" || item.origin === origin)
      .filter(item => {
        const text = [item.name, item.countNote, item.data, item.cause, item.note].join(" ").toLowerCase();
        return words.every(word => text.includes(word));
      })
      .sort((a, b) => (sort === "date" ? b.date.localeCompare(a.date) : (b.count ?? -1) - (a.count ?? -1)));
  }, [sort, kind, verification, origin, query]);
  const max = Math.max(...ITEMS.map(item => item.count ?? 0));

  return (
    <ToolLayout title={t("breaches.title")}>
      <p className={styles.intro}>{t("breaches.intro")}</p>
      <div className={styles.tabs} role="tablist" aria-label={t("breaches.mode")}>
        <button type="button" role="tab" aria-selected={tab === "list"} className={styles.tab} onClick={() => choose("list")} data-breaches="tab-list">{t("breaches.tabList")}</button>
        <button type="button" role="tab" aria-selected={tab === "stats"} className={styles.tab} onClick={() => choose("stats")} data-breaches="tab-stats">{t("breaches.tabStats")}</button>
      </div>
      <div className={styles.bar}>
        <input type="search" className={styles.search} value={query} onChange={event => setQuery(event.target.value)} placeholder={t("breaches.search")} aria-label={t("breaches.search")} data-breaches="query" />
        {tab === "list" && <div role="radiogroup" aria-label={t("breaches.sort")} className={styles.sort}>
          <button type="button" aria-pressed={sort === "date"} onClick={() => setSort("date")}>{t("breaches.sortDate")}</button>
          <button type="button" aria-pressed={sort === "count"} onClick={() => setSort("count")}>{t("breaches.sortCount")}</button>
        </div>}
      </div>
      <div className={styles.kinds}>
        <button type="button" aria-pressed={kind === "all"} onClick={() => setKind("all")}>{t("breaches.typeAll")}</button>
        {KINDS.map(k => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} data-kind={k}>{t(`breaches.${KIND_KEYS[k]}`)}</button>
        ))}
      </div>
      <div className={styles.kinds} role="group" aria-label={t("breaches.verifyFilter")}>
        <button type="button" aria-pressed={verification === "all"} onClick={() => setVerification("all")}>{t("breaches.verifyAll")}</button>
        {(Object.keys(VERIFY_KEYS) as Verification[]).map(v => (
          <button key={v} type="button" aria-pressed={verification === v} onClick={() => setVerification(v)} data-verify={v}>{t(`breaches.${VERIFY_KEYS[v]}`)}</button>
        ))}
      </div>
      <p className={styles.status}>{t("breaches.verifyHelp")}</p>
      <div className={styles.kinds} role="group" aria-label={t("breaches.originFilter")}>
        <button type="button" aria-pressed={origin === "all"} onClick={() => setOrigin("all")}>{t("breaches.originAll")}</button>
        {(Object.keys(ORIGIN_KEYS) as Origin[]).map(v => (
          <button key={v} type="button" aria-pressed={origin === v} onClick={() => setOrigin(v)} data-origin={v}>{t(`breaches.${ORIGIN_KEYS[v]}`)}</button>
        ))}
      </div>
      <p className={styles.status}>{t("breaches.originHelp")}</p>
      <p className={styles.status} aria-live="polite" data-breaches="status">
        {t("breaches.results", { count: items.length })} · {t("breaches.asOf", { date: data.asOf })}
      </p>
      {items.length === 0 && <p className={styles.status}>{t("breaches.none")}</p>}
      {tab === "stats" && <BreachesCharts items={items} first={FIRST} until={data.asOf} />}
      {tab === "list" && ADVISORIES.length > 0 && kind === "all" && verification === "all" && origin === "all" && !query.trim() && (
        <section className={styles.advisories} data-breaches="advisories" aria-label={t("breaches.advisoriesTitle")}>
          <h2>{t("breaches.advisoriesTitle")}</h2>
          <ul>
            {ADVISORIES.map(advisory => (
              <li key={advisory.url}>
                <time dateTime={advisory.date}>{advisory.date}</time>
                <a href={advisory.url} target="_blank" rel="noopener noreferrer" lang="ja"><strong>{advisory.name}</strong> {advisory.title}</a>
              </li>
            ))}
          </ul>
        </section>
      )}
      {tab === "list" && <ul className={styles.list}>
        {items.map(item => (
          <li key={item.id} className={styles.card} data-breach={item.id}>
            <div className={styles.head}>
              <h2 lang="ja">{item.name}</h2>
              <time dateTime={item.date}>{item.date}</time>
            </div>
            <div className={styles.tags}>
              <span className={styles.kind} data-kind={item.type}>{t(`breaches.${KIND_KEYS[item.type as Kind]}`)}</span>
              <span className={styles.verify} data-verification={item.verification}>{t(`breaches.${VERIFY_KEYS[item.verification]}`)}</span>
              {item.origin !== "attack" && <span className={styles.verify} data-origin-tag={item.origin}>{t(`breaches.${ORIGIN_KEYS[item.origin]}`)}</span>}
            </div>
            {item.count != null && <div className={styles.meter} aria-hidden="true"><span style={{ width: `${Math.max(1, (item.count / max) * 100)}%` }} /></div>}
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
          </li>
        ))}
      </ul>}
      <p className={styles.footnote}>{data.note}{locale !== "ja" && ` ${t("breaches.jaOnly")}`}</p>
      <p className={styles.footnote}>{t("breaches.tail")}</p>
      <p className={styles.footnote}>{t("breaches.advice")}</p>
    </ToolLayout>
  );
}
