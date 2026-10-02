"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "use-intl";
import { Link } from "../i18n/navigation";
import FavoriteButton from "./favorite-button";
import styles from "./site-cover.module.css";
import { apps as registeredApps, APP_SITE_CATEGORIES as APP_CATEGORIES, type AppEntry, type DynamicT } from "../lib/apps";

const apps = registeredApps;

// The app's tools by category, with a search box and a favorite star on each: the list on the app's cover.
export default function AppList({ signedIn, favoriteSlugs }: { signedIn: boolean; favoriteSlugs: string[] }) {
  const t = useTranslations("App");
  const td = t as unknown as DynamicT;
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const favoriteSet = useMemo(() => new Set(favoriteSlugs), [favoriteSlugs]);

  const visibleApps = useMemo(() => {
    if (!normalizedQuery) return apps;
    return apps.filter(app => {
      const haystack = [
        td(`${app.messageKey}.title`),
        td(`${app.messageKey}.description`),
        td(`${app.messageKey}.keywords`),
        td(`categories.${app.category}`),
      ].join(" ").toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery, td]);

  const groupedApps = useMemo(
    () =>
      APP_CATEGORIES.map(category => ({
        category,
        items: visibleApps.filter(app => app.category === category),
      })).filter(group => group.items.length > 0),
    [visibleApps],
  );

  return (
    <section className="app-list" id="apps" aria-label={t("apps.eyebrow")}>
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
            <h2 className={styles.heading}>{td(`categories.${category}`)}</h2>
            <ul className={styles.cards} data-columns="2">
              {items.map(app => (
                <AppCard
                  key={app.slug}
                  app={app}
                  t={td}
                  comingSoonLabel={t("apps.comingSoon")}
                  signedIn={signedIn}
                  favorited={favoriteSet.has(app.slug)}
                  favoriteLabel={t("apps.favorite")}
                  unfavoriteLabel={t("apps.unfavorite")}
                />
              ))}
            </ul>
          </section>
        ))
      )}
    </section>
  );
}

function AppCard({ app, t, comingSoonLabel, signedIn, favorited, favoriteLabel, unfavoriteLabel }: {
  app: AppEntry;
  t: DynamicT;
  comingSoonLabel: string;
  signedIn: boolean;
  favorited: boolean;
  favoriteLabel: string;
  unfavoriteLabel: string;
}) {
  const locale = useLocale();
  const soon = app.status === "comingSoon";
  const content = (
    <>
      <span className={styles.cardTitle}>{t(`${app.messageKey}.title`)}{soon && <span className={styles.badge}>{comingSoonLabel}</span>}</span>
      <span className={styles.cardText}>{t(`${app.messageKey}.description`)}</span>
    </>
  );
  // Same cards as the other sites' covers (src/components/site-cover.tsx); a card without a page is faded.
  const card = app.href
    ? <Link className={`${styles.card} app-card`} data-ready href={app.href}>{content}</Link>
    : <div className={`${styles.card} app-card`}>{content}</div>;

  // Only published apps have anything real to favorite - comingSoon apps get no star. The star itself renders the
  // same regardless of signedIn (no hydration flash); only its click behavior differs (see FavoriteButton).
  if (app.status !== "published") return <li>{card}</li>;
  return (
    <li className="app-card-wrap">
      {card}
      <FavoriteButton actionPath={`/${locale}/favorites`} slug={app.slug} signedIn={signedIn} favorited={favorited} addLabel={favoriteLabel} removeLabel={unfavoriteLabel} />
    </li>
  );
}
