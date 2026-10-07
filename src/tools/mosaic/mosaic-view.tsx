"use client";

import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type DragEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import styles from "./mosaic-view.module.css";
import { DEFAULT_LEVEL, add, clear, empty, fit, penWidth, redo, savedName, undo, usable, type Effect, type History, type Point, type Region, type Shape } from "./mosaic";
import { paintAll, paintRegion } from "./paint";

const SHAPES: Shape[] = ["rect", "ellipse", "pen"];
const EFFECTS: Effect[] = ["mosaic", "blur", "black"];

type Picture = { bitmap: ImageBitmap; name: string; type: string };

// Hiding parts of a photo: drag a rectangle or an ellipse, or paint with the pen, and the part is covered with a mosaic, a blur or black. The mosaic
// is as coarse as the part is large, so that it cannot be undone. The photo stays in the browser; the saved file is made again from the full-size
// picture, so it carries no metadata (position and the like) either.
export default function MosaicView() {
  const t = useTranslations("App.mosaic");
  const [picture, setPicture] = useState<Picture | null>(null);
  const [failed, setFailed] = useState(false);
  const [history, setHistory] = useState<History>(empty);
  const [shape, setShape] = useState<Shape>("rect");
  const [effect, setEffect] = useState<Effect>("mosaic");
  const [level, setLevel] = useState(DEFAULT_LEVEL);
  const [pen, setPen] = useState(40);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [over, setOver] = useState(false);
  const [room, setRoom] = useState(720);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stage = useRef<HTMLDivElement | null>(null);
  const drawing = useRef<Region | null>(null);
  const input = useRef<HTMLInputElement | null>(null);

  const view = picture ? fit(picture.bitmap.width, picture.bitmap.height, room, Math.round(typeof window === "undefined" ? 600 : window.innerHeight * 0.7)) : null;

  // The width the picture may take follows the page.
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const measure = () => setRoom(Math.max(200, Math.floor(element.clientWidth)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [picture]);

  const render = useCallback(() => {
    const element = canvasRef.current;
    if (!element || !picture || !view) return;
    element.width = view.width; element.height = view.height;
    const context = element.getContext("2d")!;
    const { width, height } = picture.bitmap;
    paintAll(context, picture.bitmap, history.done, width, height, view.scale);
    if (drawing.current) paintRegion(context, picture.bitmap, drawing.current, width, height, view.scale);
  }, [picture, view?.width, view?.height, view?.scale, history.done]);
  useEffect(render, [render]);

  async function load(file: File | undefined) {
    if (!file) return;
    setFailed(false); setSaved(false); setSaveFailed(false);
    try {
      // The browser turns the photo upright as its orientation says.
      const bitmap = await createImageBitmap(file);
      picture?.bitmap.close();
      setPicture({ bitmap, name: file.name, type: file.type });
      setHistory(empty);
    } catch {
      setFailed(true);
    }
  }
  const drop = (event: DragEvent) => { event.preventDefault(); setOver(false); void load(event.dataTransfer.files[0]); };
  const paste = (event: ClipboardEvent) => {
    const file = [...event.clipboardData.files].find(f => f.type.startsWith("image/"));
    if (file) { event.preventDefault(); void load(file); }
  };

  const toPicture = (event: ReactPointerEvent<HTMLCanvasElement>): Point => {
    const box = event.currentTarget.getBoundingClientRect();
    const scale = view!.scale;
    return { x: ((event.clientX - box.left) * (event.currentTarget.width / box.width)) / scale, y: ((event.clientY - box.top) * (event.currentTarget.height / box.height)) / scale };
  };
  const start = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!picture || !view) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const p = toPicture(event);
    drawing.current = shape === "pen" ? { shape, effect, level, width: penWidth(pen, view.scale), points: [p] } : { shape, effect, level, a: p, b: p };
    setSaved(false);
    render();
  };
  const move = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const region = drawing.current;
    if (!region) return;
    const p = toPicture(event);
    if (region.shape === "pen") region.points.push(p); else region.b = p;
    render();
  };
  const finish = () => {
    const region = drawing.current;
    drawing.current = null;
    if (region && picture && usable(region, picture.bitmap.width, picture.bitmap.height)) setHistory(h => add(h, region));
    else render();
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z" || (event.target as HTMLElement)?.tagName === "INPUT") return;
      event.preventDefault();
      setHistory(h => (event.shiftKey ? redo(h) : undo(h)));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function save() {
    if (!picture) return;
    setSaving(true); setSaveFailed(false); setSaved(false);
    try {
      const { bitmap } = picture;
      const full = document.createElement("canvas");
      full.width = bitmap.width; full.height = bitmap.height;
      paintAll(full.getContext("2d")!, bitmap, history.done, bitmap.width, bitmap.height, 1);
      // The format it came in when that is one of these; otherwise PNG.
      const type = picture.type === "image/jpeg" || picture.type === "image/webp" ? picture.type : "image/png";
      const blob = await new Promise<Blob | null>(resolve => full.toBlob(resolve, type, 0.92));
      if (!blob) throw new Error("no blob");
      const link = document.createElement("a");
      const href = URL.createObjectURL(blob);
      link.href = href;
      link.download = savedName(picture.name, blob.type === "image/jpeg" ? "jpg" : blob.type === "image/webp" ? "webp" : "png");
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(href), 1000);
      setSaved(true);
    } catch {
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  }

  const choice = <T extends string>(items: readonly T[], value: T, set: (next: T) => void, name: (item: T) => string, kind: string) => (
    <div className={styles.choices} role="group" aria-label={t(`${kind}Label` as "shapeLabel")}>
      {items.map(item => <button key={item} type="button" className={styles.choice} aria-pressed={value === item} onClick={() => set(item)} data-mosaic={`${kind}-${item}`}>{name(item)}</button>)}
    </div>
  );

  return (
    <ToolLayout title={t("title")} contentWidth="auto">
      <div className={styles.page} onPaste={paste}>
        {!picture && (
          <label className={styles.drop} data-over={over || undefined} onDragOver={event => { event.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={drop}>
            <input ref={input} type="file" accept="image/*" className={styles.file} onChange={event => { void load(event.target.files?.[0]); event.target.value = ""; }} data-mosaic="file" />
            <span className={styles.dropText}>{t("drop")}</span>
            <span className={styles.choose}>{t("choose")}</span>
          </label>
        )}
        {picture && <input ref={input} type="file" accept="image/*" className={styles.file} onChange={event => { void load(event.target.files?.[0]); event.target.value = ""; }} data-mosaic="file" />}
        <p className={controls.label} data-mosaic="privacy">{t("privacy")}</p>
        {failed && <p role="alert" className={styles.error}>{t("readFailed")}</p>}

        {picture && view && (
          <section className={styles.editor} aria-label={t("title")} data-mosaic="editor">
            <div className={styles.tools}>
              {choice(SHAPES, shape, setShape, item => t(`shapes.${item}`), "shape")}
              {choice(EFFECTS, effect, setEffect, item => t(`effects.${item}`), "effect")}
              {effect !== "black" && (
                <label className={styles.slider}>{t("level")}
                  <input type="range" min={1} max={5} step={1} value={level} onChange={event => setLevel(Number(event.target.value))} data-mosaic="level" />
                </label>
              )}
              {shape === "pen" && (
                <label className={styles.slider}>{t("penSize")}
                  <input type="range" min={10} max={120} step={5} value={pen} onChange={event => setPen(Number(event.target.value))} data-mosaic="pen" />
                </label>
              )}
            </div>
            <div ref={stage} className={styles.stage}>
              <canvas ref={canvasRef} className={styles.canvas} width={view.width} height={view.height} aria-label={t("canvasLabel")} role="img"
                onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} data-mosaic="canvas" />
            </div>
            <p className={styles.small}>{t("hint")}</p>
            <div className={styles.actions}>
              <button type="button" className={styles.plain} onClick={() => setHistory(undo)} disabled={history.done.length === 0} data-mosaic="undo">{t("undo")}</button>
              <button type="button" className={styles.plain} onClick={() => setHistory(redo)} disabled={history.undone.length === 0} data-mosaic="redo">{t("redo")}</button>
              <button type="button" className={styles.plain} onClick={() => setHistory(clear)} disabled={history.done.length === 0} data-mosaic="clear">{t("clearAll")}</button>
              <span className={styles.count} data-mosaic="count">{t("count", { count: history.done.length })}</span>
            </div>
            <div className={styles.actions}>
              <button type="button" className="auth-link" onClick={save} disabled={saving} data-mosaic="save">{saving ? t("saving") : t("save")}</button>
              <button type="button" className={styles.plain} onClick={() => input.current?.click()}>{t("another")}</button>
            </div>
            <p className={styles.small}>{t("note")}</p>
            {saved && <p role="status" className={styles.ok} data-mosaic="saved">{t("saved")}</p>}
            {saveFailed && <p role="alert" className={styles.error}>{t("saveFailed")}</p>}
          </section>
        )}
      </div>
    </ToolLayout>
  );
}
