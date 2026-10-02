"use client";

import { useLocale, useTranslations } from "use-intl";
import { useSiteMeta } from "../root";
import { Link } from "../i18n/navigation";
import { type DynamicT } from "../lib/apps";
import AppList from "./app-list";
import { CoverHero } from "./site-cover";
import { useFavoritesData } from "../routes/locale";
import SiteFooter from "./site-footer";


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
