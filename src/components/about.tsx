"use client";

import { useLocale, useTranslations } from "use-intl";
import { Link } from "../i18n/navigation";
import type { Locale } from "../i18n/routing";
import { CONTACT_EMAIL, SELLER } from "../lib/plans";
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
          <Link className="auth-link about-cta" href="/">{t("browseApps")}</Link>
        </section>
        <section aria-labelledby="about-data">
          <h2 id="about-data">{t("dataTitle")}</h2>
          <p>{t("dataBody")}</p>
          <Link className="auth-link" href="/legal/privacy">{t("privacyLink")}</Link>
        </section>
        <section aria-labelledby="about-content">
          <h2 id="about-content">{t("contentTitle")}</h2>
          <p>{t("contentBody")}</p>
          <p>{t("mathBody")}</p>
        </section>
        <section aria-labelledby="about-operator">
          <h2 id="about-operator">{t("operatorTitle")}</h2>
          <p>{t("operatorBody", { seller: SELLER[locale] })}</p>
        </section>
        <section aria-labelledby="about-contact" id="contact">
          <h2 id="about-contact">{t("contactTitle")}</h2>
          <p>{t("contactBody")}</p>
          <a className="auth-link" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          <p>{t("contactDetails")}</p>
        </section>
      </main>
      <SiteFooter year={year} />
    </>
  );
}
