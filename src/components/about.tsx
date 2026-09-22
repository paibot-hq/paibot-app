"use client";

import { useTranslations } from "next-intl";

export default function About({ year }: { year: number }) {
  const t = useTranslations("App");
  return (
    <>
    <main className="section about">
      <div className="section-head">
        <p className="eyebrow">{t("aboutEyebrow")}</p>
        <h1>{t("aboutTitle")}</h1>
      </div>
      <p>{t("aboutBody")}</p>
    </main>

    <footer>
      <span>PAIBOT.app</span>
      <span>&copy; <span>{year}</span> PAIBOT LLC.</span>
    </footer>
    </>
  );
}
