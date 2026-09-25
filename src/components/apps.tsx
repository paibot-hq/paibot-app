"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "use-intl";
import { Link } from "../i18n/navigation";
import { apps as registeredApps, APP_CATEGORIES, type AppEntry, type DynamicT } from "../lib/apps";

const apps = registeredApps;

export default function Apps({ year }: { year: number }) {
  const t = useTranslations("App");
  const td = t as unknown as DynamicT;
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

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
                <AppCard key={app.slug} app={app} t={td} comingSoonLabel={t("apps.comingSoon")} />
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

function AppCard({ app, t, comingSoonLabel }: { app: AppEntry; t: DynamicT; comingSoonLabel: string }) {
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
  if (app.href) {
    return <Link className={className} href={app.href}>{content}</Link>;
  }
  return <div className={className}>{content}</div>;
}
