"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "../i18n/navigation";
import { HOME_CATEGORY_TILES, type DynamicT } from "../lib/apps";

// Same mark as src/app/icon.svg, redrawn inline (not <img src="/icon.svg">)
// so the eyes can be nudged toward the cursor — a static image file can't
// have its internals manipulated by JS. Keep the two in sync by eye if the
// mark ever changes.
function Mascot() {
  const leftEyeRef = useRef<SVGCircleElement>(null);
  const rightEyeRef = useRef<SVGCircleElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    function handleMove(event: MouseEvent) {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      const dist = Math.hypot(dx, dy) || 1;
      const maxOffset = 1.1; // viewBox units — a glance, not a swap of eyes
      const offset = `translate(${((dx / dist) * maxOffset).toFixed(2)} ${((dy / dist) * maxOffset).toFixed(2)})`;
      leftEyeRef.current?.setAttribute("transform", offset);
      rightEyeRef.current?.setAttribute("transform", offset);
    }
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return (
    <svg ref={svgRef} className="hero-mascot" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#4f86b6" />
      <circle ref={leftEyeRef} cx="12" cy="16" r="2.6" fill="#ffffff" />
      <circle ref={rightEyeRef} cx="20" cy="16" r="2.6" fill="#ffffff" />
    </svg>
  );
}

export default function Cover({ year }: { year: number }) {
  const t = useTranslations("App");
  const td = t as unknown as DynamicT;
  return (
    <>
    <main>
      <section className="hero" aria-labelledby="hero-title">
        <div className="cloud-field" aria-hidden="true">
          <span className="cloud cloud-a"></span>
          <span className="cloud cloud-b"></span>
          <span className="cloud cloud-c"></span>
        </div>
        <div className="hero-copy">
          <p className="eyebrow">PAIBOT LLC</p>
          <h1 id="hero-title"><span className="wordmark">PAIBOT</span><span className="title-suffix">.app</span></h1>
          <p className="lead">{t("lead")}</p>
          <Link className="auth-link" href="/apps">{t("heroCta")}</Link>
        </div>
        <Mascot />
      </section>

      <div className="category-tiles">
        {HOME_CATEGORY_TILES.map(({ category, messageKey, icon: Icon }) => (
          <Link key={category} className="app-card" href={`/apps#${category}`}>
            <span className="app-icon" aria-hidden="true"><Icon /></span>
            <div>
              <h3>{td(`categories.${category}`)}</h3>
              <p>{td(`home.${messageKey}.description`)}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>

    <footer>
      <span>PAIBOT.app</span>
      <span>&copy; <span>{year}</span> PAIBOT LLC.</span>
    </footer>
    </>
  );
}
