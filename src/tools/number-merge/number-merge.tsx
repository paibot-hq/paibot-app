"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useLocale, useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import ShareButtons from "../../components/share-buttons";
import styles from "./number-merge.module.css";
import { GOAL, SIZE, biggest, canMove, move, random, start, type Direction, type State } from "./board";

const BEST_KEY = "paibot-app-number-merge-best";
const SWIPE_PX = 24;
// How long a merged-away tile stays (sliding in) before it is dropped from the page.
const SLIDE_MS = 140;

const KEYS: Record<string, Direction> = {
  ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
  a: "left", d: "right", w: "up", s: "down", A: "left", D: "right", W: "up", S: "down",
};

type Game = { state: State; history: State | null; over: boolean; won: boolean; keepGoing: boolean };

const newGame = (next: () => number): Game => ({ state: start(next), history: null, over: false, won: false, keepGoing: false });

export default function NumberMerge() {
  const t = useTranslations("App.numberMerge");
  const locale = useLocale();
  // The random numbers come from the browser; the first board is made after mounting so the server's page and the
  // browser's agree (an empty board is what the server sends).
  const rng = useRef<() => number>(() => Math.random());
  const [game, setGame] = useState<Game | null>(null);
  const [best, setBest] = useState(0);
  const [, force] = useState(0);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const gameRef = useRef<Game | null>(null);
  gameRef.current = game;

  useEffect(() => {
    rng.current = random((Math.random() * 2 ** 32) >>> 0);
    setGame(newGame(rng.current));
    try { const v = Number(localStorage.getItem(BEST_KEY)); if (Number.isFinite(v) && v > 0) setBest(v); } catch { /* optional */ }
  }, []);

  function play(direction: Direction) {
    const current = gameRef.current;
    if (!current || current.over) return;
    const result = move(current.state, direction, rng.current);
    if (!result.moved) return;
    const state = result.state;
    const over = !canMove(state);
    const won = current.won || biggest(state) >= GOAL;
    setGame({ state, history: current.state, over, won, keepGoing: current.keepGoing });
    if (state.score > best) {
      setBest(state.score);
      try { localStorage.setItem(BEST_KEY, String(state.score)); } catch { /* optional */ }
    }
    // The tiles that merged away slide in, then are dropped.
    window.setTimeout(() => {
      const now = gameRef.current;
      if (!now || now.state !== state) return;
      setGame({ ...now, state: { ...state, tiles: state.tiles.filter(tile => !tile.gone) } });
      force(n => n + 1);
    }, SLIDE_MS);
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const direction = KEYS[event.key];
      if (!direction) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      event.preventDefault();
      play(direction);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // play reads the game through a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  const down = (event: ReactPointerEvent<HTMLDivElement>) => { drag.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); };
  const up = (event: ReactPointerEvent<HTMLDivElement>) => {
    const from = drag.current;
    drag.current = null;
    if (!from) return;
    const dx = event.clientX - from.x, dy = event.clientY - from.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return;
    play(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
  };

  function restart() { setGame(newGame(rng.current)); }
  function undo() { if (game?.history) setGame({ ...game, state: game.history, history: null, over: false }); }

  const state = game?.state;
  const score = state?.score ?? 0;
  const tiles = state?.tiles ?? [];

  return (
    <ToolLayout title={t("title")}>
      <p className={styles.lead}>{t("intro", { goal: GOAL })}</p>
      <div className={styles.scores}>
        <div className={styles.score}><span>{t("score")}</span><strong data-merge="score">{score}</strong></div>
        <div className={styles.score}><span>{t("best")}</span><strong data-merge="best">{Math.max(best, score)}</strong></div>
      </div>
      <div className={styles.buttons}>
        <button type="button" className={styles.button} onClick={undo} disabled={!game?.history} data-merge="undo">{t("undo")}</button>
        <button type="button" className={styles.button} onClick={restart} data-merge="restart">{t("restart")}</button>
      </div>
      <div className={styles.boardWrap}>
        <div className={styles.board} role="img" aria-label={t("boardLabel", { goal: GOAL })} onPointerDown={down} onPointerUp={up} onPointerCancel={() => { drag.current = null; }} data-merge="board" data-over={game?.over || undefined}>
          {Array.from({ length: SIZE * SIZE }, (_, i) => <div key={i} className={styles.cell} />)}
          {tiles.map(tile => (
            <div
              key={tile.id}
              className={`${styles.tile} ${tile.merged ? styles.merged : ""} ${tile.fresh ? styles.fresh : ""} ${tile.gone ? styles.gone : ""}`}
              style={{ "--row": tile.row, "--col": tile.col } as React.CSSProperties}
              data-value={tile.value > 2048 ? "big" : tile.value}
              data-tile={tile.gone ? undefined : tile.value}
            >
              <span>{tile.value}</span>
            </div>
          ))}
        </div>
        {game && (game.over || (game.won && !game.keepGoing)) && (
          <div className={styles.overlay} role="status" data-merge="overlay">
            <p className={styles.overTitle}>{game.over ? t(game.won ? "overWon" : "over") : t("won", { goal: GOAL })}</p>
            <p className={styles.overScore}>{t("finalScore", { score })}</p>
            <div className={styles.buttons}>
              {!game.over && <button type="button" className={styles.button} onClick={() => setGame({ ...game, keepGoing: true })} data-merge="continue">{t("keepGoing")}</button>}
              <button type="button" className={styles.primary} onClick={restart} data-merge="again">{t("again")}</button>
            </div>
            <ShareButtons text={t("shareText", { score, tile: biggest(game.state) })} path={`/${locale}/number-merge`} />
          </div>
        )}
      </div>
      <p className={styles.note}>{t("controls")}</p>
      <p className={styles.note}>{t("hint")}</p>
    </ToolLayout>
  );
}
