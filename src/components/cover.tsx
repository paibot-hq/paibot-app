"use client";

import { useLocale, useTranslations } from "use-intl";
import { useSiteMeta } from "../root";
import { Link } from "../i18n/navigation";
import { HOME_CATEGORY_TILES, type DynamicT } from "../lib/apps";
import SiteFooter from "./site-footer";
import { APP_CATALOG, APP_SITE_CATEGORIES } from "../lib/app-catalog";

// Counts shown big under the hero: the app's published tools, their categories, languages. (The drills are counted on the learning site.)
const STATS = [
  { key: "tools", value: APP_CATALOG.filter(app => app.status === "published" && APP_SITE_CATEGORIES.includes(app.category)).length },
  { key: "categories", value: HOME_CATEGORY_TILES.length },
  { key: "languages", value: 3 },
] as const;

export default function Cover({ year }: { year: number }) {
  const t = useTranslations("App");
  const locale = useLocale();
  const { origins } = useSiteMeta();
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
          <p className="eyebrow">PAIBOT</p>
          <h1 id="hero-title"><span className="wordmark">App</span></h1>
          <p className="lead">{t("lead")}</p>
          <Link className="auth-link" href="/apps">{t("heroCta")}</Link>
        </div>
        <div className="hero-mascot" aria-hidden="true">
          <span className="hero-mascot-eye"></span>
          <span className="hero-mascot-eye"></span>
        </div>
      </section>

      <dl className="home-stats" data-count={STATS.length}>
        {STATS.map(({ key, value }) => <div key={key}><dd>{value}</dd><dt>{td(`home.stats.${key}`)}</dt></div>)}
      </dl>

      <p className="category-showcase-intro">{t("home.tryIt")}</p>
      <div className="category-showcase">
        {HOME_CATEGORY_TILES.map(({ category, messageKey, icon: Icon }) => (
          <Link key={category} className="category-item" href={`/${category}`}>
            <span className="category-item-icon" aria-hidden="true"><Icon /></span>
            <h3>{td(`categories.${category}`)}</h3>
            <p>{td(`home.${messageKey}.summary`)}</p>
          </Link>
        ))}
      </div>

      {/* The drills and the developer tools are on their own sites (src/lib/sites.ts). */}
      <a className="learn-banner" href={`${origins.learn}/${locale}`}>
        <span className="learn-banner-title">{t("home.learnBanner.title")}</span>
        <span className="learn-banner-text">{t("home.learnBanner.text")}</span>
      </a>
      <a className="learn-banner" href={`${origins.tools}/${locale}`}>
        <span className="learn-banner-title">{t("home.toolsBanner.title")}</span>
        <span className="learn-banner-text">{t("home.toolsBanner.text")}</span>
      </a>
    </main>

    <SiteFooter year={year} />
    </>
  );
}
