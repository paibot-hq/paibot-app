"use client";

import { useTranslations } from "next-intl";
import { Link } from "../i18n/navigation";
import { HOME_CATEGORY_TILES, type DynamicT } from "../lib/apps";

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
        <div className="hero-mascot" aria-hidden="true">
          <span className="hero-mascot-eye"></span>
          <span className="hero-mascot-eye"></span>
        </div>
      </section>

      <p className="category-showcase-intro">{t("home.tryIt")}</p>
      <div className="category-showcase">
        {HOME_CATEGORY_TILES.map(({ category, messageKey, icon: Icon }) => (
          <Link key={category} className="category-item" href={`/apps#${category}`}>
            <span className="category-item-icon" aria-hidden="true"><Icon /></span>
            <h3>{td(`categories.${category}`)}</h3>
            <p>{td(`home.${messageKey}.description`)}</p>
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
