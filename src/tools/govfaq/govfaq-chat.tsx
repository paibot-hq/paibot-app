"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/react-router";
import { useTranslations } from "use-intl";
import styles from "./govfaq-view.module.css";
import { AnswerText, Tag } from "./govfaq-parts";
import { compose, isLong, type Faq, type Index, type Item } from "./govfaq-search";
import { embedQuestion, rank, type Vectors } from "./govfaq-semantic";
import { askAnswer, candidates, distinct, withoutMarks } from "./govfaq-answer";

// A FAQ in the chat: a long answer is folded to a few lines, so one reply does not fill the screen; "続きを読む" opens it.

function Card({ item, category }: { item: Item; category: string | undefined }) {
  const t = useTranslations("App.govfaq");
  const long = isLong(item.answer);
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.card} lang="ja" data-chat="card">
      <Tag>{category}</Tag>
      <p className={styles.cardQuestion}>{item.question}</p>
      <div className={styles.cardAnswer} data-clamped={long && !open} data-chat="answer"><AnswerText answer={item.answer} /></div>
      {long && <button type="button" className={styles.more} aria-expanded={open} onClick={() => setOpen(o => !o)} data-chat="more">{open ? t("less") : t("more")}</button>}
      <p className={styles.meta}>{t("itemId", { id: item.id })}</p>
    </div>
  );
}

// A FAQ an answer is based on: first only its question, as a heading; it opens to the FAQ as it is written.
function Source({ item, category }: { item: Item; category: string | undefined }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.source} data-chat="source" data-open={open}>
      <button type="button" className={styles.sourceHead} aria-expanded={open} onClick={() => setOpen(o => !o)} lang="ja">
        <span className={styles.sourceMark} aria-hidden="true">{open ? "−" : "+"}</span>
        <span>{item.question}</span>
      </button>
      {open && <Card item={item} category={category} />}
    </div>
  );
}

// The FAQs an answer is based on: a heading for each kind of question (the same question for another reader is not a heading of its own), the
// first two shown and the rest, repeats included, behind a button.
const SOURCES_SHOWN = 2;
function Sources({ items, categories }: { items: Item[]; categories: string[] | undefined }) {
  const t = useTranslations("App.govfaq");
  const [all, setAll] = useState(false);
  const { first, repeats } = distinct(items);
  const ordered = [...first, ...repeats];
  const shown = all ? ordered : first.slice(0, SOURCES_SHOWN);
  return (
    <>
      {shown.map(item => <Source key={item.id} item={item} category={categories?.[item.category]} />)}
      {!all && ordered.length > shown.length && <button type="button" className={styles.moreSources} onClick={() => setAll(true)} data-chat="more-sources">{t("moreSources", { n: ordered.length - shown.length })}</button>}
    </>
  );
}

