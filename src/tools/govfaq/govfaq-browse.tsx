"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "use-intl";
import styles from "./govfaq-view.module.css";
import { AnswerText, Marked } from "./govfaq-parts";
import { snippet, type Faq, type Index, type Item } from "./govfaq-search";
import { embedQuestion, rank, type Vectors } from "./govfaq-semantic";

const PAGE = 20;
const EXAMPLES = ["マイナンバーカードをなくした", "年金はいつからもらえる", "児童手当の申請", "確定申告のやり方", "遺失物を届けたい", "引っ越しの手続き"];

export default function FaqBrowse({ faq, index, vectors, counts, failed }: { faq: Faq | null; index: Index | null; vectors: Vectors | null; counts: { category: number; name: string; count: number }[]; failed: boolean }) {
  const t = useTranslations("App.govfaq");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<number | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState<string | null>(null);
  const [meaning, setMeaning] = useState<{ query: string; vector: Int8Array } | null>(null);

  // The question asked last time is in the address.
  useEffect(() => { setQuery(new URLSearchParams(window.location.search).get("q") ?? ""); }, []);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (query.trim()) url.searchParams.set("q", query); else url.searchParams.delete("q");
    window.history.replaceState(null, "", url);
    setShown(PAGE);
  }, [query, category]);

  // The words are searched at once; a moment after typing stops, the question is turned into a vector and the search by meaning is merged in.
  useEffect(() => {
    const asked = query.trim();
    if (!vectors || asked.length < 2) { setMeaning(null); return; }
    let current = true;
    const timer = setTimeout(() => { embedQuestion(asked).then(vector => { if (current && vector) setMeaning({ query: asked, vector }); }); }, 500);
    return () => { current = false; clearTimeout(timer); };
  }, [query, vectors]);

  const asking = query.trim().length > 0;
  const results: Item[] = useMemo(() => {
    if (!index) return [];
    if (asking) return rank(index, query, { vectors, vector: meaning && meaning.query === query.trim() ? meaning.vector : null, category, limit: 200 }).map(hit => index.items[hit.doc]);
    return category === null ? [] : index.items.filter(item => item.category === category);
  }, [index, query, category, asking, vectors, meaning]);
  const visible = results.slice(0, shown);
  const listing = asking || category !== null;

  return (
    <>
      <div className={styles.search}>
        <input type="search" className={styles.input} value={query} lang="ja" placeholder={t("placeholder")} aria-label={t("searchLabel")} autoComplete="off" disabled={!faq && !failed} onChange={event => setQuery(event.target.value)} data-faq="query" />
        <select className={styles.select} value={category ?? ""} aria-label={t("category")} onChange={event => setCategory(event.target.value === "" ? null : Number(event.target.value))} disabled={!index} data-faq="category">
          <option value="">{t("allCategories")}</option>
          {counts.map(c => <option key={c.category} value={c.category}>{c.name}（{c.count}）</option>)}
        </select>
      </div>
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
                  <AnswerText answer={item.answer} />
                  <p className={styles.meta}>{t("itemId", { id: item.id })}</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {results.length > shown && <p className={styles.more}><button type="button" className={styles.chip} onClick={() => setShown(n => n + PAGE)}>{t("showMore", { n: results.length - shown })}</button></p>}
    </>
  );
}
