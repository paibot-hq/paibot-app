"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import form from "../../components/tool-form.module.css";
import { calculate, type Direction, type Rounding } from "./tax";

const RATES = ["10", "8", "custom"] as const;

// Reads a whole number from what was typed: spaces and commas are ignored, the rest must be digits.
function whole(text: string): number {
  const digits = text.replace(/[\s,，]/g, "");
  return /^\d+$/.test(digits) ? Math.min(Number(digits), 9_999_999_999) : 0;
}

export default function TaxCalculator() {
  const t = useTranslations("App.tax");
  const locale = useLocale();
  const [direction, setDirection] = useState<Direction>("toIncluded");
  const [amount, setAmount] = useState("1000");
  const [rate, setRate] = useState<(typeof RATES)[number]>("10");
  const [custom, setCustom] = useState("5");
  const [rounding, setRounding] = useState<Rounding>("floor");
  const [percent, setPercent] = useState("");
  const [yen, setYen] = useState("");
  const yenFormat = useMemo(() => new Intl.NumberFormat(locale, { style: "currency", currency: "JPY", maximumFractionDigits: 0 }), [locale]);
  const ratePercent = rate === "custom" ? Math.min(100, whole(custom)) : Number(rate);
  const result = useMemo(
    () => calculate(whole(amount), ratePercent, rounding, direction, Math.min(100, whole(percent)), whole(yen)),
    [amount, ratePercent, rounding, direction, percent, yen],
  );
  const show = (value: number) => yenFormat.format(value);
  const included = direction === "toIncluded";

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <div className={controls.mode} role="group" aria-label={t("directionLabel")}>
        <button type="button" aria-pressed={included} onClick={() => setDirection("toIncluded")}>{t("toIncluded")}</button>
        <button type="button" aria-pressed={!included} onClick={() => setDirection("toExcluded")}>{t("toExcluded")}</button>
      </div>
      <div className={form.panel}>
        <label className={form.row}>
          <span className={form.name}>{included ? t("amountExcluded") : t("amountIncluded")}</span>
          <input className={form.input} inputMode="numeric" autoComplete="off" value={amount} onChange={event => setAmount(event.target.value)} aria-label={included ? t("amountExcluded") : t("amountIncluded")} />
          <span className={form.unit}>{t("yen")}</span>
        </label>
        <div className={form.row}>
          <span className={form.name}>{t("rateLabel")}</span>
          <select className={form.select} value={rate} aria-label={t("rateLabel")} onChange={event => setRate(event.target.value as (typeof RATES)[number])}>
            <option value="10">{t("rate10")}</option>
            <option value="8">{t("rate8")}</option>
            <option value="custom">{t("rateCustom")}</option>
          </select>
          {rate === "custom" && <><input className={form.input} style={{ maxWidth: "5rem" }} inputMode="numeric" value={custom} onChange={event => setCustom(event.target.value)} aria-label={t("rateCustom")} /><span className={form.unit}>%</span></>}
        </div>
        <div className={form.row}>
          <span className={form.name}>{t("roundingLabel")}</span>
          <select className={form.select} value={rounding} aria-label={t("roundingLabel")} onChange={event => setRounding(event.target.value as Rounding)}>
            <option value="floor">{t("floor")}</option>
            <option value="round">{t("round")}</option>
            <option value="ceil">{t("ceil")}</option>
          </select>
        </div>
        <label className={form.row}>
          <span className={form.name}>{t("discountPercent")}</span>
          <input className={form.input} inputMode="numeric" placeholder="0" value={percent} onChange={event => setPercent(event.target.value)} aria-label={t("discountPercent")} />
          <span className={form.unit}>%</span>
        </label>
        <label className={form.row}>
          <span className={form.name}>{t("discountYen")}</span>
          <input className={form.input} inputMode="numeric" placeholder="0" value={yen} onChange={event => setYen(event.target.value)} aria-label={t("discountYen")} />
          <span className={form.unit}>{t("yen")}</span>
        </label>
      </div>
      <dl className={form.summary} aria-live="polite" data-tax="result">
        {result.discount > 0 && <div><dt>{t("subtotal")}</dt><dd>{show(result.subtotal)}</dd></div>}
        {result.discount > 0 && <div><dt>{t("discount")}</dt><dd>-{show(result.discount)}</dd></div>}
        <div><dt>{t("excluded")}</dt><dd data-tax="excluded">{show(result.excluded)}</dd></div>
        <div><dt>{t("tax", { rate: ratePercent })}</dt><dd data-tax="tax">{show(result.tax)}</dd></div>
        <div className={form.main}><dt>{t("included")}</dt><dd data-tax="included">{show(result.included)}</dd></div>
      </dl>
      <p className={form.hint}>{t("note")}</p>
    </ToolLayout>
  );
}
