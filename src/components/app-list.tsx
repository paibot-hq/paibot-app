import { useLocale, useTranslations } from "use-intl";
import { apps, APP_CATEGORIES, type DynamicT } from "../lib/apps";
import { useFavoritesData } from "../routes/locale";
import Card from "./app-card";
import SiteFooter from "./site-footer";
import styles from "./search-home.module.css";

// Every published app by category, each category with a line on what its tools are for: the top page shows only a few
// (the most viewed and the featured ones) and links here.
export default function AppList({ year }: { year: number }) {
  const t = useTranslations("App");
  const td = t as unknown as DynamicT;
  const locale = useLocale();
  const { signedIn, favoriteSlugs } = useFavoritesData();
  return (
    <>
      <main className={`section ${styles.list}`} data-app-list>
        <header>
          <p className="eyebrow">{t("appList.eyebrow")}</p>
          <h1>{t("appList.title")}</h1>
          <p className={styles.intro}>{t("appList.intro")}</p>
        </header>
        <nav className={styles.all} aria-label={t("appList.title")}>
          {APP_CATEGORIES.map(category => {
            const list = apps.filter(app => app.category === category && app.status === "published" && app.href && !app.private);
            if (!list.length) return null;
            return (
              <section key={category} data-category={category} aria-labelledby={`category-${category}`}>
                <h2 id={`category-${category}`}>{td(`categories.${category}`)}</h2>
                <p className={styles.categoryText}>{td(`categoryDescriptions.${category}`)}</p>
                <ul>{list.map(app => <Card key={app.slug} app={app} td={td} locale={locale} signedIn={signedIn} favorited={favoriteSlugs.includes(app.slug)} />)}</ul>
              </section>
            );
          })}
        </nav>
      </main>
      <SiteFooter year={year} />
    </>
  );
}
