"use client";

import { useLocale, useTranslations } from "use-intl";
import { useSiteMeta } from "../root";
import { Link } from "../i18n/navigation";
import { type DynamicT } from "../lib/apps";
import AppList from "./app-list";
import { CoverHero } from "./site-cover";
import { APP_CATALOG, APP_SITE_CATEGORIES } from "../lib/app-catalog";
import { useFavoritesData } from "../routes/locale";
import SiteFooter from "./site-footer";


// Numbers shown big under the hero: the app's tools, and how many are in each category.
const published = APP_CATALOG.filter(app => app.status === "published" && APP_SITE_CATEGORIES.includes(app.category));
const STATS: readonly { key: string; value: number; label?: string }[] = [
  { key: "tools", value: published.length },
  ...APP_SITE_CATEGORIES.map(category => ({ key: category, value: published.filter(app => app.category === category).length })),
];

export default function Cover({ year }: { year: number }) {
  const t = useTranslations("App");
  const locale = useLocale();
  const { origins } = useSiteMeta();
  const { signedIn, favoriteSlugs } = useFavoritesData();
  const td = t as unknown as DynamicT;
  return (
    <>
    <main>
      <CoverHero eyebrow="PAIBOT" heading="App" lead={t("lead")} cta={t("heroCta")} ctaHref="#apps" />

      <dl className="home-stats" data-count={STATS.length}>
        {STATS.map(({ key, value }) => <div key={key}><dd>{value}</dd><dt>{key === "tools" ? td("home.stats.tools") : td(`categories.${key}`)}</dt></div>)}
      </dl>

      <p className="category-showcase-intro" id="try">{t("home.tryIt")}</p>
      <AppList signedIn={signedIn} favoriteSlugs={favoriteSlugs} />

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
