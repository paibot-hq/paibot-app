"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import ToolAbout from "../../components/tool-about";
import { APP_CATALOG } from "../../lib/app-catalog";
import controls from "../../components/tool-controls.module.css";
import styles from "./govfaq-view.module.css";
import FaqBrowse from "./govfaq-browse";
import FaqChat from "./govfaq-chat";
import { buildIndex, categoryCounts, toItems, type Faq, type Index } from "./govfaq-search";
import { loadVectors, type Vectors } from "./govfaq-semantic";

type Tab = "chat" | "list" | "info";

const about = APP_CATALOG.find(app => app.slug === "govfaq");

export default function Faqs() {
  const t = useTranslations("App.govfaq");
  const [faq, setFaq] = useState<Faq | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<Tab>("chat");
  const [vectors, setVectors] = useState<Vectors | null>(null);

  // The FAQ (about 3 MB) is loaded when this page is opened, not with the rest of the site. A search in the address (?q=) opens the list.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "info") setTab("info");
    else if (params.get("tab") === "list" || params.get("q")) setTab("list");
    // Only the browser reads the FAQ: this keeps it out of the server's bundle (the Worker's size is limited).
    if (import.meta.env.SSR) return;
    import("../../data/govfaq.json").then(module => setFaq(module.default as unknown as Faq)).catch(() => setFailed(true));
  }, []);
  function choose(next: Tab) {
    setTab(next);
    const url = new URL(window.location.href);
    if (next !== "chat") url.searchParams.set("tab", next); else { url.searchParams.delete("tab"); url.searchParams.delete("q"); }
    window.history.replaceState(null, "", url);
  }

  const index: Index | null = useMemo(() => (faq ? buildIndex(toItems(faq), faq.categories) : null), [faq]);
  // The vectors for the search by meaning (about 4.7 MB) come after the FAQ, in the background; until they are here (or when they are not), the search by words is used.
  useEffect(() => {
    if (!index) return;
    let current = true;
    loadVectors(index.items).then(loaded => { if (current) setVectors(loaded); });
    return () => { current = false; };
  }, [index]);
  const counts = useMemo(() => (index ? categoryCounts(index.items, index.categories) : []), [index]);

  return (
    <ToolLayout title={t("title")} about={false}>
      <p className={controls.label}>{t("intro")}</p>
      <div className={styles.tabs} role="tablist" aria-label={t("mode")}>
        <button type="button" role="tab" aria-selected={tab === "chat"} className={styles.tab} onClick={() => choose("chat")} data-faq="tab-chat">{t("tabChat")}</button>
        <button type="button" role="tab" aria-selected={tab === "list"} className={styles.tab} onClick={() => choose("list")} data-faq="tab-list">{t("tabList")}</button>
        <button type="button" role="tab" aria-selected={tab === "info"} className={styles.tab} onClick={() => choose("info")} data-faq="tab-info">{t("tabInfo")}</button>
      </div>
      {failed && <p className={styles.error} role="alert">{t("loadFailed")}</p>}
      {!faq && !failed && <p className={styles.status} role="status">{t("loading")}</p>}
      {/* The chat stays mounted behind the other tabs, so a conversation is not lost by looking at the notes. */}
      <div hidden={tab !== "chat"}><FaqChat faq={faq} index={index} vectors={vectors} /></div>
      {tab === "list" && <FaqBrowse faq={faq} index={index} vectors={vectors} counts={counts} failed={false} />}
      {/* The notes, the source and the text about the tool are in a tab of their own; they stay in the page behind the other tabs (search engines read them). */}
      <section className={styles.info} hidden={tab !== "info"} aria-label={t("tabInfo")} data-faq="info">
        <p className={controls.label}>{t("note")}</p>
        {faq && (
          <p className={styles.credit} data-faq="credit">
            {t("credit")} <a href={faq.source.page} target="_blank" rel="noopener nofollow" lang="ja">{t("creditLink")}</a>{t("creditEnd", { date: faq.source.updated })}
          </p>
        )}
        {vectors && <p className={styles.small} data-faq="semantic">{t("semanticOn")}</p>}
        {about && <ToolAbout app={about} />}
      </section>
    </ToolLayout>
  );
}
