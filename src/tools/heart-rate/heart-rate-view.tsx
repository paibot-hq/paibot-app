"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import ShareButtons from "../../components/share-buttons";
import styles from "./heart-rate.module.css";
import { MEASURE_S, estimateBpm, isClear, isFinger, measure, pulseWave, resample, type Sample } from "./pulse";

type Phase = "idle" | "starting" | "waiting" | "measuring" | "result" | "unclear" | "denied" | "unsupported";
// How small the frame is read: its average colour is all that is wanted, and a tiny picture is quick to read.
const W = 32, H = 24;
// A finger lifted for longer than this starts the measurement over.
const LIFTED_S = 0.6;

export default function HeartRate() {
  const t = useTranslations("App.heartRate");
  const locale = useLocale();
  const video = useRef<HTMLVideoElement | null>(null);
  const wave = useRef<HTMLCanvasElement | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const frame = useRef(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [live, setLive] = useState<number | null>(null);
  const [bpm, setBpm] = useState<number | null>(null);
  const [torch, setTorch] = useState(false);

  function stop() {
    cancelAnimationFrame(frame.current);
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }
  useEffect(() => stop, []);

  // The pulse wave of the last five seconds, drawn as it comes.
  function drawWave(samples: Sample[]) {
    const canvas = wave.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const now = samples[samples.length - 1]?.t ?? 0;
    const recent = samples.filter(s => s.t > now - 5).map(s => ({ t: s.t, v: s.r }));
    const values = pulseWave(resample(recent));
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    if (values.length < 2) return;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.strokeStyle = getComputedStyle(canvas).color;
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height / 2 - v * height * 0.4;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    });
    ctx.stroke();
  }

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia) { setPhase("unsupported"); return; }
    setPhase("starting");
    setBpm(null);
    setLive(null);
    setProgress(0);
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 320 }, height: { ideal: 240 } }, audio: false });
    } catch {
      setPhase("denied");
      return;
    }
    // The light, where the phone lets a page turn it on: it shines through the fingertip and makes the pulse clearer.
    const track = stream.current.getVideoTracks()[0];
    const capabilities = (track.getCapabilities?.() ?? {}) as { torch?: boolean };
    if (capabilities.torch) {
      try { await track.applyConstraints({ advanced: [{ torch: true } as MediaTrackConstraintSet] }); setTorch(true); } catch { setTorch(false); }
    }
    const el = video.current!;
    el.srcObject = stream.current;
    await el.play().catch(() => {});
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    let samples: Sample[] = [];
    let begun = 0, lifted = 0;
    setPhase("waiting");
    const loop = () => {
      frame.current = requestAnimationFrame(loop);
      if (el.readyState < 2) return;
      ctx.drawImage(el, 0, 0, W, H);
      const { data } = ctx.getImageData(0, 0, W, H);
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
      const n = data.length / 4;
      const now = performance.now() / 1000;
      const colour = { r: r / n, g: g / n, b: b / n };
      if (!isFinger(colour)) {
        // Lifted: after a moment, start over and say so.
        if (!lifted) lifted = now;
        if (now - lifted > LIFTED_S && samples.length) { samples = []; begun = 0; setPhase("waiting"); setProgress(0); setLive(null); drawWave([]); }
        return;
      }
      lifted = 0;
      if (!begun) { begun = now; setPhase("measuring"); }
      samples.push({ t: now - begun, ...colour });
      const elapsed = now - begun;
      setProgress(Math.min(1, elapsed / MEASURE_S));
      drawWave(samples);
      if (samples.length % 15 === 0 && elapsed > 6) {
        const guess = estimateBpm(pulseWave(resample(samples.filter(s => s.t > 2).map(s => ({ t: s.t, v: s.r })))));
        setLive(guess && isClear(guess.quality) ? guess.bpm : null);
      }
      if (elapsed >= MEASURE_S) {
        stop();
        const result = measure(samples);
        if (result && isClear(result.quality)) { setBpm(result.bpm); setPhase("result"); }
        else setPhase("unclear");
      }
    };
    frame.current = requestAnimationFrame(loop);
  }

  const busy = phase === "starting" || phase === "waiting" || phase === "measuring";
  const left = Math.ceil(MEASURE_S * (1 - progress));

  return (
    <ToolLayout title={t("title")}>
      <p className={styles.lead}>{t("intro")}</p>
      <div className={styles.stage} data-heart="stage" data-phase={phase}>
        {/* The camera's picture, small: it shows red when the finger is on the lens. */}
        <video ref={video} className={styles.preview} playsInline muted aria-hidden="true" />
        {phase === "result" && bpm !== null ? (
          <div className={styles.result} data-heart="result">
            <span className={styles.heart} style={{ animationDuration: `${60 / bpm}s` }} aria-hidden="true">❤</span>
            <p className={styles.bpm} data-heart="bpm">{bpm}<span>{t("unit")}</span></p>
            <p className={styles.band}>{t(bpm < 60 ? "bandSlow" : bpm <= 100 ? "bandRest" : "bandFast")}</p>
          </div>
        ) : (
          <div className={styles.live}>
            {(phase === "idle" || phase === "starting") && <span className={styles.picture} aria-hidden="true">☝️📱</span>}
            <canvas ref={wave} className={styles.wave} hidden={phase === "idle" || phase === "starting"} width={600} height={160} aria-hidden="true" />
            <p className={styles.status} role="status" data-heart="status">
              {phase === "idle" && t("ready")}
              {phase === "starting" && t("starting")}
              {phase === "waiting" && t("cover")}
              {phase === "measuring" && (live ? t("measuringLive", { bpm: live, left }) : t("measuring", { left }))}
              {phase === "unclear" && t("unclear")}
              {phase === "denied" && t("denied")}
              {phase === "unsupported" && t("unsupported")}
            </p>
            {phase === "measuring" && <progress className={styles.progress} max={1} value={progress} aria-label={t("progressLabel")} />}
          </div>
        )}
      </div>
      {!busy && (
        <button type="button" className={styles.start} onClick={() => void start()} data-heart="start">
          {phase === "idle" || phase === "denied" || phase === "unsupported" ? t("start") : t("again")}
        </button>
      )}
      {busy && <button type="button" className={styles.cancel} onClick={() => { stop(); setPhase("idle"); }} data-heart="cancel">{t("cancel")}</button>}
      {busy && <p className={styles.note}>{torch ? t("torchOn") : t("noTorch")}</p>}
      {phase === "result" && bpm !== null && <ShareButtons text={t("shareText", { bpm })} path={`/${locale}/heart-rate`} />}
      <ol className={styles.steps}>
        <li>{t("step1")}</li>
        <li>{t("step2")}</li>
        <li>{t("step3")}</li>
      </ol>
      <p className={styles.note}>{t("hint")}</p>
    </ToolLayout>
  );
}
