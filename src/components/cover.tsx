"use client";

import { useTranslations } from "use-intl";
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
    </main>

    <SiteFooter year={year} />
    </>
  );
}
