"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "use-intl";
import ToolLayout from "../../components/tool-layout";
import controls from "../../components/tool-controls.module.css";
import styles from "./stocks-view.module.css";
import { CONSENT_KEY, SITE, heatmap, marketOverview, scriptUrl, type Locale, type Theme } from "./widgets";

// One TradingView widget: its script reads the settings written inside its own tag and builds the widget (an iframe from
// tradingview-widget.com) in the container before it. Built again when the settings change, for instance with the theme.
function Widget({ name, config, height }: { name: "market-overview" | "stock-heatmap"; config: object; height: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const settings = JSON.stringify(config);
  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    const inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget";
    inner.style.height = "100%";
    const script = document.createElement("script");
    script.src = scriptUrl(name);
    script.async = true;
    script.text = settings;
    box.appendChild(inner);
    box.appendChild(script);
    return () => { box.replaceChildren(); };
  }, [name, settings]);
  // The widget's script sets its container to the full height of its parent, so the height is on a frame around the container.
  return (
    <div className={styles.widget} style={{ height }}>
      <div ref={ref} className="tradingview-widget-container" data-widget={name} />
    </div>
  );
}

export default function Stocks() {
  const t = useTranslations("App.stocks");
  const locale = useLocale() as Locale;
  const [ready, setReady] = useState(false);
  const [shown, setShown] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");

  // The widgets load only after a click, and on later visits if the visitor chose so: until then nothing connects to TradingView.
  // The site sets its theme a moment after the page loads (dark first, then the visitor's own), and widgets built with the wrong theme
  // would be built again, leaving a script of the first one running after its container was gone. So nothing is shown until the theme
  // has stayed the same for a little while.
  useEffect(() => {
    let timer = 0;
    const settle = () => { window.clearTimeout(timer); timer = window.setTimeout(() => setReady(true), 250); };
    const read = () => { setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light"); settle(); };
    try { setShown(localStorage.getItem(CONSENT_KEY) === "1"); } catch { /* storage may be blocked */ }
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => { window.clearTimeout(timer); observer.disconnect(); };
  }, []);
  function choose(on: boolean) {
    setShown(on);
    try { if (on) localStorage.setItem(CONSENT_KEY, "1"); else localStorage.removeItem(CONSENT_KEY); } catch { /* storage may be blocked */ }
  }

  const titles = { indices: t("tabs.indices"), currencies: t("tabs.currencies"), others: t("tabs.others") };
  const credit = (
    <p className={styles.credit}>
      <a href={SITE[locale]} target="_blank" rel="noopener nofollow">{t("credit")}</a>
    </p>
  );

  return (
    <ToolLayout title={t("title")}>
      <p className={controls.label}>{t("intro")}</p>
      {!ready ? (
        <div className={styles.placeholder} aria-hidden="true" />
      ) : !shown ? (
        <section className={styles.consent} aria-label={t("consentTitle")}>
          <h2 className={styles.consentTitle}>{t("consentTitle")}</h2>
          <p>{t("consentBody")}</p>
          <button className="auth-link" type="button" onClick={() => choose(true)} data-stocks="show">{t("show")}</button>
        </section>
      ) : (
        <>
          <section className={styles.block} aria-label={t("overview")}>
            <h2 className={styles.heading}>{t("overview")}</h2>
            <Widget name="market-overview" config={marketOverview(locale, theme, titles)} height={560} key={`overview-${theme}-${locale}`} />
            {credit}
          </section>
          <section className={styles.block} aria-label={t("heatmap")}>
            <h2 className={styles.heading}>{t("heatmap")}</h2>
            <p className={styles.sub}>{t("heatmapNote")}</p>
            <Widget name="stock-heatmap" config={heatmap(locale, theme)} height={520} key={`heatmap-${theme}-${locale}`} />
            {credit}
          </section>
          <p className={styles.stop}>
            <button className={styles.link} type="button" onClick={() => choose(false)} data-stocks="hide">{t("hide")}</button>
          </p>
        </>
      )}
      <p className={controls.label}>{t("note")}</p>
    </ToolLayout>
  );
}