// Who is speaking, beside the message: the FAQ bot is PAIBOT's own icon; you are the signed-in user's picture, or a person drawn in lines when no one is
// signed in (or the picture cannot be had).
function Avatar({ bot }: { bot: boolean }) {
  const { isSignedIn, user } = useUser();
  const [broken, setBroken] = useState(false);
  const picture = !bot && isSignedIn && user?.imageUrl && !broken ? user.imageUrl : null;
  if (bot) return <img className={styles.avatar} src="/icon.svg" alt="" width={32} height={32} data-chat="avatar" data-who="bot" />;
  if (picture) return <img className={styles.avatar} src={picture} alt="" width={32} height={32} referrerPolicy="no-referrer" onError={() => setBroken(true)} data-chat="avatar" data-who="you-user" />;
  return (
    <svg className={`${styles.avatar} ${styles.avatarPerson}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-chat="avatar" data-who="you">
      <circle cx="12" cy="9.5" r="3.9" />
      <path d="M4.6 20.6c.8-4 3.6-6 7.4-6s6.6 2 7.4 6" />
    </svg>
  );
}

type Message =
  | { id: number; from: "you"; text: string }
  | { id: number; from: "bot"; kind: "hello" }
  | { id: number; from: "bot"; kind: "answer"; confidence: "sure" | "unsure"; primary: Item; others: Item[] }
  | { id: number; from: "bot"; kind: "generated"; text: string; streaming: boolean; used: Item[]; others: Item[] }
  | { id: number; from: "bot"; kind: "none" }
  | { id: number; from: "bot"; kind: "faq"; item: Item };

// A chat over the FAQ: the nearest FAQs are found for a question, and an answer is written from them alone (the FAQs it is written from are shown under
// it, as they are written); when that cannot be done, the nearest FAQ is the answer, with some others that come close to open. It does not remember
// what was said before.
export default function FaqChat({ faq, index, vectors }: { faq: Faq | null; index: Index | null; vectors: Vectors | null }) {
  const t = useTranslations("App.govfaq");
  const [messages, setMessages] = useState<Message[]>([{ id: 0, from: "bot", kind: "hello" }]);
  const [text, setText] = useState("");
  const [waiting, setWaiting] = useState<null | "search" | "answer">(null);
  const next = useRef(1);
  const end = useRef<HTMLDivElement | null>(null);

  // The page scrolls to the newest message (not at the start, when there is only the greeting).
  useEffect(() => { if (messages.length > 1) end.current?.scrollIntoView({ block: "nearest" }); }, [messages]);

  async function ask(question: string) {
    const clean = question.trim();
    if (!clean || !index || waiting) return;
    setText("");
    setMessages(list => [...list, { id: next.current++, from: "you", text: clean }]);
    // The question goes to the Worker to be turned into a vector; if that does not work, the words alone are searched.
    let vector: Int8Array | null = null;
    if (vectors) { setWaiting("search"); vector = await embedQuestion(clean); }
    const ranked = rank(index, clean, { vectors, vector, limit: 13 });
    const found = compose(index, ranked);
    if (found.kind === "none") {
      setWaiting(null);
      setMessages(list => [...list, { id: next.current++, from: "bot", kind: "none" }]);
      return;
    }
    // The ids of the nearest FAQs go to the Worker, which writes an answer from their texts alone; the text is shown as it is written.
    setWaiting("answer");
    const given = candidates(index, ranked);
    let shownId: number | null = null;
    const written = await askAnswer(clean, given.map(item => item.id), text => {
      if (shownId === null) {
        shownId = next.current++;
        const id = shownId;
        setWaiting(null);
        setMessages(list => [...list, { id, from: "bot", kind: "generated", text, streaming: true, used: [], others: [] }]);
      } else {
        const id = shownId;
        setMessages(list => list.map(m => (m.id === id && m.from === "bot" && m.kind === "generated" ? { ...m, text } : m)));
      }
    });
    setWaiting(null);
    const id = shownId;
    const fallback: Message = { id: next.current++, from: "bot", kind: "answer", confidence: found.confidence, primary: found.primary, others: found.others };
    if (!written) {
      // Nothing usable (or nothing was written): the nearest FAQ is the answer, in place of anything half shown.
      setMessages(list => [...list.filter(m => m.id !== id), fallback]);
      return;
    }
    const done = { used: given.filter(item => written.used.includes(item.id)), others: given.filter(item => !written.used.includes(item.id)) };
    if (id === null) setMessages(list => [...list, { id: next.current++, from: "bot", kind: "generated", text: withoutMarks(written.answer), streaming: false, ...done }]);
    else setMessages(list => list.map(m => (m.id === id && m.from === "bot" && m.kind === "generated" ? { ...m, text: withoutMarks(written.answer), streaming: false, ...done } : m)));
  }
  const open = (item: Item) => setMessages(list => [...list, { id: next.current++, from: "bot", kind: "faq", item }]);

  const card = (item: Item) => <Card item={item} category={faq?.categories[item.category]} />;

  return (
    <section className={styles.chat} aria-label={t("chatLabel")}>
      <div className={styles.log} role="log" aria-live="polite" data-chat="log">
        {messages.map(m => (
          <div key={m.id} className={m.from === "you" ? styles.you : styles.bot} data-chat-from={m.from}>
            <Avatar bot={m.from !== "you"} />
            <div className={styles.body}>
            <span className={styles.who}>{m.from === "you" ? t("you") : t("bot")}</span>
            {m.from === "you" ? <p className={styles.bubble} lang="ja">{m.text}</p> : (
              <div className={styles.bubble} data-flat={m.kind === "answer" || m.kind === "faq" || undefined}>
                {m.kind === "hello" && <p>{t("botHello")}</p>}
                {m.kind === "none" && <p>{t("botNone")}</p>}
                {m.kind === "generated" && (
                  <>
                    <p className={styles.generated} lang="ja" data-chat="generated" data-streaming={m.streaming || undefined}>{m.text}</p>
                    {!m.streaming && (
                      <>
                        <p className={styles.small}>{t("botGenerated")}</p>
                        <p className={styles.small}>{t("sources")}</p>
                        <Sources items={m.used} categories={faq?.categories} />
                      </>
                    )}
                    {!m.streaming && m.others.length > 0 && (
                      <div className={styles.others}>
                        <p className={styles.small}>{t("others")}</p>
                        {m.others.map(other => <button key={other.id} type="button" className={styles.other} lang="ja" onClick={() => open(other)}>{other.question}</button>)}
                      </div>
                    )}
                  </>
                )}
                {m.kind === "answer" && (
                  <>
                    <p>{m.confidence === "sure" ? t("botSure") : t("botUnsure")}</p>
                    {card(m.primary)}
                    {m.others.length > 0 && (
                      <div className={styles.others}>
                        <p className={styles.small}>{t("others")}</p>
                        {m.others.map(other => <button key={other.id} type="button" className={styles.other} lang="ja" onClick={() => open(other)}>{other.question}</button>)}
                      </div>
                    )}
                  </>
                )}
                {m.kind === "faq" && card(m.item)}
              </div>
            )}
            </div>
          </div>
        ))}
        {waiting && <p className={styles.small} role="status" data-chat="waiting">{waiting === "answer" ? t("answering") : t("thinking")}</p>}
        <div ref={end} className={styles.end} />
      </div>
      <form className={styles.compose} onSubmit={event => { event.preventDefault(); ask(text); }}>
        <input className={styles.input} value={text} lang="ja" placeholder={t("chatPlaceholder")} aria-label={t("chatInput")} autoComplete="off" disabled={!index} onChange={event => setText(event.target.value)} data-chat="input" />
        <button type="submit" className="auth-link" disabled={!index || waiting !== null || text.trim() === ""} data-chat="send">{t("send")}</button>
        {messages.length > 1 && <button type="button" className={styles.reset} onClick={() => { setMessages([{ id: next.current++, from: "bot", kind: "hello" }]); setText(""); }} data-chat="reset">{t("reset")}</button>}
      </form>
    </section>
  );
}
