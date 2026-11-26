import { useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "use-intl";
import FavoriteButton from "./favorite-button";
import ToolAbout, { type ToolTab } from "./tool-about";
import { usePathname } from "../i18n/navigation";
import { apps, type DynamicT } from "../lib/apps";
import { useFavoritesData } from "../routes/locale";
import styles from "./tool-layout.module.css";

type ToolLayoutProps = {
  title: string;
  children?: ReactNode;
  layout?: "stacked" | "centered" | "spacious";
  contentWidth?: "full" | "auto";
  // A breadcrumb-style link (or similar) above the title - e.g. "back to the
  // parent page" for a tool with sub-pages, like the math factorization set
  // picker/quiz. Rendered above <h1>, unlike children which render below it.
  aboveTitle?: ReactNode;
  // The text about the tool and the links to other tools under the page (for search engines and for those who scroll); a tool that shows them
  // somewhere of its own (the government FAQ, in a tab) turns this off and renders <ToolAbout> itself.
  about?: boolean;
  // Less room above and between the parts on a phone, for a page used in quick repeated steps (a math quiz).
  compact?: boolean;
};

export default function ToolLayout({
  title, children, layout = "stacked", contentWidth = "full", aboveTitle, about = true, compact = false,
}: ToolLayoutProps) {
  const t = useTranslations("App");
  const dynamic = t as unknown as DynamicT;
  const locale = useLocale();
  const pathname = usePathname();
  const { signedIn, favoriteSlugs } = useFavoritesData();
  // Only a real, published tool has anything to favorite - /math (comingSoon)
  // also uses ToolLayout but isFavoritableSlug/AppCard gate on this same
  // "published" condition, so this just needs to find a matching entry at all.
  const app = apps.find(candidate => candidate.href === pathname && candidate.status === "published");
  const raw = t as unknown as { has: (key: string) => boolean };
  const hasGuide = Boolean(about && app && !app.private && raw.has(`${app.messageKey}.guide`));
  const hasFaq = Boolean(about && app && !app.private && raw.has(`${app.messageKey}.faq`));
  const showTabs = hasGuide || hasFaq;
  const [tab, setTab] = useState<ToolTab>("app");

  return (
    <main className={styles.page} data-compact={compact || undefined}>
      {aboveTitle}
      <header className={styles.head} data-tag={app?.tags[0]} data-tabs={showTabs || undefined}>
        <div className={styles.headRow}>
          <div className={styles.identity}>
            {app && <app.icon className={styles.icon} aria-hidden="true" />}
            <div className={styles.titles}>
              <h1 className={styles.title}>{title}</h1>
              {app && !app.private && <p className={styles.tagline}>{dynamic(`${app.messageKey}.description`)}</p>}
            </div>
          </div>
          <div className={styles.aside}>
            {app?.localOnly && <span className={styles.localBadge}>{t("apps.localBadge")}</span>}
            {app && (
              <FavoriteButton
                slug={app.slug}
                signedIn={signedIn}
                favorited={favoriteSlugs.includes(app.slug)}
                addLabel={t("apps.favorite")}
                removeLabel={t("apps.unfavorite")}
                actionPath={`/${locale}/favorites`}
              />
            )}
          </div>
        </div>
        {showTabs && (
          <div className={styles.tabs} role="tablist" aria-label={title} data-tool-tabs>
            <button type="button" role="tab" aria-selected={tab === "app"} className={styles.tab} onClick={() => setTab("app")} data-tool-tab="app">
              {t("search.kind.app")}
            </button>
            {hasGuide && (
              <button type="button" role="tab" aria-selected={tab === "guide"} className={styles.tab} onClick={() => setTab("guide")} data-tool-tab="guide">
                {t("apps.tabGuide")}
              </button>
            )}
            {hasFaq && (
              <button type="button" role="tab" aria-selected={tab === "faq"} className={styles.tab} onClick={() => setTab("faq")} data-tool-tab="faq">
                {t("apps.faq")}
              </button>
            )}
          </div>
        )}
      </header>
      <div className={styles.content} data-layout={layout} data-width={contentWidth} hidden={showTabs && tab !== "app"}>
        {children}
      </div>
      {about && app && !app.private && <ToolAbout app={app} tab={showTabs ? tab : "app"} />}
    </main>
  );
}
