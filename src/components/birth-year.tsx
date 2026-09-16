"use client";

import ToolLayout from "./tool-layout";
import controls from "./tool-controls.module.css";

import styles from "./birth-year.module.css";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

const ERAS = [
  { start: 2019, ja: "令和", en: "Reiwa" },
  { start: 1989, ja: "平成", en: "Heisei" },
  { start: 1926, ja: "昭和", en: "Showa" },
  { start: 1912, ja: "大正", en: "Taisho" },
  { start: 1868, ja: "明治", en: "Meiji" },
];

function eraLabel(year: number, locale: string) {
  const era = ERAS.find(e => year >= e.start) ?? ERAS[ERAS.length - 1];
  const num = year - era.start + 1;
  if (locale === "ja") return num === 1 ? `${era.ja}元年` : `${era.ja}${num}年`;
  return `${era.en} ${num}`;
}

const MAX_AGE = 115;
const AGE_OPTIONS = Array.from({ length: MAX_AGE + 1 }, (_, i) => i);

type Status = "unknown" | "passed" | "notyet";

export default function BirthYear({ year }: { year: number }) {
  const t = useTranslations("App");
  const locale = useLocale();
  const [age, setAge] = useState(30);
  const [status, setStatus] = useState<Status>("unknown");
  const scrollRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    const result = [];
    for (let y = year; y >= year - 110; y--) {
      const agePassed = year - y;
      const ageNotYet = agePassed - 1;
      result.push({ year: y, agePassed, ageNotYet });
    }
    return result;
  }, [year]);

  const isMatch = (row: { agePassed: number; ageNotYet: number }) => {
    if (status === "passed") return row.agePassed === age;
    if (status === "notyet") return row.ageNotYet === age;
    return row.agePassed === age || row.ageNotYet === age;
  };

  useEffect(() => {
    const match = scrollRef.current?.querySelector(`.${styles["age-row-match"]}`);
    match?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [age, status]);

  const format = (y: number) => `${y}${locale === "ja" ? "年" : ""} (${eraLabel(y, locale)})`;
  const resultText = status === "passed"
    ? format(year - age)
    : status === "notyet"
      ? format(year - age - 1)
      : `${format(year - age - 1)} ${t("ageOr")} ${format(year - age)}`;

  return (
    <ToolLayout title={t("ageTitle")}>
      <div className={styles["age-controls"]}>
        <label className={styles["age-field"]} htmlFor="age-input">
          <span className={controls.fieldLabel}>{t("ageInputLabel")}</span>
          <select
            id="age-input"
            className={styles["age-select"]}
            value={age}
            onChange={event => setAge(Number(event.target.value))}
          >
            {AGE_OPTIONS.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <div className={[styles["age-field"], styles["age-status-field"]].join(" ")}>
          <span className={controls.fieldLabel}>{t("ageStatusLabel")}</span>
          <div className={controls.mode} role="radiogroup" aria-label={t("ageStatusLabel")}>
            <button type="button" aria-pressed={status === "unknown"} onClick={() => setStatus("unknown")}>
              {t("ageStatusUnknown")}
            </button>
            <button type="button" aria-pressed={status === "passed"} onClick={() => setStatus("passed")}>
              {t("ageBirthdayPassed")}
            </button>
            <button type="button" aria-pressed={status === "notyet"} onClick={() => setStatus("notyet")}>
              {t("ageBirthdayNotYet")}
            </button>
          </div>
        </div>
      </div>

      <p className={controls.label}>{t("ageResultLabel")}</p>
      <p className={styles["age-result"]} aria-live="polite">{resultText}</p>

      <div className={styles["age-table-wrap"]}>
        <div className={styles["age-table-scroll"]} ref={scrollRef}>
          <table>
            <thead>
              <tr>
                <th>{t("ageColYear")}</th>
                <th>{t("ageColEra")}</th>
                <th>{t("ageColPassed")}</th>
                <th>{t("ageColNotYet")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.year} className={isMatch(row) ? styles["age-row-match"] : undefined}>
                  <td>{row.year}</td>
                  <td>{eraLabel(row.year, locale)}</td>
                  <td>{row.agePassed}</td>
                  <td className={row.ageNotYet < 0 ? styles["age-row-invalid"] : undefined}>
                    {row.ageNotYet >= 0 ? row.ageNotYet : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className={styles["age-note"]}>{t("ageNote")}</p>
      </ToolLayout>
  );
}
