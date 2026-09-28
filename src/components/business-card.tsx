import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "use-intl";
import ToolLayout from "./tool-layout";
import controls from "./tool-controls.module.css";
import styles from "./business-card.module.css";
import type { DynamicT } from "../lib/apps";
import {
  CARD, COLORS, contactLines, EMPTY_CARD, fitSize, TEMPLATES,
  type CardData, type Template,
} from "../lib/business-card";

const STORAGE_KEY = "paibot.businessCard";
const FIELDS = ["name", "reading", "company", "department", "title", "postalCode", "address", "phone", "fax", "email", "website"] as const satisfies readonly (keyof CardData)[];
const INPUT_TYPES: Partial<Record<keyof CardData, string>> = { phone: "tel", fax: "tel", email: "email", website: "url" };
const COLOR_NAMES = ["blue", "green", "red", "purple", "gray"] as const;
// 300 dpi: 91 × 55 mm.
const PNG = { width: 1075, height: 650 } as const;
const GOTHIC = "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', 'Yu Gothic', Meiryo, sans-serif";

type Settings = { card: CardData; template: Template; color: string };
// The classic banded layout, in near-black.
const DEFAULTS: Settings = { card: EMPTY_CARD, template: "stripe", color: COLORS[4] };

function readSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<Settings> | null;
    if (!saved) return DEFAULTS;
    return {
      card: { ...EMPTY_CARD, ...saved.card },
      template: TEMPLATES.includes(saved.template as Template) ? (saved.template as Template) : DEFAULTS.template,
      color: COLORS.includes(saved.color as (typeof COLORS)[number]) ? (saved.color as string) : DEFAULTS.color,
    };
  } catch {
    return DEFAULTS;
  }
}

type CardProps = Settings & { postalMark: string; label?: string };

