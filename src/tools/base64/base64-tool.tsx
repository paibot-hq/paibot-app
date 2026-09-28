"use client";

import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";

import styles from "../../components/text-converter.module.css";

import { useState } from "react";
import { useTranslations } from "use-intl";

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
    <ToolLayout title={t("base64.title")}>
      <div className={controls.mode} role="radiogroup" aria-label={t("base64.title")}>
        <button type="button" aria-pressed={mode === "encode"} onClick={() => switchMode("encode")}>
          {t("base64.modeEncode")}
        </button>
        <button type="button" aria-pressed={mode === "decode"} onClick={() => switchMode("decode")}>
          {t("base64.modeDecode")}
        </button>
      </div>

      <textarea
        className={styles["input"]}
        value={input}
        onChange={event => updateInput(event.target.value)}
        placeholder={mode === "encode" ? t("base64.inputPlaceholderEncode") : t("base64.inputPlaceholderDecode")}
        aria-label={mode === "encode" ? t("base64.inputPlaceholderEncode") : t("base64.inputPlaceholderDecode")}
      />

      <p className={controls.label}>{t("base64.resultLabel")}</p>
      {invalid ? (
        <p className={controls.error}>{t("base64.invalidError")}</p>
      ) : (
        <p className={styles["result"]} aria-live="polite">{result || " "}</p>
      )}

      <div className={styles["actions"]}>
        <button className="auth-link" type="button" onClick={copyResult} disabled={!result || invalid}>
          {copied ? t("base64.copied") : t("base64.copy")}
        </button>
      </div>
      </ToolLayout>
  );
}
