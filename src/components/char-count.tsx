"use client";

import ToolLayout from "./tool-layout";
import controls from "./tool-controls.module.css";

import styles from "./char-count.module.css";

import { useState } from "react";
import { useTranslations } from "next-intl";

export default function CharCount() {
  const t = useTranslations("App");
  const [text, setText] = useState("");
  const count = [...text].length;
  return (
    <ToolLayout title={t("wcTitle")} layout="centered">
      <p className={controls.label}>{t("wcCountLabel")}</p>
      <p className={styles["wc-count"]} aria-live="polite">{count}</p>
      <textarea
        className={styles["wc-input"]}
        value={text}
        onChange={event => setText(event.target.value)}
        placeholder={t("wcPlaceholder")}
        aria-label={t("wcTitle")}
      />
      </ToolLayout>
  );
}
