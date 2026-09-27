"use client";

import { Fragment, useId, useState } from "react";
import { useLocale, useTranslations } from "use-intl";
import ToolLayout from "./tool-layout";
import controls from "./tool-controls.module.css";
import styles from "./cidr-calculator.module.css";
import { formatAddress, formatBinary, parseCidr } from "../lib/cidr";

export default function CidrCalculator() {
  const t = useTranslations("App.cidr");
  const locale = useLocale();
  const inputId = useId();
  const [input, setInput] = useState("192.168.1.10/24");
  const result = parseCidr(input);
  const count = (value: number) => value.toLocaleString(locale);
  // Lets a long binary value wrap only between octets; <wbr> adds no text, so copying stays clean.
  const binary = (value: number) => formatBinary(value).split(".").map((octet, i) =>
    <Fragment key={i}>{i > 0 && <>.<wbr /></>}{octet}</Fragment>);

  const rows = result && [
    ["network", `${formatAddress(result.network)}/${result.prefix}`],
    ["broadcast", formatAddress(result.broadcast)],
    ["mask", formatAddress(result.mask)],
    ["wildcard", formatAddress(result.wildcard)],
    ["hostRange", result.firstHost === result.lastHost
      ? formatAddress(result.firstHost)
      : `${formatAddress(result.firstHost)} – ${formatAddress(result.lastHost)}`],
    ["hostCount", count(result.hostCount)],
    ["totalCount", count(result.totalCount)],
    ["kind", t(`kinds.${result.kind}`)],
    ["addressBinary", binary(result.address)],
    ["maskBinary", binary(result.mask)],
  ] as const;

  return (
    <ToolLayout title={t("title")}>
      <div className={controls.field}>
        <label className={controls.fieldLabel} htmlFor={inputId}>{t("inputLabel")}</label>
        <input id={inputId} className={styles.input} value={input} spellCheck={false} autoComplete="off"
          inputMode="decimal" placeholder="192.168.1.10/24" aria-invalid={!result && input.trim() !== ""}
          onChange={event => setInput(event.target.value)} />
        <p className={styles.hint}>{t("inputHint")}</p>
      </div>
      {input.trim() !== "" && !result && <p className={controls.error} role="alert">{t("invalid")}</p>}
      {rows && (
        <dl className={styles.results} aria-live="polite">
          {rows.map(([key, value]) => (
            <div key={key} className={styles.row} data-cidr={key}>
              <dt>{t(`labels.${key}`)}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {result?.prefix === 31 && <p className={styles.note}>{t("note31")}</p>}
    </ToolLayout>
  );
}
