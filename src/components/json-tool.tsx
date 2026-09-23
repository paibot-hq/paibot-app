"use client";

import ToolLayout from "./tool-layout";
import controls from "./tool-controls.module.css";

import styles from "./text-converter.module.css";

import { useState } from "react";
import { useTranslations } from "next-intl";

type Mode = "format" | "minify";

export default function JsonTool() {
  const t = useTranslations("App");
  const [mode, setMode] = useState<Mode>("format");
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);

  let result = "";
  let invalid = false;
  if (input.trim()) {
    try {
      const parsed = JSON.parse(input);
      result = mode === "format" ? JSON.stringify(parsed, null, 2) : JSON.stringify(parsed);
    } catch {
      invalid = true;
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setCopied(false);
  }

  function updateInput(value: string) {
    setInput(value);
    setCopied(false);
  }

  async function copyResult() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
    } catch {
      /* Clipboard access can be denied; the result is still selectable/visible. */
    }
  }

  return (
    <ToolLayout title={t("json.title")}>
      <div className={controls.mode} role="radiogroup" aria-label={t("json.title")}>
        <button type="button" aria-pressed={mode === "format"} onClick={() => switchMode("format")}>
          {t("json.modeFormat")}
        </button>
        <button type="button" aria-pressed={mode === "minify"} onClick={() => switchMode("minify")}>
          {t("json.modeMinify")}
        </button>
      </div>

      <textarea
        className={styles["input"]}
        value={input}
        onChange={event => updateInput(event.target.value)}
        placeholder={t("json.inputPlaceholder")}
        aria-label={t("json.inputPlaceholder")}
      />

      <p className={controls.label}>{t("json.resultLabel")}</p>
      {invalid ? (
        <p className={controls.error}>{t("json.invalidError")}</p>
      ) : (
        <p className={styles["result"]} aria-live="polite">{result || " "}</p>
      )}

      <div className={styles["actions"]}>
        <button className="auth-link" type="button" onClick={copyResult} disabled={!result || invalid}>
          {copied ? t("json.copied") : t("json.copy")}
        </button>
      </div>
      </ToolLayout>
  );
}
