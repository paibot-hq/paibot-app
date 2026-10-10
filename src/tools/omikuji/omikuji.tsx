"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import styles from "./omikuji.module.css";
import { CATEGORIES, draw, lineKey, type Fortune } from "./fortune";

// The box is shaken, a stick comes out, and the paper opens: each step is a moment of waiting (none when motion is to be calm).
const SHAKE_MS = 1300;
const STICK_MS = 900;
type Stage = "idle" | "shaking" | "stick" | "open";

export default function Omikuji() {
  const t = useTranslations("App.omikuji");
  const locale = useLocale();
  const [stage, setStage] = useState<Stage>("idle");
  const [fortune, setFortune] = useState<Fortune | null>(null);
  const [shared, setShared] = useState("");
  const timers = useRef<number[]>([]);
  const calm = useRef(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { calm.current = query.matches; };
    update();
    query.addEventListener("change", update);
    return () => { query.removeEventListener("change", update); timers.current.forEach(window.clearTimeout); };
  }, []);

  function pull() {
    if (stage === "shaking" || stage === "stick") return;
    const result = draw(Math.random);
    setFortune(result);
    setShared("");
    timers.current.forEach(window.clearTimeout);
    if (calm.current) { setStage("open"); return; }
    setStage("shaking");
    timers.current = [
      window.setTimeout(() => setStage("stick"), SHAKE_MS),
      window.setTimeout(() => setStage("open"), SHAKE_MS + STICK_MS),
    ];
  }

  function again() {
    timers.current.forEach(window.clearTimeout);
    setFortune(null);
    setStage("idle");
    setShared("");
  }

  async function share() {
    if (!fortune) return;
    const text = `${t("shareText", { luck: t(`luck.${fortune.luck}`), stick: fortune.stick })}\n${window.location.origin}/${locale}/omikuji`;
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); setShared(t("copied")); }
    } catch { /* the share sheet was closed */ }
  }

  // The lines are looked up by a key made at run time (lines.<category>.<tone>.<variant>).
  const line = t as unknown as (key: string) => string;
  const busy = stage === "shaking" || stage === "stick";

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      {stage !== "open" && (
        <div className={styles.stage} data-stage={stage} data-omikuji="stage">
          <button type="button" className={styles.box} onClick={pull} disabled={busy} aria-label={t("boxLabel")} data-omikuji="box">
            <span className={styles.band} aria-hidden="true">{t("boxText")}</span>
            <span className={styles.hole} aria-hidden="true" />
          </button>
          {stage === "stick" && fortune && <span className={styles.stick} aria-hidden="true" data-omikuji="stick">{fortune.stick}</span>}
          <p className={styles.prompt} aria-live="polite">{stage === "idle" ? t("prompt") : stage === "shaking" ? t("shaking") : t("stickOut", { n: fortune?.stick ?? 0 })}</p>
        </div>
      )}
      {stage === "open" && fortune && (
        <article className={styles.paper} data-luck={fortune.luck} data-omikuji="paper" aria-label={t("result")}>
          <p className={styles.number}>{t("number", { n: fortune.stick })}</p>
          <h2 className={styles.luck} data-omikuji="luck">{t(`luck.${fortune.luck}`)}</h2>
          <dl className={styles.lines}>
            {CATEGORIES.map(category => (
              <div key={category}>
                <dt>{t(`category.${category}`)}</dt>
                <dd>{line(lineKey(category, fortune.tone, fortune.lines[category]))}</dd>
              </div>
            ))}
          </dl>
          <p className={styles.lucky}>
            <span><span className={styles.swatch} data-color={fortune.color} aria-hidden="true" />{t("luckyColor")}: {t(`color.${fortune.color}`)}</span>
            <span>{t("luckyNumber")}: {fortune.number}</span>
          </p>
          <div className={styles.buttons}>
            <button type="button" className="auth-link" onClick={again} data-omikuji="again">{t("again")}</button>
            <button type="button" className="auth-link" onClick={share} data-omikuji="share">{t("share")}</button>
          </div>
          <p className={styles.note} role="status">{shared}</p>
        </article>
      )}
      <p className={styles.note}>{t("note")}</p>
    </ToolLayout>
  );
}
