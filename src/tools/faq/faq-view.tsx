"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import styles from "./faq-view.module.css";
import FaqBrowse from "./faq-browse";
import FaqChat from "./faq-chat";
import { buildIndex, categoryCounts, toItems, type Faq, type Index } from "./faq-search";

type Tab = "chat" | "list";

export default function Faqs() {
  const t = useTranslations("App.faq");
  const [faq, setFaq] = useState<Faq | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<Tab>("chat");

  // The FAQ (about 3 MB) is loaded when this page is opened, not with the rest of the site. A search in the address (?q=) opens the list.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "list" || params.get("q")) setTab("list");
    // Only the browser reads the FAQ: this keeps it out of the server's bundle (the Worker's size is limited).
    if (import.meta.env.SSR) return;
    import("../../data/faq.json").then(module => setFaq(module.default as unknown as Faq)).catch(() => setFailed(true));
  }, []);
  function choose(next: Tab) {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "list") url.searchParams.set("tab", "list"); else { url.searchParams.delete("tab"); url.searchParams.delete("q"); }
    window.history.replaceState(null, "", url);
  }

  const index: Index | null = useMemo(() => (faq ? buildIndex(toItems(faq), faq.categories) : null), [faq]);
  const counts = useMemo(() => (index ? categoryCounts(index.items, index.categories) : []), [index]);

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <div className={styles.tabs} role="tablist" aria-label={t("mode")}>
        <button type="button" role="tab" aria-selected={tab === "chat"} className={styles.tab} onClick={() => choose("chat")} data-faq="tab-chat">{t("tabChat")}</button>
        <button type="button" role="tab" aria-selected={tab === "list"} className={styles.tab} onClick={() => choose("list")} data-faq="tab-list">{t("tabList")}</button>
      </div>
      {failed && <p className={styles.error} role="alert">{t("loadFailed")}</p>}
      {!faq && !failed && <p className={styles.status} role="status">{t("loading")}</p>}
      {tab === "chat" ? <FaqChat faq={faq} index={index} /> : <FaqBrowse faq={faq} index={index} counts={counts} failed={false} />}
      <p className={controls.label}>{t("note")}</p>
      {faq && (
        <p className={styles.credit} data-faq="credit">
          {t("credit")} <a href={faq.source.page} target="_blank" rel="noopener nofollow" lang="ja">{t("creditLink")}</a>{t("creditEnd", { date: faq.source.updated })}
        </p>
      )}
    </ToolLayout>
  );
}
