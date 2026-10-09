"use client";

import ToolLayout from "../../components/tool-layout";
import data from "../../data/breaches.json";

import styles from "./breaches.module.css";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "use-intl";

type Sort = "date" | "count";

export default function BreachesView() {
  const t = useTranslations("App");
  const locale = useLocale();
  const [sort, setSort] = useState<Sort>("date");

  const items = useMemo(
    () => [...data.items].sort((a, b) => (sort === "date" ? b.date.localeCompare(a.date) : b.count - a.count)),
    [sort],
  );
  const max = Math.max(...data.items.map(item => item.count));

  return (
    <ToolLayout title={t("breaches.title")}>
      <p className={styles.intro}>{t("breaches.intro")}</p>
      <div className={styles.bar}>
        <span>{t("breaches.asOf", { date: data.asOf })}</span>
        <div role="radiogroup" aria-label={t("breaches.sort")} className={styles.sort}>
          <button type="button" aria-pressed={sort === "date"} onClick={() => setSort("date")}>{t("breaches.sortDate")}</button>
          <button type="button" aria-pressed={sort === "count"} onClick={() => setSort("count")}>{t("breaches.sortCount")}</button>
        </div>
      </div>
      <ul className={styles.list}>
        {items.map(item => (
          <li key={item.id} className={styles.card} data-breach={item.id}>
            <div className={styles.head}>
              <h2 lang="ja">{item.name}</h2>
              <time dateTime={item.date}>{item.date}</time>
            </div>
            <div className={styles.meter} aria-hidden="true"><span style={{ width: `${Math.max(1, (item.count / max) * 100)}%` }} /></div>
            <p className={styles.count} lang="ja">{item.countNote}</p>
            <dl lang="ja">
              <dt>{t("breaches.data")}</dt><dd>{item.data}</dd>
              <dt>{t("breaches.cause")}</dt><dd>{item.cause}</dd>
            </dl>
            {item.note && <p className={styles.note} lang="ja">{item.note}</p>}
            <a href={item.url} target="_blank" rel="noopener noreferrer">{t("breaches.source")}</a>
          </li>
        ))}
      </ul>
      <p className={styles.footnote}>{data.note}{locale !== "ja" && ` ${t("breaches.jaOnly")}`}</p>
      <p className={styles.footnote}>{t("breaches.advice")}</p>
    </ToolLayout>
  );
}
