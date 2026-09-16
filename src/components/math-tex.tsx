"use client";

import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import styles from "./math-tex.module.css";

export function MathTex({ tex, block }: { tex: string; block?: boolean }) {
  const html = useMemo(
    () => katex.renderToString(tex, { throwOnError: false, displayMode: !!block }),
    [tex, block],
  );
  return <span className={styles["math-tex"]} dangerouslySetInnerHTML={{ __html: html }} />;
}
