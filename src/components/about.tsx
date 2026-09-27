"use client";

import { useLocale, useTranslations } from "use-intl";
import { Link } from "../i18n/navigation";
import type { Locale } from "../i18n/routing";
import { SELLER } from "../lib/plans";
import SiteFooter from "./site-footer";

export default function About({ year }: { year: number }) {
  const t = useTranslations("App.about");
  const locale = useLocale() as Locale;
  return (
    <>
      <main className="section about">
        <header className="about-intro">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1>{t("title")}</h1>
          <p>{t("body")}</p>
        </header>
        <section aria-labelledby="about-tools">
          <h2 id="about-tools">{t("toolsTitle")}</h2>
          <p>{t("toolsBody")}</p>
          <Link className="auth-link about-cta" href="/apps">{t("browseApps")}</Link>
        </section>
        <section aria-labelledby="about-operator">
          <h2 id="about-operator">{t("operatorTitle")}</h2>
          <p>{t("operatorBody", { seller: SELLER[locale] })}</p>
        </section>
      </main>
      <SiteFooter year={year} />
    </>
  );
}
