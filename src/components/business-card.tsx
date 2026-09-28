import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "use-intl";
import ToolLayout from "./tool-layout";
import controls from "./tool-controls.module.css";
import styles from "./business-card.module.css";
import type { DynamicT } from "../lib/apps";
import {
  CARD, COLORS, CONTACT_FIELDS, EMPTY_CARD, fitSize, qrPath, qrPayload, QR_MODES, TEMPLATES,
  type CardData, type QrMode, type Template,
} from "../lib/business-card";

const STORAGE_KEY = "paibot.businessCard";
const FIELDS = ["name", "reading", "company", "title", "phone", "email", "website", "address"] as const satisfies readonly (keyof CardData)[];
const COLOR_NAMES = ["blue", "green", "red", "purple", "gray"] as const;
// 300 dpi: 91 × 55 mm.
const PNG = { width: 1075, height: 650 } as const;
const FONT = "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', 'Yu Gothic', Meiryo, sans-serif";

type Settings = { card: CardData; template: Template; color: string; qr: QrMode };
// No QR code by default: most cards don't carry one.
const DEFAULTS: Settings = { card: EMPTY_CARD, template: "simple", color: COLORS[0], qr: "none" };

function readSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as (Omit<Partial<Settings>, "qr"> & { qr?: QrMode | boolean }) | null;
    if (!saved) return DEFAULTS;
    return {
      card: { ...EMPTY_CARD, ...saved.card },
      template: TEMPLATES.includes(saved.template as Template) ? (saved.template as Template) : DEFAULTS.template,
      color: COLORS.includes(saved.color as (typeof COLORS)[number]) ? (saved.color as string) : DEFAULTS.color,
      // Earlier versions stored an on/off switch for the contact QR code.
      qr: saved.qr === true ? "contact" : QR_MODES.includes(saved.qr as QrMode) ? (saved.qr as QrMode) : DEFAULTS.qr,
    };
  } catch {
    return DEFAULTS;
  }
}

const CONTACT_LABEL: Record<(typeof CONTACT_FIELDS)[number], string> = { phone: "Tel", email: "Mail", website: "Web", address: "" };

// The card itself, in millimetres. Used for the preview, the PNG and the print sheet.
function CardSvg({ card, template, color, qr, label }: Settings & { label?: string }) {
  const pad = 6;
  const qrSize = template === "center" ? 12 : 15;
  const payload = qrPayload(card, qr);
  const showQr = payload !== "";
  const left = template === "stripe" ? 5 + pad : pad;
  const centered = template === "center";
  const x = centered ? CARD.width / 2 : left;
  const anchor = centered ? "middle" : "start";
  const width = centered ? CARD.width - 2 * pad : CARD.width - left - pad;
  const contacts = CONTACT_FIELDS.filter(field => card[field].trim()).map(field =>
    `${CONTACT_LABEL[field] ? `${CONTACT_LABEL[field]}  ` : ""}${card[field].trim()}`);
  // Keep contact lines clear of the QR code (on both sides when centered).
  const contactWidth = showQr ? (centered ? CARD.width - 2 * (pad + qrSize + 2) : width - qrSize - 3) : width;
  const lineHeight = 3.1;
  const lastLine = CARD.height - pad + 0.5;
  const text = (value: string, y: number, size: number, max: number, extra: Record<string, string | number> = {}) =>
    value.trim() && (
      <text x={x} y={y} fontSize={fitSize(value.trim(), size, max)} textAnchor={anchor} {...extra}>{value.trim()}</text>
    );

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${CARD.width} ${CARD.height}`} width={`${CARD.width}mm`} height={`${CARD.height}mm`}
      role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} fontFamily={FONT}>
      <rect width={CARD.width} height={CARD.height} fill="#fff" />
      {template === "stripe" && <rect width={5} height={CARD.height} fill={color} />}
      <g fill="#222">
        {text(card.company, pad + 4, 3, width, { fill: color, fontWeight: 700 })}
        {text(card.title, 21.5, 2.5, width)}
        {text(card.reading, 26, 2.1, width, { fill: "#666" })}
        {text(card.name, 33, 6, width, { fontWeight: 700 })}
        {contacts.map((line, i) => (
          <text key={i} x={x} y={lastLine - (contacts.length - 1 - i) * lineHeight} fontSize={fitSize(line, 2.2, contactWidth)} textAnchor={anchor}>{line}</text>
        ))}
      </g>
      {showQr && <path d={qrPath(payload, CARD.width - pad - qrSize, CARD.height - pad - qrSize, qrSize)} fill="#222" />}
    </svg>
  );
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
          <CardSvg {...shown} label={t("previewLabel")} />
        </div>
        <div className={styles["actions"]}>
          <button className="auth-link" type="button" onClick={downloadPng} disabled={empty}>{t("download")}</button>
          <button className={styles["secondary"]} type="button" onClick={print} disabled={empty}>{t("print")}</button>
        </div>
        <p className={controls.label}>{empty ? t("sampleHint") : t("printHint")}</p>

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
                : <input type={field === "email" ? "email" : field === "phone" ? "tel" : field === "website" ? "url" : "text"}
                    value={card[field]} placeholder={example(field)} autoComplete="off" onChange={event => setField(field, event.target.value)} />}
            </label>
          ))}
          <div className={styles["qr"]} role="radiogroup" aria-label={t("qrLabel")}>
            <span>{t("qrLabel")}</span>
            {QR_MODES.map(mode => (
              <label key={mode} className={styles["check"]}>
                <input type="radio" name="qr" value={mode} checked={settings.qr === mode}
                  disabled={mode === "website" && !card.website.trim()} onChange={() => update({ qr: mode })} />
                {td(`qrModes.${mode}`)}
              </label>
            ))}
          </div>
          <button className={styles["secondary"]} type="button" onClick={() => update({ card: EMPTY_CARD })} disabled={empty}>{t("clear")}</button>
        </fieldset>
        <p className={controls.label}>{t("privacy")}</p>
      </div>

      {body && createPortal(
        <div className={styles["sheet"]} aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => <CardSvg key={i} {...shown} />)}
        </div>,
        body,
      )}
    </ToolLayout>
  );
}
