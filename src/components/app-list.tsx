import { useState } from "react";
import { useSearchParams } from "react-router";
import { useLocale, useTranslations } from "use-intl";
import { apps, APP_TAGS, type AppTag, type DynamicT } from "../lib/apps";
import { useFavoritesData } from "../routes/locale";
import Card from "./app-card";
import SiteFooter from "./site-footer";
import styles from "./search-home.module.css";

const listed = apps.filter(app => app.status === "published" && app.href && !app.private);
// Ordered by each app's first tag (APP_TAGS order), then as in the catalog.
const ordered = listed
  .map((app, index) => ({ app, index, rank: APP_TAGS.indexOf(app.tags[0]) }))
  .sort((a, b) => a.rank - b.rank || a.index - b.index)
  .map(entry => entry.app);
const usedTags = APP_TAGS.filter(tag => listed.some(app => (app.tags as readonly AppTag[]).includes(tag)));
const isTag = (value: string | null): value is AppTag => value !== null && (usedTags as readonly string[]).includes(value);

// Every published app, narrowed by one tag (?tag=game, so a narrowed list can be linked): the top page shows only a few (the
// most viewed and the featured ones) and links here.
export default function AppList({ year }: { year: number }) {
  const t = useTranslations("App");
  const td = t as unknown as DynamicT;
  const locale = useLocale();
  const { signedIn, favoriteSlugs } = useFavoritesData();
  // The tag comes from the address on the first render (so the server sends the narrowed list); a click changes it here and
  // rewrites the address in place, without a navigation that would reload the layout's data for a list already in hand.
  const [params] = useSearchParams();
  const [tag, setTag] = useState<AppTag | null>(() => { const value = params.get("tag"); return isTag(value) ? value : null; });
  // Narrowed by a tag, the apps that have it first (their own kind) come before those that only also have it.
  const shown = tag
    ? ordered.filter(app => (app.tags as readonly AppTag[]).includes(tag)).sort((a, b) => Number(b.tags[0] === tag) - Number(a.tags[0] === tag))
    : ordered;
  const pick = (next: AppTag | null) => {
    setTag(next);
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("tag", next); else url.searchParams.delete("tag");
    window.history.replaceState(window.history.state, "", url);
  };
  return (
    <>
      <main className={`section ${styles.list}`} data-app-list>
        <header>
          <p className="eyebrow">{t("appList.eyebrow")}</p>
          <h1>{t("appList.title")}</h1>
          <p className={styles.intro}>{t("appList.intro")}</p>
        </header>
        <div className={styles.tags} role="group" aria-label={t("appList.filter")} data-app-tags>
          <button type="button" className={styles.chip} aria-pressed={tag === null} onClick={() => pick(null)}>{t("appList.all")}</button>
          {usedTags.map(id => (
            <button key={id} type="button" className={styles.chip} aria-pressed={tag === id} onClick={() => pick(tag === id ? null : id)} data-tag={id}>{td(`tags.${id}`)}</button>
          ))}
        </div>
        <nav className={styles.all} aria-label={t("appList.title")}>
          <ul>{shown.map(app => <Card key={app.slug} app={app} td={td} locale={locale} signedIn={signedIn} favorited={favoriteSlugs.includes(app.slug)} />)}</ul>
        </nav>
      </main>
      <SiteFooter year={year} />
    </>
  );
}
