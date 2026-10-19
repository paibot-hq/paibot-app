"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { useLocale, useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import ShareButtons from "../../components/share-buttons";
import TypingChart from "./typing-chart";
import styles from "./typing.module.css";
import { ROUND_S, accuracy, isKeptResult, keysPerSecond, rank, score, stageOf, topPercent, type Distribution, type Round } from "./game";
import { advance, parse, parseEnglish, start, type Unit } from "./romaji";
import { poolFor, type Mode, type Word } from "./words";
import type { action } from "./route";

type Phase = "idle" | "playing" | "result";

// The key pressed, as the letter it types in romaji: from the physical key (event.code), so that a Japanese input method
// left on (which gives event.key "Process" or a kana) still types the letters. Null for keys that type nothing.
function letterOf(event: KeyboardEvent): string | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  const code = event.code;
  if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
  if (code === "Minus") return "-";
  if (code === "Comma") return ",";
  if (code === "Period") return ".";
  if (code === "Quote") return "'";
  if (code === "Space") return " ";
  if (code === "Slash" && event.shiftKey) return "?";
  if (code === "Digit1" && event.shiftKey) return "!";
  return event.key.length === 1 && /[-,.?!' ]/.test(event.key) ? event.key : null;
}

const drawWord = (mode: Mode, stage: number, last: string | null): Word => {
  const words = poolFor(mode, stage).filter(w => w.kana !== last);
  return words[Math.floor(Math.random() * words.length)];
};
const unitsOf = (mode: Mode, word: Word) => (mode === "en" ? parseEnglish(word.kana) : parse(word.kana));
const BEST_KEY = { ja: "paibot-app-typing-best", en: "paibot-app-typing-best-en" } as const;

