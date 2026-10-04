"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import form from "../../components/tool-form.module.css";
import type { DynamicT } from "../../lib/apps";
import { addDays, addMonths, addYears, daysBetween, era, formatDate, parseDate, span, today, weekday, weekdaysBetween } from "./dates";

type Mode = "between" | "add" | "info";
type Unit = "day" | "week" | "month" | "year";

export default function DateCalculator() {
  const t = useTranslations("App.dateCalc");
  const locale = useLocale();
  // Today is the visitor's, so it is known only in the browser: the server and the browser would otherwise disagree
  // about the date (and the page about its first render) around midnight.
  const [now, setNow] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("between");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  useEffect(() => {
    const current = today();
    setNow(current);
    setFrom(formatDate(current));
    setTo(formatDate(addDays(current, 100)));
  }, []);
  const [inclusive, setInclusive] = useState(false);
  const [amount, setAmount] = useState("100");
  const [unit, setUnit] = useState<Unit>("day");
  const [later, setLater] = useState(true);
  const a = parseDate(from);
  const b = parseDate(to);
  const count = Number(amount.replace(/[\s,，]/g, ""));
  const countOk = amount.trim() !== "" && Number.isInteger(count) && Math.abs(count) <= 100000;
  // The weekday and the era of a date, written for the page's language.
  const weekdayName = (time: number) => new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(time);
  const dateText = (time: number) => new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(time);
  const eraText = (time: number) => { const found = era(time); return found ? t("eraYear", { era: (t as unknown as DynamicT)(`eraName.${found.id}`), year: found.year === 1 ? t("firstYear") : String(found.year) }) : t("noEra"); };

  const between = useMemo(() => {
    if (a === null || b === null) return null;
    const days = daysBetween(a, b);
    return { days, abs: Math.abs(days) + (inclusive ? 1 : 0), parts: span(a, b), weekdays: weekdaysBetween(a, b, inclusive) };
  }, [a, b, inclusive]);

  const added = useMemo(() => {
    if (a === null || !countOk) return null;
    const n = later ? count : -count;
    return unit === "day" ? addDays(a, n) : unit === "week" ? addDays(a, n * 7) : unit === "month" ? addMonths(a, n) : addYears(a, n);
  }, [a, count, countOk, unit, later]);

  const dayOfYear = a === null ? 0 : daysBetween(Date.UTC(new Date(a).getUTCFullYear(), 0, 1), a) + 1;
  const leap = a !== null && new Date(Date.UTC(new Date(a).getUTCFullYear(), 1, 29)).getUTCMonth() === 1;

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <div className={controls.mode} role="group" aria-label={t("modeLabel")}>
        <button type="button" aria-pressed={mode === "between"} onClick={() => setMode("between")}>{t("between")}</button>
        <button type="button" aria-pressed={mode === "add"} onClick={() => setMode("add")}>{t("add")}</button>
        <button type="button" aria-pressed={mode === "info"} onClick={() => setMode("info")}>{t("info")}</button>
      </div>
      <div className={form.panel}>
        <label className={form.row}>
          <span className={form.name}>{mode === "between" ? t("start") : t("date")}</span>
          <input className={form.input} type="date" value={from} onChange={event => setFrom(event.target.value)} aria-label={mode === "between" ? t("start") : t("date")} />
        </label>
        {mode === "between" && (
          <>
            <label className={form.row}>
              <span className={form.name}>{t("end")}</span>
              <input className={form.input} type="date" value={to} onChange={event => setTo(event.target.value)} aria-label={t("end")} />
            </label>
            <label className={form.row}>
              <span className={form.name}>{t("inclusive")}</span>
              <input type="checkbox" checked={inclusive} onChange={event => setInclusive(event.target.checked)} aria-label={t("inclusive")} />
            </label>
          </>
        )}
        {mode === "add" && (
          <div className={form.row}>
            <span className={form.name}>{t("amount")}</span>
            <input className={form.input} style={{ maxWidth: "7rem" }} inputMode="numeric" value={amount} onChange={event => setAmount(event.target.value)} aria-label={t("amount")} />
            <select className={form.select} value={unit} aria-label={t("unitLabel")} onChange={event => setUnit(event.target.value as Unit)}>
              <option value="day">{t("day")}</option><option value="week">{t("week")}</option><option value="month">{t("month")}</option><option value="year">{t("year")}</option>
            </select>
            <select className={form.select} value={later ? "later" : "before"} aria-label={t("directionLabel")} onChange={event => setLater(event.target.value === "later")}>
              <option value="later">{t("later")}</option><option value="before">{t("before")}</option>
            </select>
          </div>
        )}
      </div>
      {mode === "between" && (
        <dl className={form.summary} aria-live="polite" data-date="result">
          {between ? (
            <>
              <div className={form.main}><dt>{t("days")}</dt><dd data-date="days">{t("daysValue", { n: between.abs })}</dd></div>
              <div><dt>{t("weeks")}</dt><dd>{t("weeksValue", { weeks: Math.floor(between.abs / 7), days: between.abs % 7 })}</dd></div>
              <div><dt>{t("span")}</dt><dd>{t("spanValue", between.parts)}</dd></div>
              <div><dt>{t("weekdays")}</dt><dd data-date="weekdays">{t("daysValue", { n: between.weekdays })}</dd></div>
            </>
          ) : <div><dt>{t("invalid")}</dt><dd>–</dd></div>}
        </dl>
      )}
      {mode === "add" && (
        <dl className={form.summary} aria-live="polite" data-date="result">
          {added !== null ? (
            <>
              <div className={form.main}><dt>{t("result")}</dt><dd data-date="added">{formatDate(added)}</dd></div>
              <div><dt>{t("weekday")}</dt><dd>{weekdayName(added)}</dd></div>
              <div><dt>{t("era")}</dt><dd>{eraText(added)}</dd></div>
            </>
          ) : <div><dt>{t("invalid")}</dt><dd>–</dd></div>}
        </dl>
      )}
      {mode === "info" && (
        <dl className={form.summary} aria-live="polite" data-date="result">
          {a !== null ? (
            <>
              <div className={form.main}><dt>{dateText(a)}</dt><dd data-date="weekday">{weekdayName(a)}</dd></div>
              <div><dt>{t("era")}</dt><dd>{eraText(a)}</dd></div>
              <div><dt>{t("dayOfYear")}</dt><dd>{t("dayOfYearValue", { n: dayOfYear })}</dd></div>
              <div><dt>{t("leapYear")}</dt><dd>{leap ? t("yes") : t("no")}</dd></div>
              {now !== null && <div><dt>{t("fromToday")}</dt><dd>{(() => { const d = daysBetween(now, a); return d === 0 ? t("todayItself") : d > 0 ? t("daysAfter", { n: d }) : t("daysBefore", { n: -d }); })()}</dd></div>}
              <div><dt>{t("weekdayNumber")}</dt><dd>{weekday(a)}</dd></div>
            </>
          ) : <div><dt>{t("invalid")}</dt><dd>–</dd></div>}
        </dl>
      )}
      {mode === "between" && <p className={form.hint}>{t("holidayNote")}</p>}
    </ToolLayout>
  );
}
