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
