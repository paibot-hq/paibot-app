"use client";

import { useEffect, useMemo, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import styles from "./math-tex.module.css";

// The formula never runs past its container: when it is wider than the space it
// has (a long worked step, a choice on a phone), the font shrinks to fit, down to
// half size; anything still wider scrolls inside its own block (see the callers).
const SMALLEST = 0.5;

export function MathTex({ tex, block }: { tex: string; block?: boolean }) {
  const html = useMemo(
    () => katex.renderToString(tex, { throwOnError: false, displayMode: !!block }),
    [tex, block],
  );
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = ref.current, box = element?.parentElement;
    if (!element || !box) return;
    const fit = () => {
      element.style.fontSize = "";
      const content = element.querySelector<HTMLElement>(".katex-html");
      if (!content) return;
      const style = getComputedStyle(box);
      const available = box.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      // The formula's own width: from its first piece to the last one's far edge
      // (the wrapper itself may be as wide as the box, whatever runs past it).
      const pieces = Array.from(content.children, child => child.getBoundingClientRect());
      const needed = Math.max(content.getBoundingClientRect().width * 0, ...pieces.map(rect => rect.right)) - Math.min(...pieces.map(rect => rect.left));
      // A little under the box width: a radical or a fraction bar can overshoot the measured edge.
      if (available > 0 && needed > available * 0.985) {
        element.style.fontSize = `${parseFloat(getComputedStyle(element).fontSize) * Math.max(SMALLEST, (available * 0.97) / needed)}px`;
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    // KaTeX's fonts change the widths when they finish loading: fit again then.
    const fonts = document.fonts;
    fonts?.addEventListener?.("loadingdone", fit);
    void fonts?.ready.then(fit);
    return () => { observer.disconnect(); fonts?.removeEventListener?.("loadingdone", fit); };
  }, [html]);
  return <span ref={ref} className={styles["math-tex"]} dangerouslySetInnerHTML={{ __html: html }} />;
}
