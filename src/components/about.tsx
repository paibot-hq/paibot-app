"use client";

import { useLocale, useTranslations } from "use-intl";
import { Link } from "../i18n/navigation";
import type { Locale } from "../i18n/routing";
import { CONTACT_EMAIL, SELLER } from "../lib/plans";
import SiteFooter from "./site-footer";

// How the tools are made, where their data comes from and how it is checked: what a visitor (or a reviewer) needs to trust the site.
type Section = { heading: string; paragraphs: string[] };

export default function About({ year }: { year: number }) {
  const t = useTranslations("App.about");
  const locale = useLocale() as Locale;
  const sections = t.raw("sections") as Section[];
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
        {sections.map((section, index) => (
          <section key={section.heading} aria-labelledby={`about-section-${index}`}>
            <h2 id={`about-section-${index}`}>{section.heading}</h2>
            {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
          </section>
        ))}
        <section aria-labelledby="about-operator">
          <h2 id="about-operator">{t("operatorTitle")}</h2>
          <p>{t("operatorBody", { seller: SELLER[locale] })}</p>
        </section>
        <section aria-labelledby="about-contact">
          <h2 id="about-contact">{t("contactTitle")}</h2>
          <p>{t("contactBody")} <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
        </section>
      </main>
      <SiteFooter year={year} />
    </>
  );
}