function Svg({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${CARD.width} ${CARD.height}`} width={`${CARD.width}mm`} height={`${CARD.height}mm`}
      role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} fontFamily={GOTHIC}>
      <rect width={CARD.width} height={CARD.height} fill="#fff" />
      {children}
    </svg>
  );
}

// The classic layout: a band down the left, the company at the top, then
// department and title, the name and its reading, and the contact block
// along the bottom.
function ClassicCard({ card, color, postalMark, label }: CardProps) {
  const band = 3.6, indent = 20, right = 5;
  const width = CARD.width - indent - right;
  const contacts = contactLines(card, postalMark);
  const line = (value: string, y: number, size: number, extra: Record<string, string | number> = {}) =>
    value.trim() && <text x={indent} y={y} fontSize={fitSize(value.trim(), size, width)} {...extra}>{value.trim()}</text>;
  return (
    <Svg label={label}>
      <rect width={band} height={CARD.height} fill={color} />
      <g fill="#222">
        {card.company.trim() && <text x={band + 3.6} y={8.2} fontSize={fitSize(card.company.trim(), 3.6, CARD.width - band - 3.6 - right)} fontWeight={700}>{card.company.trim()}</text>}
        {line(card.department, 16.5, 2.5)}
        {line(card.title, 19.8, 2.5)}
        {line(card.name, 27, 6, { fontWeight: 700 })}
        {line(card.reading, 30.6, 2.1, { fill: "#666" })}
        {contacts.map((text, i) => (
          // xml:space keeps the run of spaces between TEL and FAX.
          <text key={i} x={indent} y={49.3 - (contacts.length - 1 - i) * 2.9} fontSize={fitSize(text, 2.3, width)} xmlSpace="preserve">{text}</text>
        ))}
      </g>
    </Svg>
  );
}

// "simple" and "center": the company in color, one title line, a bold name.
function ModernCard({ card, template, color, postalMark, label }: CardProps) {
  const pad = 6;
  const centered = template === "center";
  const x = centered ? CARD.width / 2 : pad;
  const anchor = centered ? "middle" : "start";
  const width = CARD.width - 2 * pad;
  const contacts = contactLines(card, postalMark);
  const lastLine = CARD.height - pad + 0.5;
  const text = (value: string, y: number, size: number, extra: Record<string, string | number> = {}) =>
    value.trim() && <text x={x} y={y} fontSize={fitSize(value.trim(), size, width)} textAnchor={anchor} {...extra}>{value.trim()}</text>;
  return (
    <Svg label={label}>
      <g fill="#222">
        {text(card.company, pad + 4, 3, { fill: color, fontWeight: 700 })}
        {text([card.department, card.title].map(value => value.trim()).filter(Boolean).join(" "), 21.5, 2.5)}
        {text(card.reading, 26, 2.1, { fill: "#666" })}
        {text(card.name, 33, 6, { fontWeight: 700 })}
        {contacts.map((line, i) => (
          <text key={i} x={x} y={lastLine - (contacts.length - 1 - i) * 3.1} fontSize={fitSize(line, 2.2, width)} textAnchor={anchor} xmlSpace="preserve">{line}</text>
        ))}
      </g>
    </Svg>
  );
}

// The card itself, in millimetres. Used for the preview, the PNG and the print sheet.
function CardSvg(props: CardProps) {
  return props.template === "stripe" ? <ClassicCard {...props} /> : <ModernCard {...props} />;
}

export default function BusinessCard() {
  const t = useTranslations("App.businessCard");
  const td = t as unknown as DynamicT;
  const previewRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  // The print sheet lives directly under <body> (see the CSS), set after mount.
  const [body, setBody] = useState<HTMLElement | null>(null);
  const { card } = settings;
  const empty = FIELDS.every(field => !card[field].trim());
  // Until something is typed, preview a sample card so the layout is visible.
  const sample: CardData = Object.fromEntries(FIELDS.map(field => [field, td(`sample.${field}`)])) as CardData;
  const shown: Settings = { ...settings, card: empty ? sample : card };

  useEffect(() => {
    setSettings(readSettings());
    setLoaded(true);
    setBody(document.body);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* storage unavailable */ }
  }, [settings, loaded]);

  const update = (patch: Partial<Settings>) => setSettings(previous => ({ ...previous, ...patch }));
  // "e.g. …" so the sample in an empty field doesn't read as already filled in.
  const example = (field: keyof CardData) => (sample[field] ? t("example", { value: sample[field] }) : undefined);
  const setField = (field: keyof CardData, value: string) => update({ card: { ...card, [field]: value } });

  const downloadPng = () => {
    const svg = previewRef.current?.querySelector("svg");
    if (!svg) return;
    const copy = svg.cloneNode(true) as SVGSVGElement;
    copy.setAttribute("width", String(PNG.width));
    copy.setAttribute("height", String(PNG.height));
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = PNG.width;
      canvas.height = PNG.height;
      canvas.getContext("2d")?.drawImage(image, 0, 0);
      canvas.toBlob(blob => {
        if (!blob) return;
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "business-card.png";
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      }, "image/png");
    };
    // A data: URL, not blob:, because the CSP's img-src allows data: only.
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(copy))}`;
  };

  // The print sheet's CSS only applies while this flag is set, so printing
  // other pages later is unaffected.
  const print = () => {
    const root = document.documentElement;
    root.dataset.print = "business-card";
    window.addEventListener("afterprint", () => { delete root.dataset.print; }, { once: true });
    window.print();
  };

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <div className={styles["layout"]}>
        <div className={styles["preview"]} ref={previewRef} data-empty={empty || undefined}>
          <CardSvg {...shown} postalMark={t("postalMark")} label={t("previewLabel")} />
        </div>
        {empty && <p className={controls.label}>{t("sampleHint")}</p>}

        <fieldset className={styles["group"]}>
          <legend>{t("design")}</legend>
          <div className={styles["choices"]} role="radiogroup" aria-label={t("template")}>
            {TEMPLATES.map(template => (
              <button key={template} type="button" role="radio" aria-checked={settings.template === template}
                className={styles["choice"]} onClick={() => update({ template })}>{td(`templates.${template}`)}</button>
            ))}
          </div>
          <div className={styles["colors"]} role="radiogroup" aria-label={t("color")}>
            {COLORS.map((color, i) => (
              <button key={color} type="button" role="radio" aria-checked={settings.color === color} aria-label={td(`colors.${COLOR_NAMES[i]}`)}
                className={styles["swatch"]} style={{ background: color }} onClick={() => update({ color })} />
            ))}
          </div>
        </fieldset>

        <fieldset className={styles["group"]}>
          <legend>{t("details")}</legend>
          {FIELDS.map(field => (
            <label key={field} className={styles["field"]}>
              <span>{td(`fields.${field}`)}</span>
              {field === "address"
                ? <textarea rows={2} value={card[field]} placeholder={example(field)} onChange={event => setField(field, event.target.value)} />
                : <input type={INPUT_TYPES[field] ?? "text"} inputMode={field === "postalCode" ? "numeric" : undefined}
                    value={card[field]} placeholder={example(field)} autoComplete="off" onChange={event => setField(field, event.target.value)} />}
            </label>
          ))}
          <button className={styles["secondary"]} type="button" onClick={() => update({ card: EMPTY_CARD })} disabled={empty}>{t("clear")}</button>
        </fieldset>
        <div className={styles["actions"]}>
          <button className="auth-link" type="button" onClick={downloadPng} disabled={empty}>{t("download")}</button>
          <button className={styles["secondary"]} type="button" onClick={print} disabled={empty}>{t("print")}</button>
        </div>
        <p className={controls.label}>{t("printHint")}</p>
        <p className={controls.label}>{t("privacy")}</p>
      </div>

      {body && createPortal(
        <div className={styles["sheet"]} aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => <CardSvg key={i} {...shown} postalMark={t("postalMark")} />)}
        </div>,
        body,
      )}
    </ToolLayout>
  );
}
