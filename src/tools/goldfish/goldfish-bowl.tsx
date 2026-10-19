"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import styles from "./goldfish.module.css";
import { KINDS, MAX_FISH, type Kind } from "./swim";
import type { Aquarium, Stats } from "./scene.client";

const SAVE_KEY = "paibot-app-goldfish";
const START: Kind[] = ["wakin", "ryukin", "demekin"];

// The fish in the bowl and the light, kept on this device so the bowl is as it was left.
function load(): { kinds: Kind[]; night: boolean } {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) ?? "null") as { kinds?: unknown; night?: unknown } | null;
    const kinds = Array.isArray(saved?.kinds) ? saved.kinds.filter((k): k is Kind => KINDS.includes(k as Kind)).slice(0, MAX_FISH) : START;
    return { kinds, night: saved?.night === true };
  } catch { return { kinds: START, night: false }; }
}

export default function GoldfishBowl() {
  const t = useTranslations("App.goldfish");
  const stage = useRef<HTMLDivElement | null>(null);
  const aquarium = useRef<Aquarium | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unsupported">("loading");
  const [stats, setStats] = useState<Stats>({ fish: 0, food: 0, eaten: 0, kinds: [] });
  const [night, setNight] = useState(false);

  // The 3D drawing (three.js) is loaded only here, in the browser (a .client module: the server build leaves it out).
  useEffect(() => {
    let cancelled = false;
    const saved = load();
    setNight(saved.night);
    void (async () => {
      const { createAquarium, loadFishTextures, webglAvailable } = await import("./scene.client");
      if (cancelled || !stage.current) return;
      if (!webglAvailable()) { setStatus("unsupported"); return; }
      const textures = await loadFishTextures();
      if (cancelled || !stage.current) return;
      aquarium.current = createAquarium(stage.current, { kinds: saved.kinds, night: saved.night, textures, onStats: setStats });
      setStatus("ready");
    })().catch(() => { if (!cancelled) setStatus("unsupported"); });
    return () => { cancelled = true; aquarium.current?.dispose(); aquarium.current = null; };
  }, []);

  useEffect(() => {
    if (status !== "ready") return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ kinds: stats.kinds, night })); } catch { /* optional */ }
  }, [stats.kinds.join(","), night, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleNight = () => { const value = !night; setNight(value); aquarium.current?.setNight(value); };
  const ready = status === "ready";
  const full = stats.fish >= MAX_FISH;

  return (
    <ToolLayout title={t("title")}>
      <p className={styles.lead}>{t("intro")}</p>
      <div className={`${styles.stage} ${night ? styles.night : ""}`} data-goldfish="stage" data-status={status} data-fish={stats.fish} data-food={stats.food} data-eaten={stats.eaten}>
        <div ref={stage} className={styles.canvas} role="img" aria-label={t("sceneLabel", { count: stats.fish })} />
        {status === "loading" && <p className={styles.message}>{t("loading")}</p>}
        {status === "unsupported" && <p className={styles.message} data-goldfish="unsupported">{t("unsupported")}</p>}
        {ready && <p className={styles.counts} aria-live="polite"><span data-goldfish="count">{t("count", { count: stats.fish })}</span><span>{t("eaten", { count: stats.eaten })}</span></p>}
      </div>
      <div className={styles.controls}>
        <button type="button" className={styles.primary} disabled={!ready} onClick={() => aquarium.current?.feed()} data-goldfish="feed">{t("feed")}</button>
        <button type="button" className={styles.button} disabled={!ready} onClick={toggleNight} aria-pressed={night} data-goldfish="night">{t(night ? "day" : "night")}</button>
        <button type="button" className={styles.button} disabled={!ready} onClick={() => aquarium.current?.resetView()} data-goldfish="view">{t("resetView")}</button>
      </div>
      <div className={styles.controls} role="group" aria-label={t("addLabel")}>
        {KINDS.map(kind => (
          <button key={kind} type="button" className={styles.button} disabled={!ready || full} onClick={() => aquarium.current?.addFish(kind)} data-goldfish-add={kind}>
            <span className={styles.swatch} data-kind={kind} aria-hidden="true" />{t("add", { kind: t(`kinds.${kind}`) })}
          </button>
        ))}
        <button type="button" className={styles.button} disabled={!ready || stats.fish === 0} onClick={() => aquarium.current?.removeFish()} data-goldfish="remove">{t("remove")}</button>
      </div>
      {full && <p className={styles.note}>{t("full", { max: MAX_FISH })}</p>}
      <ul className={styles.howto}>
        <li>{t("howDrag")}</li>
        <li>{t("howFeed")}</li>
        <li>{t("howTap")}</li>
      </ul>
      <p className={styles.note}>{t("hint")}</p>
    </ToolLayout>
  );
}
