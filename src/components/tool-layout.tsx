import type { ReactNode } from "react";
import { useLocale, useTranslations } from "use-intl";
import FavoriteButton from "./favorite-button";
import { usePathname } from "../i18n/navigation";
import { apps } from "../lib/apps";
import { useFavoritesData } from "../routes/locale";
import styles from "./tool-layout.module.css";

type ToolLayoutProps = {
  title: string;
  children?: ReactNode;
  layout?: "stacked" | "centered" | "spacious";
  contentWidth?: "full" | "auto";
  centerTitle?: boolean;
};

export default function ToolLayout({
  title, children, layout = "stacked", contentWidth = "full", centerTitle = false,
}: ToolLayoutProps) {
  const t = useTranslations("App");
  const locale = useLocale();
  const pathname = usePathname();
  const { signedIn, favoriteSlugs } = useFavoritesData();
  // Only a real, published tool has anything to favorite - /math (comingSoon)
  // also uses ToolLayout but isFavoritableSlug/AppCard gate on this same
  // "published" condition, so this just needs to find a matching entry at all.
  const app = apps.find(candidate => candidate.href === pathname && candidate.status === "published");

  return (
    <main className={styles.page}>
      <h1 className={styles.title} data-centered={centerTitle || undefined}>{title}</h1>
      {app && (
        <FavoriteButton
          slug={app.slug}
          signedIn={signedIn}
          favorited={favoriteSlugs.includes(app.slug)}
          addLabel={t("apps.favorite")}
          removeLabel={t("apps.unfavorite")}
          actionPath={`/${locale}/apps`}
        />
      )}
      <div className={styles.content} data-layout={layout} data-width={contentWidth}>
        {children}
      </div>
    </main>
  );
}
