"use client";

import ToolLayout from "./tool-layout";
import controls from "./tool-controls.module.css";

import styles from "./text-converter.module.css";

import { useState } from "react";
import { useTranslations } from "next-intl";

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
    <ToolLayout title={t("urlencodeTitle")}>
      <div className={controls.mode} role="radiogroup" aria-label={t("urlencodeTitle")}>
        <button type="button" aria-pressed={mode === "encode"} onClick={() => switchMode("encode")}>
          {t("urlencodeModeEncode")}
        </button>
        <button type="button" aria-pressed={mode === "decode"} onClick={() => switchMode("decode")}>
          {t("urlencodeModeDecode")}
        </button>
      </div>

      <textarea
        className={styles["input"]}
        value={input}
        onChange={event => updateInput(event.target.value)}
        placeholder={mode === "encode" ? t("urlencodeInputPlaceholderEncode") : t("urlencodeInputPlaceholderDecode")}
        aria-label={mode === "encode" ? t("urlencodeInputPlaceholderEncode") : t("urlencodeInputPlaceholderDecode")}
      />

      <p className={controls.label}>{t("urlencodeResultLabel")}</p>
      {invalid ? (
        <p className={controls.error}>{t("urlencodeInvalidError")}</p>
      ) : (
        <p className={styles["result"]} aria-live="polite">{result || " "}</p>
      )}

      <div className={styles["actions"]}>
        <button className="auth-link" type="button" onClick={copyResult} disabled={!result || invalid}>
          {copied ? t("urlencodeCopied") : t("urlencodeCopy")}
        </button>
      </div>
      </ToolLayout>
  );
}
