"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import styles from "./noise-view.module.css";
import { useNoiseHiss } from "./noise-hiss";
import { NOISE_KINDS, PALETTES, colour, render, stretch, type NoiseKind, type NoiseSettings, type Palette } from "./noise";

const SIZE = 512;

type Settings = NoiseSettings & { palette: Palette };
const DEFAULTS: Settings = { kind: "perlin", seed: 1, scale: 4, octaves: 4, gain: 0.5, lacunarity: 2, palette: "gray" };
// Worley noise shows its cells with one octave; layered, they melt into clouds. The others start with four.
const octavesFor = (kind: NoiseKind) => (kind === "worley" ? 1 : 4);

export default function Noise() {
  const t = useTranslations("App.noise");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const change = (patch: Partial<Settings>) => setSettings(current => ({ ...current, ...patch }));
  const white = settings.kind === "white";

  // Drawn on the next frame, so dragging a slider redraws once per frame at most.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      canvas.width = SIZE;
      canvas.height = SIZE;
      const values = stretch(render(settings, SIZE, SIZE));
      const image = ctx.createImageData(SIZE, SIZE);
      for (let i = 0; i < values.length; i++) {
        const [r, g, b] = colour(settings.palette, values[i]);
        image.data[i * 4] = r;
        image.data[i * 4 + 1] = g;
        image.data[i * 4 + 2] = b;
        image.data[i * 4 + 3] = 255;
      }
      ctx.putImageData(image, 0, 0);
    });
    return () => cancelAnimationFrame(frame);
  }, [settings]);

  const sound = useNoiseHiss(settings);

  function save() {
    canvasRef.current?.toBlob(blob => {
      if (!blob) return;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `noise-${settings.kind}-${settings.seed}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    });
  }

  const slider = (key: "scale" | "octaves" | "gain" | "lacunarity", min: number, max: number, step: number) => (
    <label className={styles.row}>
      <span className={styles.name}>{t(key)}</span>
      <input type="range" min={min} max={max} step={step} value={settings[key]} disabled={white} onChange={event => change({ [key]: Number(event.target.value) })} />
      <span className={styles.value}>{settings[key]}</span>
    </label>
  );

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <div className={styles.kinds} role="group" aria-label={t("kind")}>
        {NOISE_KINDS.map(kind => <button key={kind} type="button" className={styles.choice} aria-pressed={settings.kind === kind} onClick={() => change({ kind, octaves: octavesFor(kind) })} data-noise-kind={kind}>{t(`kinds.${kind}`)}</button>)}
      </div>
      <div className={styles.stage}>
        <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label={t("canvasLabel", { kind: t(`kinds.${settings.kind}`) })} />
      </div>
      <p className={styles.note}>{t(`notes.${settings.kind}`)}</p>
      <div className={styles.buttons}>
        {sound.button}
        <button className={styles.button} type="button" onClick={() => change({ seed: Math.floor(Math.random() * 100000) })} data-noise="reseed">{t("reseed")}</button>
        <button className={styles.button} type="button" onClick={save}>{t("save")}</button>
      </div>
      <div className={styles.panel}>
        {slider("scale", 1, 32, 1)}
        {slider("octaves", 1, 8, 1)}
        {slider("gain", 0.2, 0.8, 0.05)}
        {slider("lacunarity", 1.5, 3, 0.1)}
        <label className={styles.row}>
          <span className={styles.name}>{t("seed")}</span>
          <input className={styles.seed} type="number" min={0} max={99999} step={1} value={settings.seed} onChange={event => change({ seed: Math.max(0, Math.floor(Number(event.target.value) || 0)) })} />
        </label>
        <div className={styles.row} role="group" aria-label={t("palette")}>
          <span className={styles.name}>{t("palette")}</span>
          <span className={styles.group}>
            {PALETTES.map(palette => <button key={palette} type="button" className={styles.choice} aria-pressed={settings.palette === palette} onClick={() => change({ palette })}>{t(`palettes.${palette}`)}</button>)}
          </span>
        </div>
        {sound.panel}
      </div>
      <p className={styles.hint}>{t("hint")}</p>
    </ToolLayout>
  );
}
