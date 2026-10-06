"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import styles from "./faq-view.module.css";
import { AnswerText, Tag } from "./faq-parts";
import { reply, type Faq, type Index, type Item } from "./faq-search";

const EXAMPLES = ["マイナンバーカードをなくしてしまったのですが、どうすればいいですか？", "子どもが生まれたときの手続きを教えて", "確定申告のやり方がわからない", "年金はいつからもらえますか"];

type Message =
  | { id: number; from: "you"; text: string }
  | { id: number; from: "bot"; kind: "hello" }
  | { id: number; from: "bot"; kind: "answer"; confidence: "sure" | "unsure"; primary: Item; others: Item[] }
  | { id: number; from: "bot"; kind: "none" }
  | { id: number; from: "bot"; kind: "faq"; item: Item };

// A chat over the FAQ: each question is answered with the nearest FAQ as it is written (no one is making up an answer), with some others that
// come close to open. It does not remember what was said before.
export default function FaqChat({ faq, index }: { faq: Faq | null; index: Index | null }) {
  const t = useTranslations("App.faq");
  const [messages, setMessages] = useState<Message[]>([{ id: 0, from: "bot", kind: "hello" }]);
  const [text, setText] = useState("");
  const next = useRef(1);
  const end = useRef<HTMLDivElement | null>(null);

  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [messages]);

  function ask(question: string) {
    const clean = question.trim();
    if (!clean || !index) return;
    const answer = reply(index, clean);
    const you: Message = { id: next.current++, from: "you", text: clean };
    const bot: Message = answer.kind === "none"
      ? { id: next.current++, from: "bot", kind: "none" }
      : { id: next.current++, from: "bot", kind: "answer", confidence: answer.confidence, primary: answer.primary, others: answer.others };
    setMessages(list => [...list, you, bot]);
    setText("");
  }
  const open = (item: Item) => setMessages(list => [...list, { id: next.current++, from: "bot", kind: "faq", item }]);

  const card = (item: Item) => (
    <div className={styles.card} lang="ja" data-chat="card">
      <Tag>{faq?.categories[item.category]}</Tag>
      <p className={styles.cardQuestion}>{item.question}</p>
      <div className={styles.cardAnswer}><AnswerText answer={item.answer} /></div>
      <p className={styles.meta}>{t("itemId", { id: item.id })}</p>
    </div>
  );

  return (
    <section className={styles.chat} aria-label={t("chatLabel")}>
      <div className={styles.log} role="log" aria-live="polite" data-chat="log">
        {messages.map(m => (
          <div key={m.id} className={m.from === "you" ? styles.you : styles.bot} data-chat-from={m.from}>
            <span className={styles.who}>{m.from === "you" ? t("you") : t("bot")}</span>
            {m.from === "you" ? <p className={styles.bubble} lang="ja">{m.text}</p> : (
              <div className={styles.bubble}>
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
                    <p className={styles.small}>{t("botCheck")}</p>
                  </>
                )}
                {m.kind === "faq" && card(m.item)}
              </div>
            )}
          </div>
        ))}
        <div ref={end} />
      </div>
      <form className={styles.compose} onSubmit={event => { event.preventDefault(); ask(text); }}>
        <input className={styles.input} value={text} lang="ja" placeholder={t("chatPlaceholder")} aria-label={t("chatInput")} autoComplete="off" disabled={!index} onChange={event => setText(event.target.value)} data-chat="input" />
        <button type="submit" className="auth-link" disabled={!index || text.trim() === ""} data-chat="send">{t("send")}</button>
        {messages.length > 1 && <button type="button" className={styles.reset} onClick={() => { setMessages([{ id: next.current++, from: "bot", kind: "hello" }]); setText(""); }} data-chat="reset">{t("reset")}</button>}
      </form>
      <p className={styles.small}>{t("chatNote")}</p>
    </section>
  );
}
