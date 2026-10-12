"use client";

import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";

import styles from "./char-count.module.css";
import { countText, limitStatus, parseLimit } from "./count";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "use-intl";

type Target = "characters" | "withoutSpaces";

export default function CharCount() {
  const t = useTranslations("App");
  const [text, setText] = useState("");
  const [limitText, setLimitText] = useState("");
  const [target, setTarget] = useState<Target>("characters");
  const [ready, setReady] = useState(false);
  // SSR displays the tool before React attaches its input handler.
  useEffect(() => { setReady(true); }, []);
  const stats = useMemo(() => countText(text), [text]);
  const limit = parseLimit(limitText);
  const status = limitStatus(stats[target], limit);
  const limitMessage = status.state === "left" ? t("wc.remaining", { n: status.amount })
    : status.state === "reached" ? t("wc.reached")
    : status.state === "over" ? t("wc.over", { n: status.amount }) : "";
  return (
    <ToolLayout title={t("wc.title")}>
      <div className={styles["wc-counts"]}>
        <div className={styles["wc-card"]}>
          <p className={controls.label}>{t("wc.countLabel")}</p>
          <p className={styles["wc-count"]} aria-live="polite" data-wc="characters">{stats.characters}</p>
        </div>
        <div className={styles["wc-card"]}>
          <p className={controls.label}>{t("wc.noSpaceLabel")}</p>
          <p className={`${styles["wc-count"]} ${styles["wc-count-sub"]}`} aria-live="polite" data-wc="without-spaces">{stats.withoutSpaces}</p>
        </div>
      </div>
      <textarea
        disabled={!ready}
        className={styles["wc-input"]}
        value={text}
        onChange={event => setText(event.target.value)}
        placeholder={t("wc.placeholder")}
        aria-label={t("wc.title")}
      />
      <div className={styles["wc-limit"]}>
        <label className={styles["wc-field"]}>
          <span className={controls.fieldLabel}>{t("wc.limitLabel")}</span>
          <input
            type="text"
            inputMode="numeric"
            disabled={!ready}
            className={styles["wc-limit-input"]}
            value={limitText}
            onChange={event => setLimitText(event.target.value)}
            placeholder={t("wc.limitPlaceholder")}
          />
        </label>
        <label className={styles["wc-field"]}>
          <span className={controls.fieldLabel}>{t("wc.limitTarget")}</span>
          <select disabled={!ready} className={styles["wc-select"]} value={target} onChange={event => setTarget(event.target.value as Target)}>
            <option value="characters">{t("wc.countLabel")}</option>
            <option value="withoutSpaces">{t("wc.noSpaceLabel")}</option>
          </select>
        </label>
        <p className={styles["wc-limit-status"]} data-state={status.state} data-wc="limit" aria-live="polite">{limitMessage}</p>
      </div>
      <details className={styles["wc-details"]}>
        <summary>{t("wc.detailsTitle")}</summary>
        <dl className={styles["wc-dl"]}>
          <dt>{t("wc.codePoints")}</dt><dd data-wc="code-points">{stats.codePoints}</dd>
          <dt>{t("wc.utf16")}</dt><dd data-wc="utf16">{stats.utf16}</dd>
          <dt>{t("wc.utf8")}</dt><dd data-wc="utf8">{stats.utf8}</dd>
        </dl>
        <p className={styles["wc-note"]}>{t("wc.detailsNote")}</p>
      </details>
    </ToolLayout>
  );
}
