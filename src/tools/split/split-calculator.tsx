"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import form from "../../components/tool-form.module.css";
import { split, weighted, type Mode } from "./split";

const UNITS = [1, 10, 100, 1000];

function whole(text: string, max: number): number {
  const digits = text.replace(/[\s,，]/g, "");
  return /^\d+$/.test(digits) ? Math.min(Number(digits), max) : 0;
}

// "1 1 2" or "1,1,1.5": each number is a person's share (1 is a normal share).
function shares(text: string): number[] {
  return text.split(/[\s,，、]+/).filter(Boolean).map(Number).filter(value => Number.isFinite(value) && value >= 0).slice(0, 60);
}

export default function SplitCalculator() {
  const t = useTranslations("App.split");
  const locale = useLocale();
  const [kind, setKind] = useState<"equal" | "weighted">("equal");
  const [total, setTotal] = useState("12000");
  const [people, setPeople] = useState("5");
  const [weights, setWeights] = useState("1 1 1 1.5 2");
  const [unit, setUnit] = useState(100);
  const [mode, setMode] = useState<Mode>("roundUp");
  const yenFormat = useMemo(() => new Intl.NumberFormat(locale, { style: "currency", currency: "JPY", maximumFractionDigits: 0 }), [locale]);
  const show = (value: number) => yenFormat.format(value);
  const bill = whole(total, 9_999_999_999);
  const equal = useMemo(() => split(bill, Math.max(1, whole(people, 200)), unit, mode), [bill, people, unit, mode]);
  const unequal = useMemo(() => weighted(bill, shares(weights), unit), [bill, weights, unit]);
  const count = Math.max(1, whole(people, 200));

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <div className={controls.mode} role="group" aria-label={t("kindLabel")}>
        <button type="button" aria-pressed={kind === "equal"} onClick={() => setKind("equal")}>{t("equal")}</button>
        <button type="button" aria-pressed={kind === "weighted"} onClick={() => setKind("weighted")}>{t("weighted")}</button>
      </div>
      <div className={form.panel}>
        <label className={form.row}>
          <span className={form.name}>{t("total")}</span>
          <input className={form.input} inputMode="numeric" autoComplete="off" value={total} onChange={event => setTotal(event.target.value)} aria-label={t("total")} />
          <span className={form.unit}>{t("yen")}</span>
        </label>
        {kind === "equal" ? (
          <label className={form.row}>
            <span className={form.name}>{t("people")}</span>
            <input className={form.input} inputMode="numeric" value={people} onChange={event => setPeople(event.target.value)} aria-label={t("people")} />
            <span className={form.unit}>{t("persons")}</span>
          </label>
        ) : (
          <label className={form.row}>
            <span className={form.name}>{t("sharesLabel")}</span>
            <input className={form.input} value={weights} onChange={event => setWeights(event.target.value)} aria-label={t("sharesLabel")} />
          </label>
        )}
        <div className={form.row}>
          <span className={form.name}>{t("unitLabel")}</span>
          <select className={form.select} value={unit} aria-label={t("unitLabel")} onChange={event => setUnit(Number(event.target.value))}>
            {UNITS.map(value => <option key={value} value={value}>{t("unitValue", { n: value })}</option>)}
          </select>
        </div>
        {kind === "equal" && (
          <div className={form.row}>
            <span className={form.name}>{t("modeLabel")}</span>
            <select className={form.select} value={mode} aria-label={t("modeLabel")} onChange={event => setMode(event.target.value as Mode)}>
              <option value="roundUp">{t("roundUp")}</option>
              <option value="organizer">{t("organizer")}</option>
            </select>
          </div>
        )}
      </div>
      {kind === "equal" ? (
        <dl className={form.summary} aria-live="polite" data-split="result">
          <div className={form.main}><dt>{t("each")}</dt><dd data-split="each">{show(equal.each)}</dd></div>
          {mode === "organizer" && count > 1 && <div><dt>{t("organizerPays")}</dt><dd data-split="organizer">{show(equal.organizer)}</dd></div>}
          <div><dt>{t("collected")}</dt><dd>{show(equal.collected)}</dd></div>
          {equal.difference !== 0 && <div><dt>{t("over")}</dt><dd data-split="over">{show(equal.difference)}</dd></div>}
        </dl>
      ) : (
        <dl className={form.summary} aria-live="polite" data-split="result">
          {unequal.amounts.map((amount, index) => <div key={index}><dt>{t("person", { n: index + 1 })}</dt><dd>{show(amount)}</dd></div>)}
          {unequal.difference !== 0 && <div className={form.main}><dt>{t("over")}</dt><dd data-split="over">{show(unequal.difference)}</dd></div>}
        </dl>
      )}
      <p className={form.hint}>{kind === "equal" ? t("noteEqual") : t("noteWeighted")}</p>
    </ToolLayout>
  );
}
