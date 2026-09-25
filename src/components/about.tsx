"use client";

import { useTranslations } from "use-intl";

export default function About({ year }: { year: number }) {
  const t = useTranslations("App");
  return (
    <>
    <main className="section about">
      <h1 className="eyebrow">{t("about.eyebrow")}</h1>
      <p>{t("about.body")}</p>
    </main>

    <footer>
      <span>PAIBOT.app</span>
      <span>&copy; <span>{year}</span> PAIBOT LLC.</span>
    </footer>
    </>
  );
}
