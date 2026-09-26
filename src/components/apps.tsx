"use client";

import { useMemo, useState } from "react";
import { useFetcher } from "react-router";
import { useTranslations } from "use-intl";
import { Link } from "../i18n/navigation";
import { apps as registeredApps, APP_CATEGORIES, type AppEntry, type DynamicT } from "../lib/apps";

const apps = registeredApps;

export default function Apps({ year, signedIn, favoriteSlugs }: { year: number; signedIn: boolean; favoriteSlugs: string[] }) {
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
    <>
    <main className="section">
      <h1 className="eyebrow">{t("apps.eyebrow")}</h1>

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
            <h2 className="app-category-title">{td(`categories.${category}`)}</h2>
            <div className="app-grid">
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
            </div>
          </section>
        ))
      )}
    </main>

    <footer>
      <span>PAIBOT.app</span>
      <span>&copy; <span>{year}</span> PAIBOT LLC.</span>
    </footer>
    </>
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
  const Icon = app.icon;
  const className = `app-card${app.status === "comingSoon" ? " muted" : ""}`;
  const content = (
    <>
      <span className="app-icon" aria-hidden="true"><Icon /></span>
      <div>
        {app.status === "comingSoon" && <p className="app-kicker">{comingSoonLabel}</p>}
        <h3>{t(`${app.messageKey}.title`)}</h3>
        <p>{t(`${app.messageKey}.description`)}</p>
      </div>
    </>
  );
  const card = app.href ? <Link className={className} href={app.href}>{content}</Link> : <div className={className}>{content}</div>;

  // Only published apps have anything real to favorite - comingSoon apps
  // (including /math) get no star. Signed-in state comes from the route's
  // loader (SSR-correct on first paint), not a client-only auth hook, so
  // there's no post-hydration flash across a whole grid of cards.
  const canFavorite = signedIn && app.status === "published";
  if (!canFavorite) return card;
  return (
    <div className="app-card-wrap">
      {card}
      <FavoriteButton slug={app.slug} favorited={favorited} addLabel={favoriteLabel} removeLabel={unfavoriteLabel} />
    </div>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"}>
      <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.2 1 5.9L12 17l-5.2 2.8 1-5.9-4.3-4.2 5.9-.8z" />
    </svg>
  );
}

function FavoriteButton({ slug, favorited, addLabel, removeLabel }: {
  slug: string;
  favorited: boolean;
  addLabel: string;
  removeLabel: string;
}) {
  const fetcher = useFetcher();
  const pendingIntent = fetcher.formData?.get("intent");
  const isFavorited = pendingIntent ? pendingIntent === "add" : favorited;
  return (
    <fetcher.Form method="post" className="favorite-form">
      <input type="hidden" name="appSlug" value={slug} />
      <input type="hidden" name="intent" value={isFavorited ? "remove" : "add"} />
      <button
        type="submit"
        className="favorite-button"
        aria-pressed={isFavorited}
        aria-label={isFavorited ? removeLabel : addLabel}
        data-slug={slug}
      >
        <StarIcon filled={isFavorited} />
      </button>
    </fetcher.Form>
  );
}
