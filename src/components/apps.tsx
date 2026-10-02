"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "use-intl";
import { Link } from "../i18n/navigation";
import FavoriteButton from "./favorite-button";
import { apps as registeredApps, APP_SITE_CATEGORIES as APP_CATEGORIES, type AppCategory, type AppEntry, type DynamicT } from "../lib/apps";
import SiteFooter from "./site-footer";

const apps = registeredApps;

export default function Apps({ year, signedIn, favoriteSlugs, category: selectedCategory }: { year: number; signedIn: boolean; favoriteSlugs: string[]; category?: AppCategory }) {
  const t = useTranslations("App");
  const td = t as unknown as DynamicT;
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const favoriteSet = useMemo(() => new Set(favoriteSlugs), [favoriteSlugs]);

  const visibleApps = useMemo(() => {
    const categoryApps = selectedCategory ? apps.filter(app => app.category === selectedCategory) : apps;
    if (!normalizedQuery) return categoryApps;
    return categoryApps.filter(app => {
      const haystack = [
        td(`${app.messageKey}.title`),
        td(`${app.messageKey}.description`),
        td(`${app.messageKey}.keywords`),
        td(`categories.${app.category}`),
      ].join(" ").toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery, td, selectedCategory]);

  const groupedApps = useMemo(
    () =>
      APP_CATEGORIES.map(category => ({
        category,
        items: visibleApps.filter(app => app.category === category),
      })).filter(group => group.items.length > 0),
    [visibleApps],
  );

  return (
    <>
    <main className="section app-list">
      {selectedCategory ? <header className="category-intro">
        <h1 className="eyebrow">{td(`categories.${selectedCategory}`)}</h1>
        <p>{td(`home.${selectedCategory}.description`)}</p>
      </header> : <h1 className="eyebrow">{t("apps.eyebrow")}</h1>}

      <nav className="category-nav" aria-label={t("apps.categoryNavigation")}>
        <Link href="/apps" aria-current={!selectedCategory ? "page" : undefined}>{t("apps.allApps")}</Link>
        {APP_CATEGORIES.map(category => <Link key={category} href={`/${category}`} aria-current={selectedCategory === category ? "page" : undefined}>{td(`categories.${category}`)}</Link>)}
      </nav>

      <div className="app-search">
        <input
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder={t("apps.searchPlaceholder")}
          aria-label={t("apps.searchLabel")}
        />
      </div>

      {groupedApps.length === 0 ? (
        <p className="app-empty">{t("apps.noResults")}</p>
      ) : (
        groupedApps.map(({ category, items }) => (
          <section key={category} id={category} className="app-category">
            {!selectedCategory && <h2 className="app-category-title"><Link href={`/${category}`}>{td(`categories.${category}`)}</Link></h2>}
            <div className="app-grid">
              {items.map(app => (
                <AppCard
                  key={app.slug}
                  app={app}
                  headingLevel={selectedCategory ? 2 : 3}
                  t={td}
                  comingSoonLabel={t("apps.comingSoon")}
                  signedIn={signedIn}
                  favorited={favoriteSet.has(app.slug)}
                  favoriteLabel={t("apps.favorite")}
                  unfavoriteLabel={t("apps.unfavorite")}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </main>

    <SiteFooter year={year} />
    </>
  );
}

function AppCard({ app, headingLevel, t, comingSoonLabel, signedIn, favorited, favoriteLabel, unfavoriteLabel }: {
  app: AppEntry;
  headingLevel: 2 | 3;
  t: DynamicT;
  comingSoonLabel: string;
  signedIn: boolean;
  favorited: boolean;
  favoriteLabel: string;
  unfavoriteLabel: string;
}) {
  const locale = useLocale();
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const Icon = app.icon;
  const className = `app-card${app.status === "comingSoon" ? " muted" : ""}`;
  const content = (
    <>
      <span className="app-icon" aria-hidden="true"><Icon /></span>
      <div>
        {app.status === "comingSoon" && <p className="app-kicker">{comingSoonLabel}</p>}
        <Heading>{t(`${app.messageKey}.title`)}</Heading>
        <p>{t(`${app.messageKey}.description`)}</p>
      </div>
    </>
  );
  const card = app.href ? <Link className={className} href={app.href}>{content}</Link> : <div className={className}>{content}</div>;

  // Only published apps have anything real to favorite - comingSoon apps
  // (including /math) get no star. The star itself renders the same
  // regardless of signedIn (no hydration flash); only its click behavior
  // differs (see FavoriteButton).
  if (app.status !== "published") return card;
  return (
    <div className="app-card-wrap">
      {card}
      <FavoriteButton actionPath={`/${locale}/apps`} slug={app.slug} signedIn={signedIn} favorited={favorited} addLabel={favoriteLabel} removeLabel={unfavoriteLabel} />
    </div>
  );
}
