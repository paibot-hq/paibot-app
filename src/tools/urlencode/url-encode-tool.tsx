"use client";

import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";

import styles from "../../components/text-converter.module.css";

import { useState } from "react";
import { useTranslations } from "use-intl";

type Mode = "encode" | "decode";

export default function UrlEncodeTool() {
  const t = useTranslations("App");
  const [mode, setMode] = useState<Mode>("encode");
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);

  let result = "";
  let invalid = false;
  if (input) {
    try {
      result = mode === "encode" ? encodeURIComponent(input) : decodeURIComponent(input);
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
    <ToolLayout title={t("urlencode.title")}>
      <div className={controls.mode} role="radiogroup" aria-label={t("urlencode.title")}>
        <button type="button" aria-pressed={mode === "encode"} onClick={() => switchMode("encode")}>
          {t("urlencode.modeEncode")}
        </button>
        <button type="button" aria-pressed={mode === "decode"} onClick={() => switchMode("decode")}>
          {t("urlencode.modeDecode")}
        </button>
      </div>

      <textarea
        className={styles["input"]}
        value={input}
        onChange={event => updateInput(event.target.value)}
        placeholder={mode === "encode" ? t("urlencode.inputPlaceholderEncode") : t("urlencode.inputPlaceholderDecode")}
        aria-label={mode === "encode" ? t("urlencode.inputPlaceholderEncode") : t("urlencode.inputPlaceholderDecode")}
      />

      <p className={controls.label}>{t("urlencode.resultLabel")}</p>
      {invalid ? (
        <p className={controls.error}>{t("urlencode.invalidError")}</p>
      ) : (
        <p className={styles["result"]} aria-live="polite">{result || " "}</p>
      )}

      <div className={styles["actions"]}>
        <button className="auth-link" type="button" onClick={copyResult} disabled={!result || invalid}>
          {copied ? t("urlencode.copied") : t("urlencode.copy")}
        </button>
      </div>
      </ToolLayout>
  );
}
