"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import form from "../../components/tool-form.module.css";
import type { DynamicT } from "../../lib/apps";
import { CATEGORIES, CATEGORY_IDS, convert, format, type Category } from "./units";

const DEFAULT_PAIR: Record<Category, [string, string]> = {
  length: ["km", "mi"], weight: ["kg", "lb"], area: ["tsubo", "m2"], volume: ["mL", "cup"], speed: ["km/h", "mph"], temperature: ["C", "F"], data: ["GB", "GiB"],
};

export default function UnitConverter() {
  const t = useTranslations("App.unitConverter");
  const locale = useLocale();
  const [category, setCategory] = useState<Category>("length");
  const [value, setValue] = useState("1");
  const [from, setFrom] = useState(DEFAULT_PAIR.length[0]);
  const [to, setTo] = useState(DEFAULT_PAIR.length[1]);
  const units = CATEGORIES[category].units;
  const number = Number(value.replace(/[\s,，]/g, ""));
  const valid = value.trim() !== "" && Number.isFinite(number);
  // Unit names are looked up by id, which is only known at run time.
  const label = (id: string) => (t as unknown as DynamicT)(`unit.${id}`);
  const result = useMemo(() => (valid ? convert(category, from, to, number) : Number.NaN), [category, from, to, number, valid]);

  function pick(next: Category) {
    setCategory(next);
    setFrom(DEFAULT_PAIR[next][0]);
    setTo(DEFAULT_PAIR[next][1]);
  }

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <div className={controls.mode} role="group" aria-label={t("categoryLabel")}>
        {CATEGORY_IDS.map(id => <button key={id} type="button" aria-pressed={category === id} onClick={() => pick(id)}>{t(`category.${id}`)}</button>)}
      </div>
      <div className={form.panel}>
        <label className={form.row}>
          <span className={form.name}>{t("value")}</span>
          <input className={form.input} inputMode="decimal" autoComplete="off" value={value} onChange={event => setValue(event.target.value)} aria-label={t("value")} />
        </label>
        <div className={form.row}>
          <span className={form.name}>{t("from")}</span>
          <select className={form.select} value={from} aria-label={t("from")} onChange={event => setFrom(event.target.value)}>
            {units.map(unit => <option key={unit.id} value={unit.id}>{label(unit.id)}</option>)}
          </select>
          <button className={form.swap} type="button" onClick={() => { setFrom(to); setTo(from); }} aria-label={t("swap")}>⇄</button>
          <span className={form.name} style={{ flex: "0 0 auto" }}>{t("to")}</span>
          <select className={form.select} value={to} aria-label={t("to")} onChange={event => setTo(event.target.value)}>
            {units.map(unit => <option key={unit.id} value={unit.id}>{label(unit.id)}</option>)}
          </select>
        </div>
      </div>
      <dl className={form.summary} aria-live="polite">
        <div className={form.main}><dt>{valid ? `${format(number, locale)} ${label(from)}` : t("invalid")}</dt><dd data-units="result">{valid ? `${format(result, locale)} ${label(to)}` : "–"}</dd></div>
      </dl>
      {valid && (
        <dl className={form.summary} aria-label={t("allUnits")}>
          {units.filter(unit => unit.id !== from).map(unit => <div key={unit.id}><dt>{label(unit.id)}</dt><dd>{format(convert(category, from, unit.id, number), locale)}</dd></div>)}
        </dl>
      )}
      <p className={form.hint}>{t("note")}</p>
    </ToolLayout>
  );
}
