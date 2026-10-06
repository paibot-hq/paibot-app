"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import styles from "./faq-view.module.css";
import { buildIndex, categoryCounts, highlight, parseAnswer, search, snippet, toItems, type Faq, type Index, type Item } from "./faq-search";

const PAGE = 20;
const EXAMPLES = ["マイナンバーカードをなくした", "年金はいつからもらえる", "児童手当の申請", "確定申告のやり方", "遺失物を届けたい", "引っ越しの手続き"];

// The text with the parts that match the query marked.
function Marked({ text, query }: { text: string; query: string }) {
  const chars = [...text];
  const parts: React.ReactNode[] = [];
  let last = 0;
  highlight(text, query).forEach(([a, b], i) => {
    if (a > last) parts.push(<Fragment key={`t${i}`}>{chars.slice(last, a).join("")}</Fragment>);
    parts.push(<mark key={`m${i}`}>{chars.slice(a, b).join("")}</mark>);
    last = b;
  });
  if (last < chars.length) parts.push(<Fragment key="rest">{chars.slice(last).join("")}</Fragment>);
  return <>{parts}</>;
}

export default function Faqs() {
  const t = useTranslations("App.faq");
  const [faq, setFaq] = useState<Faq | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<number | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState<string | null>(null);

  // The FAQ (about 3 MB) is loaded when this page is opened, not with the rest of the site; the question asked last time is in the address.
  useEffect(() => {
    setQuery(new URLSearchParams(window.location.search).get("q") ?? "");
    // Only the browser reads the FAQ: this keeps it out of the server's bundle (the Worker's size is limited).
    if (import.meta.env.SSR) return;
    import("../../data/faq.json").then(module => setFaq(module.default as unknown as Faq)).catch(() => setFailed(true));
  }, []);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (query.trim()) url.searchParams.set("q", query); else url.searchParams.delete("q");
    window.history.replaceState(null, "", url);
    setShown(PAGE);
  }, [query, category]);

  const index: Index | null = useMemo(() => (faq ? buildIndex(toItems(faq), faq.categories) : null), [faq]);
  const counts = useMemo(() => (index ? categoryCounts(index.items, index.categories) : []), [index]);

  const asking = query.trim().length > 0;
  const results: Item[] = useMemo(() => {
    if (!index) return [];
    if (asking) return search(index, query, { category, limit: 200 }).map(hit => index.items[hit.doc]);
    return category === null ? [] : index.items.filter(item => item.category === category);
  }, [index, query, category, asking]);
  const visible = results.slice(0, shown);
  const listing = asking || category !== null;

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      {failed && <p className={styles.error} role="alert">{t("loadFailed")}</p>}
      <div className={styles.search}>
        <input type="search" className={styles.input} value={query} lang="ja" placeholder={t("placeholder")} aria-label={t("searchLabel")} autoComplete="off" disabled={!faq && !failed} onChange={event => setQuery(event.target.value)} data-faq="query" />
        <select className={styles.select} value={category ?? ""} aria-label={t("category")} onChange={event => setCategory(event.target.value === "" ? null : Number(event.target.value))} disabled={!index} data-faq="category">
          <option value="">{t("allCategories")}</option>
          {counts.map(c => <option key={c.category} value={c.category}>{c.name}（{c.count}）</option>)}
        </select>
      </div>
      {!faq && !failed && <p className={styles.status} role="status">{t("loading")}</p>}
      {faq && !listing && (
        <section className={styles.examples} aria-label={t("examples")}>
          <p>{t("examples")}</p>
          <div className={styles.chips}>
            {EXAMPLES.map(example => <button key={example} type="button" className={styles.chip} lang="ja" onClick={() => setQuery(example)}>{example}</button>)}
          </div>
          <p className={styles.small}>{t("count", { n: index?.items.length ?? 0, categories: counts.length })}</p>
        </section>
      )}
      {faq && listing && (
        <p className={styles.status} role="status" data-faq="status">
          {results.length === 0 ? t("none") : t("results", { n: results.length })}
        </p>
      )}
      {faq && listing && results.length === 0 && asking && <p className={styles.hint}>{t("noneHint")}</p>}
      <ul className={styles.list} data-faq="list">
        {visible.map(item => {
          const expanded = open === item.id;
          return (
            <li key={item.id} className={styles.item} data-faq-id={item.id} data-open={expanded}>
              <button type="button" className={styles.head} aria-expanded={expanded} onClick={() => setOpen(expanded ? null : item.id)}>
                <span className={styles.tag}>{faq?.categories[item.category]}</span>
                <span className={styles.question} lang="ja">{asking ? <Marked text={item.question} query={query} /> : item.question}</span>
                {!expanded && <span className={styles.snippet} lang="ja">{snippet(item.answer)}</span>}
              </button>
              {expanded && (
                <div className={styles.answer} lang="ja" data-faq="answer">
                  {parseAnswer(item.answer).map((part, i) => "text" in part
                    ? <Fragment key={i}>{part.text}</Fragment>
                    : <a key={i} href={part.url} target="_blank" rel="noopener noreferrer nofollow">{part.label}</a>)}
                  <p className={styles.meta}>{t("itemId", { id: item.id })}</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {results.length > shown && <p className={styles.more}><button type="button" className={styles.chip} onClick={() => setShown(n => n + PAGE)}>{t("showMore", { n: results.length - shown })}</button></p>}
      <p className={controls.label}>{t("note")}</p>
      {faq && (
        <p className={styles.credit} data-faq="credit">
          {t("credit")} <a href={faq.source.page} target="_blank" rel="noopener nofollow" lang="ja">{t("creditLink")}</a>{t("creditEnd", { date: faq.source.updated })}
        </p>
      )}
    </ToolLayout>
  );
}
