"use client";

import { useTranslations } from "next-intl";

export default function About({ year }: { year: number }) {
  const t = useTranslations("App");
  return (
    <>
    <main className="section about">
      <h1 className="eyebrow">{t("aboutEyebrow")}</h1>
      <p>{t("aboutBody")}</p>
    </main>

    <footer>
      <span>PAIBOT.app</span>
      <span>&copy; <span>{year}</span> PAIBOT LLC.</span>
    </footer>
    </>
  );
}
