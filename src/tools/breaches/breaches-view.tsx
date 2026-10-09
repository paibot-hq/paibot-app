"use client";

import ToolLayout from "../../components/tool-layout";
import data from "../../data/breaches.json";

import styles from "./breaches.module.css";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "use-intl";

type Sort = "date" | "count";
type Kind = "leak" | "ransomware" | "outage" | "fraud" | "other";

const KINDS: Kind[] = ["leak", "ransomware", "outage", "fraud", "other"];
const KIND_KEYS = { leak: "typeLeak", ransomware: "typeRansomware", outage: "typeOutage", fraud: "typeFraud", other: "typeOther" } as const;

type Item = { id: string; date: string; name: string; type: string; count: number | null; countNote: string; data: string; cause: string; note: string; source: string; url: string };
const ITEMS = data.items as Item[];

export default function BreachesView() {
  const t = useTranslations("App");
  const locale = useLocale();
  const [sort, setSort] = useState<Sort>("date");
  const [kind, setKind] = useState<Kind | "all">("all");
  const [query, setQuery] = useState("");

  const items = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return ITEMS
      .filter(item => kind === "all" || item.type === kind)
      .filter(item => {
        const text = [item.name, item.countNote, item.data, item.cause, item.note].join(" ").toLowerCase();
        return words.every(word => text.includes(word));
      })
      .sort((a, b) => (sort === "date" ? b.date.localeCompare(a.date) : (b.count ?? -1) - (a.count ?? -1)));
  }, [sort, kind, query]);
  const max = Math.max(...ITEMS.map(item => item.count ?? 0));

  return (
    <ToolLayout title={t("breaches.title")}>
      <p className={styles.intro}>{t("breaches.intro")}</p>
      <div className={styles.bar}>
        <input type="search" className={styles.search} value={query} onChange={event => setQuery(event.target.value)} placeholder={t("breaches.search")} aria-label={t("breaches.search")} data-breaches="query" />
        <div role="radiogroup" aria-label={t("breaches.sort")} className={styles.sort}>
          <button type="button" aria-pressed={sort === "date"} onClick={() => setSort("date")}>{t("breaches.sortDate")}</button>
          <button type="button" aria-pressed={sort === "count"} onClick={() => setSort("count")}>{t("breaches.sortCount")}</button>
        </div>
      </div>
      <div className={styles.kinds}>
        <button type="button" aria-pressed={kind === "all"} onClick={() => setKind("all")}>{t("breaches.typeAll")}</button>
        {KINDS.map(k => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} data-kind={k}>{t(`breaches.${KIND_KEYS[k]}`)}</button>
        ))}
      </div>
      <p className={styles.status} aria-live="polite" data-breaches="status">
        {t("breaches.results", { count: items.length })} · {t("breaches.asOf", { date: data.asOf })}
      </p>
      {items.length === 0 && <p className={styles.status}>{t("breaches.none")}</p>}
      <ul className={styles.list}>
        {items.map(item => (
          <li key={item.id} className={styles.card} data-breach={item.id}>
            <div className={styles.head}>
              <h2 lang="ja">{item.name}</h2>
              <time dateTime={item.date}>{item.date}</time>
            </div>
            <span className={styles.kind} data-kind={item.type}>{t(`breaches.${KIND_KEYS[item.type as Kind]}`)}</span>
            {item.count != null && <div className={styles.meter} aria-hidden="true"><span style={{ width: `${Math.max(1, (item.count / max) * 100)}%` }} /></div>}
            {item.countNote && <p className={styles.count} lang="ja">{item.countNote}</p>}
            <dl lang="ja">
              {item.data && <><dt>{t("breaches.data")}</dt><dd>{item.data}</dd></>}
              {item.cause && <><dt>{t("breaches.cause")}</dt><dd>{item.cause}</dd></>}
            </dl>
            {item.note && <p className={styles.note} lang="ja">{item.note}</p>}
            <p className={styles.src}>
              {item.url
                ? <a href={item.url} target="_blank" rel="noopener noreferrer">{t("breaches.source")}: <span lang="ja">{item.source}</span></a>
                : <span>{t("breaches.source")}: <span lang="ja">{item.source}</span></span>}
            </p>
          </li>
        ))}
      </ul>
      <p className={styles.footnote}>{data.note}{locale !== "ja" && ` ${t("breaches.jaOnly")}`}</p>
      <p className={styles.footnote}>{t("breaches.tail")}</p>
      <p className={styles.footnote}>{t("breaches.advice")}</p>
    </ToolLayout>
  );
}
