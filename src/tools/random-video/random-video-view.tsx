"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import styles from "./random-video.module.css";
import { BATCH, MAX_KEYWORD, SKIPPED_ERRORS, batchUrl, parseBatch, randomOffset, searchUrl, shuffle, tidyKeyword, type Video } from "./random-video";

// The little of the YouTube IFrame API used here (https://developers.google.com/youtube/iframe_api_reference).
type Player = { loadVideoById(id: string): void; destroy(): void };
type PlayerEvent = { data: number };
type YouTube = { Player: new (element: HTMLElement, options: object) => Player; PlayerState: { ENDED: number } };
declare global { interface Window { YT?: YouTube; onYouTubeIframeAPIReady?: () => void } }

// The API's script, loaded once, the first time a video is asked for (not when the page opens).
let api: Promise<YouTube> | null = null;
function loadApi(): Promise<YouTube> {
  api ??= new Promise((resolve, reject) => {
    if (window.YT?.Player) { resolve(window.YT); return; }
    window.onYouTubeIframeAPIReady = () => resolve(window.YT!);
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.onerror = () => { api = null; reject(new Error("player")); };
    document.head.appendChild(script);
  });
  return api;
}

export default function RandomVideo() {
  const t = useTranslations("App.randomVideo");
  const locale = useLocale();
  const host = useRef<HTMLDivElement | null>(null);
  const player = useRef<Player | null>(null);
  const queue = useRef<Video[]>([]);
  const fetching = useRef<Promise<void> | null>(null);
  // The keyword the videos are narrowed to (null: all of them), and a count of its changes: an answer asked for under
  // an earlier keyword is dropped when it comes.
  const keywordRef = useRef<string | null>(null);
  const generation = useRef(0);
  const [draft, setDraft] = useState("");
  const [keyword, setKeyword] = useState<string | null>(null);
  const [found, setFound] = useState<number | null>(null);
  const [current, setCurrent] = useState<Video | null>(null);
  const currentRef = useRef<Video | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState<"wikidata" | "player" | "none" | null>(null);
  const [skipped, setSkipped] = useState(0);
  const [auto, setAuto] = useState(true);
  const autoRef = useRef(auto);
  autoRef.current = auto;

  // More videos onto the end of the queue, shuffled: fifty from a random place in Wikidata's list, or everything the
  // keyword finds (again, reshuffled, when they have all been played; not the one just played first).
  const refill = () => {
    const asked = generation.current;
    const word = keywordRef.current;
    fetching.current ??= fetch(word ? searchUrl(word, locale) : batchUrl(randomOffset(Math.random), locale), { headers: { Accept: "application/sparql-results+json" } })
      .then(response => { if (!response.ok) throw new Error(String(response.status)); return response.json(); })
      .then(answer => {
        if (asked !== generation.current) return;
        const videos = shuffle(parseBatch(answer), Math.random);
        if (word) {
          setFound(videos.length);
          if (!videos.length) throw Object.assign(new Error("none"), { none: true });
          if (videos.length > 1 && videos[0].id === currentRef.current?.id) videos.push(videos.shift()!);
        }
        queue.current.push(...videos);
      })
      .finally(() => { if (asked === generation.current) fetching.current = null; });
    return fetching.current;
  };

  // The next video: from the queue, which is topped up in the background before it runs dry.
  const next = async () => {
    setLoading(true);
    setFailed(null);
    try {
      if (!queue.current.length) await refill();
      const video = queue.current.shift();
      if (!video) throw new Error("empty");
      if (!keywordRef.current && queue.current.length < BATCH / 5) void refill().catch(() => { /* tried again when the queue is empty */ });
      currentRef.current = video;
      setCurrent(video);
      const YT = await loadApi().catch(() => { throw Object.assign(new Error("player"), { player: true }); });
      if (player.current) player.current.loadVideoById(video.id);
      else if (host.current) {
        player.current = new YT.Player(host.current, {
          host: "https://www.youtube-nocookie.com",
          videoId: video.id,
          playerVars: { autoplay: 1, playsinline: 1, rel: 0 },
          events: {
            onError: (event: PlayerEvent) => { if (SKIPPED_ERRORS.has(event.data)) { setSkipped(n => n + 1); void next(); } },
            onStateChange: (event: PlayerEvent) => { if (event.data === YT.PlayerState.ENDED && autoRef.current) void next(); },
          },
        });
      }
    } catch (error) {
      const why = error as { player?: boolean; none?: boolean };
      setFailed(why.player ? "player" : why.none ? "none" : "wikidata");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => () => { player.current?.destroy(); player.current = null; }, []);

  // A keyword in the address (?q=jazz), as a shared link carries it, is filled in; the video starts on a press.
  useEffect(() => {
    const word = tidyKeyword(new URLSearchParams(window.location.search).get("q") ?? "");
    if (word) { setDraft(word); setKeyword(word); keywordRef.current = word; }
  }, []);

  // A new keyword (or none) starts afresh: the queue and any answer on its way are dropped, the address keeps the
  // keyword, and a video from it plays.
  const search = (event: FormEvent) => {
    event.preventDefault();
    const word = tidyKeyword(draft) || null;
    generation.current++;
    fetching.current = null;
    queue.current = [];
    keywordRef.current = word;
    setKeyword(word);
    setFound(null);
    const url = new URL(window.location.href);
    if (word) url.searchParams.set("q", word); else url.searchParams.delete("q");
    window.history.replaceState(window.history.state, "", url);
    void next();
  };

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      <form className={styles.search} role="search" onSubmit={search} data-random-video="search">
        <input type="search" value={draft} maxLength={MAX_KEYWORD} onChange={event => setDraft(event.target.value)} placeholder={t("keywordPlaceholder")} aria-label={t("keyword")} enterKeyHint="search" />
        <button type="submit" disabled={loading}>{t("searchButton")}</button>
      </form>
      {keyword && found !== null && found > 0 && <p className={styles.found} data-random-video="found">{t("found", { keyword, count: found })}</p>}
      <div className={styles.screen} data-random-video="screen">
        {/* The YouTube player replaces this element once a video is asked for. */}
        <div ref={host} className={styles.player} />
        {!current && (
          <button type="button" className={styles.start} onClick={() => void next()} disabled={loading} data-random-video="start">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
            {loading ? t("loading") : t("start")}
          </button>
        )}
      </div>
      {current && (
        <div className={styles.info} data-random-video="info" data-video={current.id}>
          <p className={styles.title}>{current.title}</p>
          {current.description && <p className={styles.description}>{current.description}</p>}
          <p className={styles.links}>
            <a href={`https://www.youtube.com/watch?v=${current.id}`} target="_blank" rel="noopener noreferrer">{t("onYoutube")}</a>
            <a href={`https://www.wikidata.org/wiki/${current.item}`} target="_blank" rel="noopener noreferrer">{t("onWikidata")}</a>
          </p>
        </div>
      )}
      <div className={styles.buttons}>
        {current && <button className="auth-link" type="button" onClick={() => void next()} disabled={loading} data-random-video="next">{loading ? t("loading") : t("next")}</button>}
        <label className={styles.auto}>
          <input type="checkbox" checked={auto} onChange={event => setAuto(event.target.checked)} />
          {t("auto")}
        </label>
      </div>
      {failed && (
        <p className={styles.error} role="alert">
          {failed === "none" ? t("none", { keyword: keyword ?? "" }) : <>{t(failed === "player" ? "playerFailed" : "wikidataFailed")}{" "}
          <button type="button" className={styles.retry} onClick={() => void next()}>{t("retry")}</button></>}
        </p>
      )}
      {skipped > 0 && <p className={styles.note} data-random-video="skipped">{t("skipped", { count: skipped })}</p>}
      <p className={styles.note}>{t("hint")}</p>
    </ToolLayout>
  );
}
