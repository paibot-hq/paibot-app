"use client";

import { useId, useState } from "react";
import { useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import styles from "./llm-memory.module.css";
import { BITS, RAMS, SIZES, verdict, weightGB } from "./memory";

export default function LlmMemory() {
  const t = useTranslations("App.llmMemory");
  const sizeId = useId();
  const [size, setSize] = useState(7);
  const [bits, setBits] = useState<number>(4);
  const [ram, setRam] = useState<number>(16);

  const weights = weightGB(size, bits);
  const ratio = weights / ram;
  const level = verdict(weights, ram);

  const chips = <T extends number>(values: readonly T[], current: number, set: (v: T) => void, label: (v: T) => string, group: string) => (
    <div className={styles.chips} role="group" aria-label={group}>
      {values.map(v => (
        <button key={v} type="button" className={styles.chip} aria-pressed={current === v} onClick={() => set(v)}>{label(v)}</button>
      ))}
    </div>
  );

  return (
    <ToolLayout title={t("title")}>
      <p className={styles.hint}>{t("hint")}</p>
      <div className={controls.field}>
        <label className={controls.fieldLabel} htmlFor={sizeId}>{t("params")}</label>
        <div className={styles.slider}>
          <input id={sizeId} type="range" min={1} max={100} step={1} value={size} onChange={event => setSize(Number(event.target.value))} />
          <output htmlFor={sizeId} className={styles.value}>{size}B</output>
        </div>
        {chips(SIZES, size, setSize, v => `${v}B`, t("params"))}
      </div>
      <div className={controls.field}>
        <span className={controls.fieldLabel}>{t("bits")}</span>
        {chips(BITS, bits, setBits, v => `${v}bit`, t("bits"))}
      </div>
      <div className={controls.field}>
        <span className={controls.fieldLabel}>{t("ram")}</span>
        {chips(RAMS, ram, setRam, v => `${v} GB`, t("ram"))}
      </div>
      <div className={styles.result} role="status" data-level={level}>
        <div className={styles.head}>
          <strong className={styles.big} data-llm="weights">{t("weights")} {weights.toFixed(1)} GB</strong>
          <span className={styles.verdict} data-llm="verdict">{t(`verdict.${level}`)} · {t("share", { percent: Math.round(ratio * 100) })}</span>
        </div>
        <div className={styles.track}><div className={styles.bar} style={{ width: `${Math.min(100, ratio * 100)}%` }} /></div>
        <p className={styles.note}>{t(`note.${level}`)}</p>
      </div>
      <p className={styles.hint}>{t("rule")}</p>
      <section className={styles.where} aria-labelledby={`${sizeId}-where`}>
        <h2 id={`${sizeId}-where`} className={styles.whereTitle}>{t("whereTitle")}</h2>
        <ul>
          {(["gpu", "apple", "cpu"] as const).map(key => <li key={key}>{t(`where.${key}`)}</li>)}
        </ul>
      </section>
    </ToolLayout>
  );
}
