"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import styles from "./noise-view.module.css";
import { noiseSound } from "./hiss";
import type { NoiseSettings } from "./noise";

// Seconds of sound made at a time, looped.
const LOOP = 4;
const FADE = 0.05;

type Voice = { source: AudioBufferSourceNode; fade: GainNode };
type Player = { ctx: AudioContext; volume: GainNode; voice: Voice | null };

// A looped sound of the noise, fading in.
function voiceFor(ctx: AudioContext, out: AudioNode, settings: NoiseSettings): Voice {
  const buffer = ctx.createBuffer(1, Math.round(ctx.sampleRate * LOOP), ctx.sampleRate);
  buffer.copyToChannel(noiseSound(settings, LOOP, ctx.sampleRate), 0);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const fade = ctx.createGain();
  fade.gain.setValueAtTime(0, ctx.currentTime);
  fade.gain.linearRampToValueAtTime(1, ctx.currentTime + FADE);
  source.connect(fade).connect(out);
  source.start();
  return { source, fade };
}

function silence(ctx: AudioContext, voice: Voice) {
  voice.fade.gain.setValueAtTime(voice.fade.gain.value, ctx.currentTime);
  voice.fade.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE);
  voice.source.stop(ctx.currentTime + FADE + 0.01);
}

// Plays the noise on the page as a sound ("ザー"), made anew when its settings change. The page puts the play button by
// the image and the volume with the other settings.
export function useNoiseHiss(settings: NoiseSettings) {
  const t = useTranslations("App.noise");
  const [volume, setVolume] = useState(0.5);
  const [playing, setPlaying] = useState(false);
  const playerRef = useRef<Player | null>(null);
  const { kind, seed, scale, octaves, gain, lacunarity } = settings;

  function start() {
    const ctx = new AudioContext();
    const out = ctx.createGain();
    out.gain.value = volume * 0.5;
    out.connect(ctx.destination);
    playerRef.current = { ctx, volume: out, voice: voiceFor(ctx, out, settings) };
    setPlaying(true);
  }

  function stop() {
    const player = playerRef.current;
    playerRef.current = null;
    setPlaying(false);
    if (player) void player.ctx.close();
  }

  // New settings make a new sound, once the slider has settled for a moment, crossfaded with the one playing.
  useEffect(() => {
    if (!playerRef.current) return;
    const timer = setTimeout(() => {
      const player = playerRef.current;
      if (!player) return;
      if (player.voice) silence(player.ctx, player.voice);
      player.voice = voiceFor(player.ctx, player.volume, { kind, seed, scale, octaves, gain, lacunarity });
    }, 120);
    return () => clearTimeout(timer);
  }, [kind, seed, scale, octaves, gain, lacunarity]);

  useEffect(() => {
    const player = playerRef.current;
    if (player) player.volume.gain.setTargetAtTime(volume * 0.5, player.ctx.currentTime, 0.05);
  }, [volume]);

  // Stop the sound when the page is left.
  useEffect(() => () => { void playerRef.current?.ctx.close(); }, []);

  const button = <button className="auth-link" type="button" aria-pressed={playing} onClick={playing ? stop : start} data-noise="play">{playing ? t("sound.stop") : t("sound.play")}</button>;
  const panel = (
    <label className={styles.row}>
      <span className={styles.name}>{t("sound.volume")}</span>
      <input type="range" min={0} max={1} step={0.05} value={volume} onChange={event => setVolume(Number(event.target.value))} />
      <span className={styles.value}>{Math.round(volume * 100)}%</span>
    </label>
  );
  return { button, panel };
}