// `distributions`: everyone's scores in each mode (null if they could not be read); `locale`: the page's language, which
// sets the mode the game starts in (Japanese words on the Japanese page, English on the others).
export default function TypingGame({ distributions, locale: pageLocale }: { distributions: Record<Mode, Distribution> | null; locale: string }) {
  const t = useTranslations("App.typing");
  const locale = useLocale();
  const fetcher = useFetcher<typeof action>();
  const [phase, setPhase] = useState<Phase>("idle");
  const [mode, setMode] = useState<Mode>(pageLocale === "ja" ? "ja" : "en");
  const [word, setWord] = useState<Word | null>(null);
  const [typed, setTyped] = useState("");
  const [shown, setShown] = useState("");
  const [left, setLeft] = useState(ROUND_S);
  const [round, setRound] = useState<Round>({ keys: 0, misses: 0, words: 0 });
  const [shake, setShake] = useState(0);
  const [bests, setBests] = useState<Record<Mode, number | null>>({ ja: null, en: null });
  const roundRef = useRef(round);
  const startedAt = useRef(0);
  roundRef.current = round;
  const units: Unit[] | null = useMemo(() => (word ? unitsOf(mode, word) : null), [word, mode]);
  const best = bests[mode];
  const distribution = distributions?.[mode] ?? null;

  useEffect(() => {
    const read = (key: string) => { try { const v = Number(localStorage.getItem(key)); return Number.isFinite(v) && v > 0 ? v : null; } catch { return null; } };
    setBests({ ja: read(BEST_KEY.ja), en: read(BEST_KEY.en) });
  }, []);

  function next(words: number, last: string | null) {
    const w = drawWord(mode, stageOf(words), last);
    const parsed = unitsOf(mode, w);
    setWord(w);
    setTyped("");
    // The way shown for the whole word, before anything is typed: the first key of the shortest way.
    setShown(parsed ? start(parsed).shown : "");
  }

  function begin() {
    setRound({ keys: 0, misses: 0, words: 0 });
    setLeft(ROUND_S);
    startedAt.current = performance.now();
    setPhase("playing");
    next(0, null);
  }

  function finish() {
    const r = roundRef.current;
    const points = score(r);
    setPhase("result");
    if (points > (bests[mode] ?? 0)) {
      setBests(prev => ({ ...prev, [mode]: points }));
      try { localStorage.setItem(BEST_KEY[mode], String(points)); } catch { /* optional */ }
    }
    if (isKeptResult(points, r.keys, r.misses)) fetcher.submit({ mode, score: String(points), keys: String(r.keys), misses: String(r.misses) }, { method: "post" });
  }

  // The clock.
  useEffect(() => {
    if (phase !== "playing") return;
    const timer = setInterval(() => {
      const remaining = Math.max(0, ROUND_S - (performance.now() - startedAt.current) / 1000);
      setLeft(remaining);
      if (remaining <= 0) { clearInterval(timer); finish(); }
    }, 100);
    return () => clearInterval(timer);
    // finish reads the round through a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // The keys.
  useEffect(() => {
    if (phase !== "playing" || !units || !word) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setPhase("idle"); return; }
      const letter = letterOf(event);
      if (!letter || event.repeat) return;
      event.preventDefault();
      const step = advance(units, typed, letter);
      if (!step.ok) { setRound(r => ({ ...r, misses: r.misses + 1 })); setShake(n => n + 1); return; }
      setRound(r => ({ ...r, keys: r.keys + 1 }));
      setTyped(step.typed);
      setShown(step.shown);
      if (step.done) {
        const words = roundRef.current.words + 1;
        setRound(r => ({ ...r, words }));
        next(words, word.kana);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const result = phase === "result" ? round : null;
  const points = result ? score(result) : 0;
  const posted = fetcher.data && "better" in fetcher.data ? fetcher.data : null;
  const failed = fetcher.data && "error" in fetcher.data ? fetcher.data.error : null;
  const top = posted ? topPercent(posted.better, posted.same, posted.distribution.total) : null;
  // A reply is for the mode it was sent in; after switching mode on the result screen, show that mode's own chart.
  const shownChart = posted?.distribution && phase === "result" ? posted.distribution : distribution;
  const rest = shown.slice(typed.length);

  return (
    <ToolLayout title={t("title")}>
      {phase === "idle" && (
        <div className={styles.intro}>
          <div className={styles.modes} role="group" aria-label={t("mode")}>
            {(["ja", "en"] as const).map(m => <button key={m} type="button" className={styles.mode} aria-pressed={mode === m} onClick={() => setMode(m)} data-typing-mode={m}>{t(`modes.${m}`)}</button>)}
          </div>
          <p className={styles.lead}>{t(mode === "ja" ? "intro" : "introEn", { seconds: ROUND_S })}</p>
          <ul className={styles.rules}>{mode === "ja" ? <><li>{t("rule1")}</li><li>{t("rule2")}</li><li>{t("rule3")}</li></> : <><li>{t("ruleEn1")}</li><li>{t("rule2")}</li><li>{t("ruleEn3")}</li></>}</ul>
          <button type="button" className={styles.start} onClick={begin} data-typing="start">{t("start")}</button>
          {best !== null && <p className={styles.note}>{t("best", { score: best })}</p>}
          {shownChart && shownChart.total > 0 && <TypingChart distribution={shownChart} mine={null} />}
        </div>
      )}

      {phase === "playing" && word && (
        <div className={styles.play} data-typing="play">
          <div className={styles.status}>
            <span className={left <= 10 ? styles.hurry : undefined} data-typing="left">{t("left", { seconds: Math.ceil(left) })}</span>
            <span data-typing="words">{t("words", { count: round.words })}</span>
          </div>
          <progress className={styles.progress} max={ROUND_S} value={ROUND_S - left} aria-label={t("progressLabel")} />
          <div key={shake} className={`${styles.board} ${shake ? styles.shake : ""}`} data-typing="board">
            <p className={styles.text} lang={mode === "ja" ? "ja" : "en"} data-typing="text">{word.text}</p>
            {word.text !== word.kana && <p className={styles.kana} lang="ja">{word.kana}</p>}
            <p className={styles.romaji} data-typing="romaji" aria-label={t("romajiLabel")}><span className={styles.done}>{typed}</span><span className={styles.rest}>{rest}</span></p>
          </div>
          <p className={styles.note}>{t(mode === "ja" ? "playHint" : "playHintEn")}</p>
        </div>
      )}

      {phase === "result" && result && (
        <div className={styles.result} data-typing="result">
          <p className={styles.rankLetter} data-typing="rank-letter">{rank(points)}</p>
          <p className={styles.score} data-typing="score">{t("score", { score: points })}</p>
          <ul className={styles.stats}>
            <li><span>{t("keysPerSecond")}</span><strong>{keysPerSecond(result.keys)}</strong></li>
            <li><span>{t("accuracy")}</span><strong>{Math.round(accuracy(result) * 100)}%</strong></li>
            <li><span>{t("wordsTyped")}</span><strong>{result.words}</strong></li>
            <li><span>{t("misses")}</span><strong>{result.misses}</strong></li>
          </ul>
          {points >= (best ?? 0) && points > 0 && <p className={styles.newRecord}>{t("newRecord")}</p>}
          {top !== null && posted && <p className={styles.top} data-typing="top">{t("top", { total: posted.distribution.total, top })}</p>}
          {fetcher.state !== "idle" && <p className={styles.note}>{t("sending")}</p>}
          {failed === "limited" && <p className={styles.note}>{t("limited")}</p>}
          {failed === "failed" && <p className={styles.note}>{t("saveFailed")}</p>}
          {shownChart && shownChart.total > 0 && <TypingChart distribution={shownChart} mine={posted ? points : null} />}
          <div className={styles.modes} role="group" aria-label={t("mode")}>
            {(["ja", "en"] as const).map(m => <button key={m} type="button" className={styles.mode} aria-pressed={mode === m} onClick={() => setMode(m)} data-typing-mode={m}>{t(`modes.${m}`)}</button>)}
          </div>
          <button type="button" className={styles.start} onClick={begin} data-typing="again">{t("again")}</button>
          <ShareButtons text={top !== null ? t("shareText", { score: points, rank: rank(points), top, mode: t(`modes.${mode}`) }) : t("shareTextPlain", { score: points, rank: rank(points), mode: t(`modes.${mode}`) })} path={`/${locale}/typing`} />
        </div>
      )}
      <p className={styles.note}>{t("hint")}</p>
    </ToolLayout>
  );
}
