"use client";

import { Fragment } from "react";
import styles from "./faq-view.module.css";
import { highlight, parseAnswer } from "./faq-search";

// The text with the parts that match the query marked.
export function Marked({ text, query }: { text: string; query: string }) {
  const chars = [...text];
  const parts: React.ReactNode[] = [];
  let last = 0;
  highlight(text, query).forEach(([a, b], i) => {
    if (a > last) parts.push(<Fragment key={`t${i}`}>{chars.slice(last, a).join("")}</Fragment>);
    parts.push(<mark key={`m${i}`}>{chars.slice(a, b).join("")}</mark>);
    last = b;
  });
  if (last < chars.length) parts.push(<Fragment key="rest">{chars.slice(last).join("")}</Fragment>);
  return <>{parts}</>;
}

// An answer as written in the FAQ, its links opening in a new tab (they are the government's own pages, and carry no referrer).
export function AnswerText({ answer }: { answer: string }) {
  return (
    <>
      {parseAnswer(answer).map((part, i) => "text" in part
        ? <Fragment key={i}>{part.text}</Fragment>
        : <a key={i} href={part.url} target="_blank" rel="noopener noreferrer nofollow">{part.label}</a>)}
    </>
  );
}

export const Tag = ({ children }: { children: React.ReactNode }) => <span className={styles.tag}>{children}</span>;
