"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import styles from "./govfaq-view.module.css";
import { AnswerText, Tag } from "./govfaq-parts";
import { compose, isLong, type Faq, type Index, type Item } from "./govfaq-search";
import { embedQuestion, rank, type Vectors } from "./govfaq-semantic";

const EXAMPLES = ["マイナンバーカードをなくしてしまったのですが、どうすればいいですか？", "子どもが生まれたときの手続きを教えて", "確定申告のやり方がわからない", "年金はいつからもらえますか"];

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

type Message =
  | { id: number; from: "you"; text: string }
  | { id: number; from: "bot"; kind: "hello" }
  | { id: number; from: "bot"; kind: "answer"; confidence: "sure" | "unsure"; primary: Item; others: Item[] }
  | { id: number; from: "bot"; kind: "none" }
  | { id: number; from: "bot"; kind: "faq"; item: Item };

// A chat over the FAQ: each question is answered with the nearest FAQ as it is written (no one is making up an answer), with some others that
// come close to open. It does not remember what was said before.
export default function FaqChat({ faq, index, vectors }: { faq: Faq | null; index: Index | null; vectors: Vectors | null }) {
  const t = useTranslations("App.govfaq");
  const [messages, setMessages] = useState<Message[]>([{ id: 0, from: "bot", kind: "hello" }]);
  const [text, setText] = useState("");
  const [waiting, setWaiting] = useState(false);
  const next = useRef(1);
  const end = useRef<HTMLDivElement | null>(null);

  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [messages]);

  async function ask(question: string) {
    const clean = question.trim();
    if (!clean || !index || waiting) return;
    setText("");
    setMessages(list => [...list, { id: next.current++, from: "you", text: clean }]);
    // The question goes to the Worker to be turned into a vector (nothing else is sent); if that does not work, the words alone are searched.
    let vector: Int8Array | null = null;
    if (vectors) { setWaiting(true); vector = await embedQuestion(clean); setWaiting(false); }
    const answer = compose(index, rank(index, clean, { vectors, vector, limit: 13 }));
    const bot: Message = answer.kind === "none"
      ? { id: next.current++, from: "bot", kind: "none" }
      : { id: next.current++, from: "bot", kind: "answer", confidence: answer.confidence, primary: answer.primary, others: answer.others };
    setMessages(list => [...list, bot]);
  }
  const open = (item: Item) => setMessages(list => [...list, { id: next.current++, from: "bot", kind: "faq", item }]);

  const card = (item: Item) => <Card item={item} category={faq?.categories[item.category]} />;

  return (
    <section className={styles.chat} aria-label={t("chatLabel")}>
      <div className={styles.log} role="log" aria-live="polite" data-chat="log">
        {messages.map(m => (
          <div key={m.id} className={m.from === "you" ? styles.you : styles.bot} data-chat-from={m.from}>
            <span className={styles.who}>{m.from === "you" ? t("you") : t("bot")}</span>
            {m.from === "you" ? <p className={styles.bubble} lang="ja">{m.text}</p> : (
              <div className={styles.bubble} data-flat={m.kind === "answer" || m.kind === "faq" || undefined}>
                {m.kind === "hello" && (
                  <>
                    <p>{t("botHello")}</p>
                    <div className={styles.chips}>
                      {EXAMPLES.map(example => <button key={example} type="button" className={styles.chip} lang="ja" onClick={() => ask(example)} disabled={!index}>{example}</button>)}
                    </div>
                  </>
                )}
                {m.kind === "none" && (
                  <>
                    <p>{t("botNone")}</p>
                    <div className={styles.chips}>
                      {EXAMPLES.slice(1).map(example => <button key={example} type="button" className={styles.chip} lang="ja" onClick={() => ask(example)}>{example}</button>)}
                    </div>
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
        ))}
        {waiting && <p className={styles.small} role="status" data-chat="waiting">{t("thinking")}</p>}
        <div ref={end} />
      </div>
      <form className={styles.compose} onSubmit={event => { event.preventDefault(); ask(text); }}>
        <input className={styles.input} value={text} lang="ja" placeholder={t("chatPlaceholder")} aria-label={t("chatInput")} autoComplete="off" disabled={!index} onChange={event => setText(event.target.value)} data-chat="input" />
        <button type="submit" className="auth-link" disabled={!index || waiting || text.trim() === ""} data-chat="send">{t("send")}</button>
        {messages.length > 1 && <button type="button" className={styles.reset} onClick={() => { setMessages([{ id: next.current++, from: "bot", kind: "hello" }]); setText(""); }} data-chat="reset">{t("reset")}</button>}
      </form>
    </section>
  );
}
