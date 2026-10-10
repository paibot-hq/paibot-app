"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import styles from "./birthday-fortune.module.css";
import { read, validDate, type Reading, type YMD } from "./reading";

const STORAGE = "birthday-fortune:v1";
const STAR_ROWS = ["overall", "love", "work", "money"] as const;

function today(): YMD {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}
const pad = (n: number) => String(n).padStart(2, "0");
const toText = ({ year, month, day }: YMD) => `${year}-${pad(month)}-${pad(day)}`;
function parse(text: string): YMD | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  return match ? { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) } : null;
}

function Stars({ value, label }: { value: number; label: string }) {
  return <span className={styles.stars} role="img" aria-label={label}>{"★".repeat(value)}<span className={styles.off}>{"★".repeat(5 - value)}</span></span>;
}

export default function BirthdayFortune() {
  const t = useTranslations("App.birthdayFortune");
  // Words looked up by a key made at run time (sign.<id>.name, lifePath.<n>.title, ...).
  const word = t as unknown as (key: string, values?: Record<string, string | number>) => string;
  const locale = useLocale();
  const [birth, setBirth] = useState("");
  const [shown, setShown] = useState<{ birth: YMD; today: YMD; reading: Reading } | null>(null);
  const [error, setError] = useState(false);
  const [shared, setShared] = useState("");
  const now = today();

  // The birth date is kept in this browser only, so that the page can show today's reading at once next time.
  useEffect(() => {
    try {
      const saved = parse(window.localStorage.getItem(STORAGE) ?? "");
      if (saved && validDate(saved, today())) { setBirth(toText(saved)); setShown({ birth: saved, today: today(), reading: read(saved, today()) }); }
    } catch { /* storage blocked */ }
  }, []);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const date = parse(birth);
    if (!date || !validDate(date, today())) { setError(true); setShown(null); return; }
    setError(false); setShared("");
    try { window.localStorage.setItem(STORAGE, toText(date)); } catch { /* storage blocked */ }
    setShown({ birth: date, today: today(), reading: read(date, today()) });
  }

  function forget() {
    try { window.localStorage.removeItem(STORAGE); } catch { /* storage blocked */ }
    setBirth(""); setShown(null); setShared("");
  }

  async function share() {
    if (!shown) return;
    const r = shown.reading;
    const text = `${t("shareText", { sign: word(`sign.${r.sign}.name`), path: r.lifePath, stars: "★".repeat(r.stars.overall) })}\n${window.location.origin}/${locale}/birthday-fortune`;
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); setShared(t("copied")); }
    } catch { /* the share sheet was closed */ }
  }

  const r = shown?.reading;
  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <form className={styles.form} onSubmit={submit}>
        <label className={styles.field}>
          <span className={controls.fieldLabel}>{t("birthDate")}</span>
          <input type="date" className={styles.date} value={birth} min="1900-01-01" max={toText(now)} onChange={event => { setBirth(event.target.value); setError(false); }} required data-fortune="date" />
        </label>
        <button type="submit" className="auth-link" data-fortune="read">{t("read")}</button>
      </form>
      {error && <p className={styles.error} role="alert" data-fortune="error">{t("invalid")}</p>}
      {shown && r && (
        <div className={styles.result} data-fortune="result">
          <section className={styles.card}>
            <h2>{t("todayTitle", { date: toText(shown.today) })}</h2>
            <p className={styles.theme}>{word(`day.${r.day}.title`)}</p>
            <p>{word(`day.${r.day}.text`)}</p>
            <dl className={styles.starList}>
              {STAR_ROWS.map(row => <div key={row}><dt>{t(`stars.${row}`)}</dt><dd><Stars value={r.stars[row]} label={t("starsOf", { n: r.stars[row] })} /></dd></div>)}
            </dl>
          </section>
          <section className={styles.card}>
            <h2>{t("cycleTitle")}</h2>
            <ul className={styles.cycle}>
              <li><span>{t("yearLabel", { year: shown.today.year })}</span><strong>{r.year}</strong><span>{word(`year.${r.year}.title`)}</span></li>
              <li><span>{t("monthLabel", { month: shown.today.month })}</span><strong>{r.month}</strong><span>{word(`year.${r.month}.title`)}</span></li>
              <li><span>{t("dayLabel")}</span><strong>{r.day}</strong><span>{word(`day.${r.day}.title`)}</span></li>
            </ul>
            <p>{word(`year.${r.year}.text`)}</p>
          </section>
          <section className={styles.card}>
            <h2>{t("signTitle")}</h2>
            <p className={styles.theme}>{word(`sign.${r.sign}.name`)}<small>{word(`sign.${r.sign}.range`)} · {t(`element.${r.element}`)}</small></p>
            <p>{word(`sign.${r.sign}.text`)}</p>
          </section>
          <section className={styles.card}>
            <h2>{t("pathTitle")}</h2>
            <p className={styles.theme}><strong>{r.lifePath}</strong> {word(`lifePath.${r.lifePath}.title`)}</p>
            <p>{word(`lifePath.${r.lifePath}.text`)}</p>
          </section>
          <div className={styles.buttons}>
            <button type="button" className="auth-link" onClick={share} data-fortune="share">{t("share")}</button>
            <button type="button" className="auth-link" onClick={forget} data-fortune="forget">{t("forget")}</button>
          </div>
          <p className={styles.note} role="status">{shared}</p>
        </div>
      )}
      <p className={styles.note}>{t("note")}</p>
    </ToolLayout>
  );
}
