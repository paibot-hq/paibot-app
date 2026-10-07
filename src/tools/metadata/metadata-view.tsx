"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent } from "react";
import { useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import styles from "./metadata-view.module.css";
import { readMetadata, sensitive, stripMetadata, type Group, type Report } from "./index";

const GROUPS: Group[] = ["location", "time", "device", "person", "document", "custom", "shot", "image", "software", "text"];
const EXTRAS = ["xmp", "iptc", "comment", "trailer", "thumbnail", "makerNote", "comments", "trackedChanges"] as const;
const OFFICE = { docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation" } as const;

type Loaded = { name: string; size: number; type: string; bytes: Uint8Array; url: string; report: Report; width: number | null; height: number | null };
type Cleaned = { count: number; saved: number };

const sizeText = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`);

// A photo is looked into here and nowhere else: the file is read in the browser, its metadata is listed, and a copy without it can be saved. Nothing is
// sent to a server. For JPEG and PNG the copy is the same file with the metadata left out; for other formats the picture is drawn again (no metadata).
export default function MetadataView() {
  const t = useTranslations("App.metadata");
  const dynamic = t as unknown as ((key: string, values?: Record<string, string | number>) => string) & { has: (key: string) => boolean };
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [state, setState] = useState<"idle" | "reading" | "failed">("idle");
  const [cleaned, setCleaned] = useState<Cleaned | null>(null);
  const [cleanFailed, setCleanFailed] = useState(false);
  const [working, setWorking] = useState(false);
  const [over, setOver] = useState(false);
  const [anonymize, setAnonymize] = useState(false);
  const input = useRef<HTMLInputElement | null>(null);
  const url = useRef<string | null>(null);

  useEffect(() => () => { if (url.current) URL.revokeObjectURL(url.current); }, []);

  async function load(file: File | undefined) {
    if (!file) return;
    setState("reading"); setCleaned(null); setCleanFailed(false);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (url.current) URL.revokeObjectURL(url.current);
      url.current = URL.createObjectURL(file);
      const report = await readMetadata(bytes);
      const office = report.format === "docx" || report.format === "xlsx" || report.format === "pptx";
      const dimensions = office ? null : await new Promise<{ w: number; h: number } | null>(resolve => {
        const image = new Image();
        image.onload = () => resolve({ w: image.naturalWidth, h: image.naturalHeight });
        image.onerror = () => resolve(null);
        image.src = url.current!;
      });
      setAnonymize(false);
      // A file that is not a picture the browser (or this page) knows, nor an Office file, is refused.
      if (!dimensions && report.format === "other") { setLoaded(null); setState("failed"); return; }
      setLoaded({ name: file.name, size: file.size, type: file.type, bytes, url: url.current, report, width: dimensions?.w ?? null, height: dimensions?.h ?? null });
      setState("idle");
    } catch {
      setLoaded(null); setState("failed");
    }
  }

  function drop(event: DragEvent) {
    event.preventDefault(); setOver(false);
    void load(event.dataTransfer.files[0]);
  }
  function paste(event: ClipboardEvent) {
    const file = [...event.clipboardData.files].find(f => f.type.startsWith("image/"));
    if (file) { event.preventDefault(); void load(file); }
  }

  const download = (blob: Blob, name: string) => {
    const link = document.createElement("a");
    const href = URL.createObjectURL(blob);
    link.href = href; link.download = name;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  };

  async function clean() {
    if (!loaded) return;
    setWorking(true); setCleanFailed(false); setCleaned(null);
    try {
      const base = loaded.name.replace(/\.[^.]*$/, "") || "file";
      const format = loaded.report.format;
      let out: Uint8Array | null = await stripMetadata(loaded.bytes, { anonymizeAuthors: anonymize });
      let extension: string = format === "png" ? "png" : format === "jpeg" ? "jpg" : format;
      let type: string = format === "png" ? "image/png" : format === "jpeg" ? "image/jpeg" : format in OFFICE ? OFFICE[format as keyof typeof OFFICE] : "";
      if (!out) {
        // Another format of picture: it is drawn again, which leaves the metadata behind (and may change the quality a little).
        const bitmap = await createImageBitmap(new Blob([loaded.bytes as BlobPart], { type: loaded.type }));
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width; canvas.height = bitmap.height;
        canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
        const wanted = ["image/webp", "image/jpeg"].includes(loaded.type) ? loaded.type : "image/png";
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, wanted, 0.92));
        if (!blob) throw new Error("no blob");
        out = new Uint8Array(await blob.arrayBuffer());
        type = blob.type; extension = blob.type === "image/jpeg" ? "jpg" : blob.type === "image/webp" ? "webp" : "png";
      }
      download(new Blob([out as BlobPart], { type }), `${base}-clean.${extension}`);
      // What is left in the saved file, read back the same way.
      setCleaned({ count: (await readMetadata(out)).tags.filter(tag => tag.key !== "Orientation").length, saved: loaded.size - out.length });
    } catch {
      setCleanFailed(true);
    } finally {
      setWorking(false);
    }
  }

  const report = loaded?.report;
  const office = report?.format === "docx" || report?.format === "xlsx" || report?.format === "pptx";
  const hasAuthors = !!report?.tags.some(tag => tag.key === "CommentAuthor");
  const groups = report ? sensitive(report) : [];
  const label = (key: string) => (dynamic.has(`tags.${key}`) ? dynamic(`tags.${key}`) : key);
  const value = (key: string, text: string) => (key === "Orientation" && dynamic.has(`orientation.${text}`) ? `${text}（${dynamic(`orientation.${text}`)}）` : text);
  const mapUrl = report?.gps ? `https://www.openstreetmap.org/?mlat=${report.gps.lat.toFixed(6)}&mlon=${report.gps.lon.toFixed(6)}#map=15/${report.gps.lat.toFixed(6)}/${report.gps.lon.toFixed(6)}` : null;

  return (
    <ToolLayout title={t("title")} contentWidth="auto">
      <div className={styles.page} onPaste={paste}>
        <label className={styles.drop} data-over={over || undefined} onDragOver={event => { event.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={drop}>
          <input ref={input} type="file" accept="image/*,.docx,.xlsx,.pptx,.docm,.xlsm,.pptm" className={styles.file} onChange={event => { void load(event.target.files?.[0]); event.target.value = ""; }} data-meta="file" />
          <span className={styles.dropText}>{t("drop")}</span>
          <span className={styles.choose}>{t("choose")}</span>
        </label>
        <p className={controls.label} data-meta="privacy">{t("privacy")}</p>
        {state === "reading" && <p role="status" className={styles.status}>{t("reading")}</p>}
        {state === "failed" && <p role="alert" className={styles.error}>{t("readFailed")}</p>}

        {loaded && report && (
          <section className={styles.result} aria-label={t("fileInfo")} data-meta="result">
            <div className={styles.head}>
              {office ? <span className={styles.thumb} data-meta="document" aria-hidden="true">{report.format.toUpperCase()}</span> : <img className={styles.thumb} src={loaded.url} alt="" />}
              <dl className={styles.file_info}>
                <div><dt>{t("fileInfo")}</dt><dd data-meta="name">{loaded.name}</dd></div>
                <div><dt>{t("size")}</dt><dd>{sizeText(loaded.size)}</dd></div>
                {loaded.width && <div><dt>{t("dimensions")}</dt><dd>{loaded.width} × {loaded.height}</dd></div>}
                <div><dt>{t("type")}</dt><dd>{report.format === "jpeg" ? "JPEG" : report.format === "png" ? "PNG" : office ? report.format.toUpperCase() : loaded.type || "?"}</dd></div>
              </dl>
            </div>

            {report.format === "other" ? (
              <p className={styles.note} data-meta="verdict">{t("noneOther")}</p>
            ) : groups.length > 0 ? (
              <div className={styles.warning} role="status" data-meta="verdict">
                <strong>{t("foundTitle")}</strong>
                <ul>{groups.map(group => <li key={group}>{t(`sensitive.${group}`)}</li>)}</ul>
              </div>
            ) : (
              <p className={styles.ok} role="status" data-meta="verdict">{t("none")}</p>
            )}

            {report.gps && mapUrl && (
              <div className={styles.place} data-meta="place">
                <strong>{t("place")}</strong>
                <span className={styles.coordinates}>{t("coordinates", { lat: report.gps.lat.toFixed(6), lon: report.gps.lon.toFixed(6) })}</span>
                <a href={mapUrl} target="_blank" rel="noopener noreferrer">{t("openMap")}</a>
                <span className={styles.small}>{t("mapNote")}</span>
              </div>
            )}

            {GROUPS.map(group => {
              const tags = report.tags.filter(tag => tag.group === group);
              if (tags.length === 0) return null;
              return (
                <section key={group} className={styles.group} data-meta-group={group}>
                  <h2>{t(`groups.${group}`)}</h2>
                  <dl className={styles.tags}>
                    {tags.map(tag => <div key={`${tag.key}-${tag.value}`}><dt>{label(tag.key)}</dt><dd>{value(tag.key, tag.value)}</dd></div>)}
                  </dl>
                </section>
              );
            })}

            {(EXTRAS.some(key => report.extras[key]) || report.extras.embeddedPhotos > 0) && (
              <section className={styles.group}>
                <h2>{t("extrasTitle")}</h2>
                <ul className={styles.extras}>{EXTRAS.filter(key => report.extras[key]).map(key => <li key={key}>{t(`extras.${key}`)}</li>)}{report.extras.embeddedPhotos > 0 && <li>{t("extras.embeddedPhotos")}（{report.extras.embeddedPhotos}）</li>}</ul>
              </section>
            )}

            {hasAuthors && (
              <label className={styles.check}>
                <input type="checkbox" checked={anonymize} onChange={event => setAnonymize(event.target.checked)} data-meta="anonymize" /> {t("anonymize")}
              </label>
            )}
            <div className={styles.actions}>
              <button type="button" className="auth-link" onClick={clean} disabled={working} data-meta="clean">{working ? t("cleaning") : t("clean")}</button>
              <button type="button" className={styles.again} onClick={() => input.current?.click()}>{t("another")}</button>
            </div>
            <p className={styles.small}>{office ? t("cleanOffice") : report.format === "other" ? t("cleanRecode") : t("cleanLossless")}</p>
            {cleaned && (
              <p role="status" className={styles.ok} data-meta="cleaned">{t("cleaned")} {t("cleanedCheck", { count: cleaned.count })}{cleaned.saved > 0 ? `（−${sizeText(cleaned.saved)}）` : ""}</p>
            )}
            {cleanFailed && <p role="alert" className={styles.error}>{t("cleanFailed")}</p>}
          </section>
        )}
      </div>
    </ToolLayout>
  );
}
