"use client";

import ToolLayout from "./tool-layout";
import controls from "./tool-controls.module.css";

import styles from "./text-converter.module.css";

import { useState } from "react";
import { useTranslations } from "next-intl";

type Mode = "encode" | "decode";

function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function decodeBase64(value: string): string {
  const binary = atob(value.trim());
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export default function Base64Tool() {
  const t = useTranslations("App");
  const [mode, setMode] = useState<Mode>("encode");
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);

  let result = "";
  let invalid = false;
  if (input) {
    try {
      result = mode === "encode" ? encodeBase64(input) : decodeBase64(input);
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
    <ToolLayout title={t("base64Title")}>
      <div className={controls.mode} role="radiogroup" aria-label={t("base64Title")}>
        <button type="button" aria-pressed={mode === "encode"} onClick={() => switchMode("encode")}>
          {t("base64ModeEncode")}
        </button>
        <button type="button" aria-pressed={mode === "decode"} onClick={() => switchMode("decode")}>
          {t("base64ModeDecode")}
        </button>
      </div>

      <textarea
        className={styles["input"]}
        value={input}
        onChange={event => updateInput(event.target.value)}
        placeholder={mode === "encode" ? t("base64InputPlaceholderEncode") : t("base64InputPlaceholderDecode")}
        aria-label={mode === "encode" ? t("base64InputPlaceholderEncode") : t("base64InputPlaceholderDecode")}
      />

      <p className={controls.label}>{t("base64ResultLabel")}</p>
      {invalid ? (
        <p className={controls.error}>{t("base64InvalidError")}</p>
      ) : (
        <p className={styles["result"]} aria-live="polite">{result || " "}</p>
      )}

      <div className={styles["actions"]}>
        <button className="auth-link" type="button" onClick={copyResult} disabled={!result || invalid}>
          {copied ? t("base64Copied") : t("base64Copy")}
        </button>
      </div>
      </ToolLayout>
  );
}
