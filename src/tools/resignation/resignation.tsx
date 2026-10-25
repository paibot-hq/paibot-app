import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import styles from "./resignation.module.css";
import type { DynamicT } from "../../lib/apps";
import {
  bodyLines, CALENDARS, EMPTY_LETTER, formatDate, KINDS, SAMPLE, TITLES,
  type Calendar, type Kind, type LetterData,
} from "./letter";

const STORAGE_KEY = "paibot.resignation";
const TEXT_FIELDS = ["reason", "department", "name", "company", "recipientTitle", "recipientName"] as const satisfies readonly (keyof LetterData)[];
const PERSON_FIELDS = ["department", "name", "company", "recipientTitle", "recipientName"] as const;

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function readLetter(): LetterData {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<LetterData> | null;
    if (!saved) return { ...EMPTY_LETTER, submitDate: today() };
    return {
      ...EMPTY_LETTER, ...saved,
      kind: KINDS.includes(saved.kind as Kind) ? (saved.kind as Kind) : EMPTY_LETTER.kind,
      calendar: CALENDARS.includes(saved.calendar as Calendar) ? (saved.calendar as Calendar) : EMPTY_LETTER.calendar,
    };
  } catch {
    return { ...EMPTY_LETTER, submitDate: today() };
  }
}

// The sheet, written downwards with the lines running from right to left:
// the title, the body, then the date, the writer and the addressee. Used for
// the preview and for the printed page.
function Sheet({ letter, seal, label }: { letter: LetterData; seal?: string; label?: string }) {
  return (
    <div className={styles["paper"]} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <div className={styles["sheet"]}>
        <p className={styles["title"]}>{TITLES[letter.kind]}</p>
        {bodyLines(letter).map((line, i) => <p key={i} className={styles["body"]} data-first={i === 0 || undefined}>{line}</p>)}
        <p className={styles["date"]}>{formatDate(letter.submitDate, letter.calendar)}</p>
        {letter.department.trim() && <p className={styles["writer"]}>{letter.department.trim()}</p>}
        <p className={styles["writer"]} data-name>{letter.name.trim()}{seal && <span className={styles["seal"]}>{seal}</span>}</p>
        <p className={styles["to"]} data-first>{letter.company.trim()}</p>
        <p className={styles["to"]}>{[letter.recipientTitle.trim(), letter.recipientName.trim()].filter(Boolean).join("　")}{letter.recipientName.trim() || letter.recipientTitle.trim() ? "　殿" : ""}</p>
      </div>
    </div>
  );
}

export default function Resignation() {
  const t = useTranslations("App.resignation");
  const td = t as unknown as DynamicT;
  const [letter, setLetter] = useState<LetterData>(EMPTY_LETTER);
  const [loaded, setLoaded] = useState(false);
  const empty = PERSON_FIELDS.every(field => !letter[field].trim());
  // Until a name or an addressee is typed, show a sample so the layout is visible.
  const shown: LetterData = empty ? { ...letter, ...SAMPLE } : letter;

  useEffect(() => {
    setLetter(readLetter());
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(letter)); } catch { /* storage unavailable */ }
  }, [letter, loaded]);

  const update = (patch: Partial<LetterData>) => setLetter(previous => ({ ...previous, ...patch }));
  const example = (field: keyof typeof SAMPLE) => t("example", { value: SAMPLE[field] });

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <div className={styles["layout"]}>
        <fieldset className={styles["group"]}>
          <legend>{t("details")}</legend>
          <div className={styles["choices"]} role="radiogroup" aria-label={t("kind")}>
            {KINDS.map(kind => (
              <button key={kind} type="button" role="radio" aria-checked={letter.kind === kind}
                className={styles["choice"]} onClick={() => update({ kind })}>{TITLES[kind]}</button>
            ))}
          </div>
          <p className={controls.label}>{td(`kindHint.${letter.kind}`)}</p>
          <label className={styles["field"]}>
            <span>{t("retireDate")}</span>
            <input type="date" value={letter.retireDate} onChange={event => update({ retireDate: event.target.value })} />
          </label>
          <label className={styles["field"]}>
            <span>{t("submitDate")}</span>
            <input type="date" value={letter.submitDate} onChange={event => update({ submitDate: event.target.value })} />
          </label>
          <div className={styles["choices"]} role="radiogroup" aria-label={t("calendar")}>
            {CALENDARS.map(calendar => (
              <button key={calendar} type="button" role="radio" aria-checked={letter.calendar === calendar}
                className={styles["choice"]} onClick={() => update({ calendar })}>{td(`calendars.${calendar}`)}</button>
            ))}
          </div>
          {TEXT_FIELDS.map(field => (
            <label key={field} className={styles["field"]}>
              <span>{td(`fields.${field}`)}</span>
              <input type="text" value={letter[field]} autoComplete="off"
                placeholder={field === "reason" ? t("reasonExample") : example(field)}
                onChange={event => update({ [field]: event.target.value })} />
            </label>
          ))}
          <button className={styles["secondary"]} type="button" onClick={() => setLetter({ ...EMPTY_LETTER, submitDate: today() })}>{t("clear")}</button>
        </fieldset>
        <div className={styles["preview"]} data-empty={empty || undefined}>
          <Sheet letter={shown} seal={t("seal")} label={t("previewLabel")} />
        </div>
        {empty && <p className={controls.label}>{t("sampleHint")}</p>}
        <div className={styles["actions"]}>
          <button className="auth-link" type="button" onClick={() => window.print()} disabled={empty}>{t("print")}</button>
        </div>
        <p className={controls.label}>{t("printHint")}</p>
        <p className={controls.label}>{t("handwriting")}</p>
        <p className={controls.label}>{t("privacy")}</p>
      </div>
      {/* The page that is printed: a child of <body> of its own, so printing can
          hide everything else without knowing the layout around the tool. */}
      {loaded && createPortal(<div className={styles["printRoot"]} data-print-root><Sheet letter={shown} /></div>, document.body)}
    </ToolLayout>
  );
}
