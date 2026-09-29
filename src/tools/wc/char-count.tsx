"use client";

import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";

import styles from "./char-count.module.css";

import { useEffect, useState } from "react";
import { useTranslations } from "use-intl";

export default function CharCount() {
  const t = useTranslations("App");
  const [text, setText] = useState("");
  const [ready, setReady] = useState(false);
  // SSR displays the tool before React attaches its input handler.
  useEffect(() => { setReady(true); }, []);
  const count = [...text].length;
  return (
    <ToolLayout title={t("wc.title")}>
      <p className={controls.label}>{t("wc.countLabel")}</p>
      <p className={styles["wc-count"]} aria-live="polite">{count}</p>
      <textarea
        disabled={!ready}
        className={styles["wc-input"]}
        value={text}
        onChange={event => setText(event.target.value)}
        placeholder={t("wc.placeholder")}
        aria-label={t("wc.title")}
      />
      </ToolLayout>
  );
}
