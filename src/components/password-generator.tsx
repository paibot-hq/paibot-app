"use client";

import ToolLayout from "./tool-layout";
import controls from "./tool-controls.module.css";

import styles from "./password-generator.module.css";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const NUMBERS = "0123456789";
const SYMBOLS = "!@#$%^&*()_+-=[]{}|;:,.<>?";
const MIN_LENGTH = 8;
const MAX_LENGTH = 64;

function randomInt(max: number) {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0] % max;
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function generatePassword(length: number, sets: string[]): string {
  if (sets.length === 0) return "";
  const pool = sets.join("");
  // Guarantee at least one character from each selected set, then fill the rest uniformly
  // at random from the combined pool before shuffling into the final order.
  const required = sets.map(set => set[randomInt(set.length)]);
  const rest = Array.from({ length: Math.max(0, length - required.length) }, () => pool[randomInt(pool.length)]);
  return shuffle([...required, ...rest]).slice(0, length).join("");
}

export default function PasswordGenerator() {
  const t = useTranslations("App");
  const [length, setLength] = useState(16);
  const [useLower, setUseLower] = useState(true);
  const [useUpper, setUseUpper] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSymbols, setUseSymbols] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const activeSets = [
    useLower && LOWER,
    useUpper && UPPER,
    useNumbers && NUMBERS,
    useSymbols && SYMBOLS,
  ].filter((set): set is string => Boolean(set));

  // Password generation is randomized, so it must happen on the client only — doing it during
  // the initial render would produce a different result on the server and cause a hydration
  // mismatch (same reasoning as the arithmetic practice tool's first problem).
  useEffect(() => {
    setPassword(generatePassword(length, activeSets));
    setCopied(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [length, useLower, useUpper, useNumbers, useSymbols]);

  function regenerate() {
    setPassword(generatePassword(length, activeSets));
    setCopied(false);
  }

  async function copyPassword() {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      /* Clipboard access can be denied; the password is still selectable/visible. */
    }
  }

  return (
    <ToolLayout title={t("password.title")}>
      <div className={styles["password-controls"]}>
        <div className={styles["password-field"]}>
          <span className={styles["password-field-label"]}>{t("password.lengthLabel")}: <strong>{length}</strong></span>
          <input
            id="password-length"
            className={styles["password-slider"]}
            type="range"
            min={MIN_LENGTH}
            max={MAX_LENGTH}
            value={length}
            aria-label={t("password.lengthLabel")}
            onChange={event => setLength(Number(event.target.value))}
          />
        </div>

        <div className={styles["password-field"]}>
          <span className={styles["password-field-label"]}>{t("password.optionsLabel")}</span>
          <div className={styles["password-options"]}>
            <label className={styles["password-option"]}>
              <input type="checkbox" checked={useLower} onChange={event => setUseLower(event.target.checked)} />
              {t("password.lower")}
            </label>
            <label className={styles["password-option"]}>
              <input type="checkbox" checked={useUpper} onChange={event => setUseUpper(event.target.checked)} />
              {t("password.upper")}
            </label>
            <label className={styles["password-option"]}>
              <input type="checkbox" checked={useNumbers} onChange={event => setUseNumbers(event.target.checked)} />
              {t("password.numbers")}
            </label>
            <label className={styles["password-option"]}>
              <input type="checkbox" checked={useSymbols} onChange={event => setUseSymbols(event.target.checked)} />
              {t("password.symbols")}
            </label>
          </div>
        </div>
      </div>

      <p className={controls.label}>{t("password.resultLabel")}</p>
      {activeSets.length === 0 ? (
        <p className={controls.error}>{t("password.emptyWarning")}</p>
      ) : (
        <p className={styles["password-result"]} aria-live="polite">{password ?? " "}</p>
      )}

      <div className={styles["password-actions"]}>
        <button className="auth-link" type="button" onClick={regenerate} disabled={activeSets.length === 0}>
          {t("password.regenerate")}
        </button>
        <button className="auth-link" type="button" onClick={copyPassword} disabled={!password}>
          {copied ? t("password.copied") : t("password.copy")}
        </button>
      </div>
      </ToolLayout>
  );
}
