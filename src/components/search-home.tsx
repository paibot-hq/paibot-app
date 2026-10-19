import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "use-intl";
import { Link } from "../i18n/navigation";
import { apps, APP_CATEGORIES, type AppEntry, type DynamicT } from "../lib/apps";
import { prepare, search, type Entry } from "../lib/search";
import FavoriteButton from "./favorite-button";
import SiteFooter from "./site-footer";
import { useFavoritesData } from "../routes/locale";
import styles from "./search-home.module.css";

// A card: the app's link, and the favourite star beside it (a button cannot sit inside a link). Defined here, not
// inside SearchHome: a component made inside another is a new component on every render, and React would rebuild every card.
function Card({ app, td, locale, signedIn, favorited }: { app: AppEntry; td: DynamicT; locale: string; signedIn: boolean; favorited: boolean }) {
  return (
    <li className="app-card-wrap">
      <Link href={app.href!}><app.icon aria-hidden="true" /><span className={styles.name}>{td(`${app.messageKey}.title`)}<span className={styles.about}>{td(`${app.messageKey}.description`)}</span></span></Link>
      <FavoriteButton actionPath={`/${locale}/favorites`} slug={app.slug} signedIn={signedIn} favorited={favorited} addLabel={td("apps.favorite")} removeLabel={td("apps.unfavorite")} />
    </li>
  );
}

// The top page: a search box that finds the apps, and every app listed under it.
// `popular`: the most viewed tools of the last week (src/lib/tool-ranking.ts), most first; shown above the full list.
export default function SearchHome({ year, popular = [] }: { year: number; popular?: { slug: string; views: number }[] }) {
  const t = useTranslations("App");
  const ts = useTranslations("App.search");
  const locale = useLocale();
  const td = t as unknown as DynamicT;
  const { signedIn, favoriteSlugs } = useFavoritesData();
  const favorites = useMemo(() => new Set(favoriteSlugs), [favoriteSlugs]);
  const input = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [onlyMine, setOnlyMine] = useState(false);

  const prepared = useMemo(() => {
    const entries: Entry[] = [];
    for (const app of apps) {
      if (app.status !== "published" || !app.href) continue;
      entries.push({ key: `app:${app.slug}`, kind: "app", href: app.href, title: td(`${app.messageKey}.title`), text: td(`${app.messageKey}.description`), keywords: td(`${app.messageKey}.keywords`), context: td(`categories.${app.category}`) });
    }
    return prepare(entries);
    // The texts depend on the language only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);
  const results = useMemo(() => search(prepared, query), [prepared, query]);
  // The signed-in visitor's favourite apps come first.
  const mine = apps.filter(app => app.status === "published" && app.href && favorites.has(app.slug));
  const popularApps = popular.map(p => apps.find(app => app.slug === p.slug && app.status === "published" && app.href)).filter((app): app is AppEntry => Boolean(app));
  // "/" jumps to the box from anywhere on the page, as on most sites.
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key === "/" && target?.tagName !== "INPUT" && target?.tagName !== "TEXTAREA") { event.preventDefault(); input.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Keys pressed while an input method is composing (Japanese, Chinese) belong to it: the Enter that confirms the
    // conversion must not open a result. Safari sends that Enter after the composition has ended, with keyCode 229.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (!results.length) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setActive(index => Math.min(results.length - 1, index + 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive(index => Math.max(0, index - 1)); }
    else if (event.key === "Enter") { event.preventDefault(); document.getElementById(`result-${active}`)?.click(); }
  }

  return (
    <>
      <main className={styles.page}>
        <h1 className={styles.brand}><img className={styles.mark} src="/icon.svg" alt="" width="40" height="40" /><span>PAIBOT.app</span></h1>
        <div className={styles.box}>
          <input
            ref={input}
            className={styles.input}
            type="search"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="search-results"
            aria-activedescendant={results.length ? `result-${active}` : undefined}
            aria-label={ts("label")}
            placeholder={ts("placeholder")}
            autoComplete="off"
            autoFocus
            enterKeyHint="go"
            value={query}
            onChange={event => { setQuery(event.target.value); setActive(0); }}
            onKeyDown={onKeyDown}
            data-search="input"
          />
        </div>
        {signedIn && !query.trim() && (
          <p className={styles.filter}>
            <button type="button" className={styles.chip} aria-pressed={onlyMine} onClick={() => setOnlyMine(on => !on)} data-search="only-favorites">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.2 1 5.9L12 17l-5.2 2.8 1-5.9-4.3-4.2 5.9-.8z" /></svg>
              {ts("onlyFavorites")}
            </button>
          </p>
        )}
        {query.trim() && (
          <ul id="search-results" className={styles.results} role="listbox" aria-label={ts("results")} data-search="results">
            {results.length === 0 && <li className={styles.none} role="presentation">{ts("none", { query: query.trim() })}</li>}
            {results.map((entry, index) => (
              <li key={entry.key} role="presentation">
                <Link id={`result-${index}`} role="option" aria-selected={index === active} data-active={index === active || undefined} className={styles.result} href={entry.href} onMouseMove={() => setActive(index)}>
                  <span className={styles.title}>{entry.title}</span>
                  <span className={styles.context}>{ts(`kind.${entry.kind}`)} · {entry.context}</span>
                  <span className={styles.text}>{entry.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {!query.trim() && (
          <nav className={styles.all} aria-label={ts("all")}>
            {onlyMine ? (
              <section>
                <h2>{ts("favorites")}</h2>
                {mine.length === 0 ? <p className={styles.empty}>{ts("noFavorites")}</p> : <ul data-search="favorites">{mine.map(app => <Card key={app.slug} app={app} td={td} locale={locale} signedIn={signedIn} favorited />)}</ul>}
              </section>
            ) : <>
            {popularApps.length > 0 && (
              <section data-search="popular">
                <h2>{ts("popular")}</h2>
                <ol className={styles.ranked}>{popularApps.map(app => <Card key={app.slug} app={app} td={td} locale={locale} signedIn={signedIn} favorited={favorites.has(app.slug)} />)}</ol>
                <p className={styles.more}><Link href="/ranking">{ts("ranking")}</Link></p>
              </section>
            )}
            {APP_CATEGORIES.map(category => {
              const list = apps.filter(app => app.category === category && app.status === "published" && app.href);
              if (!list.length) return null;
              return (
                <section key={category}>
                  <h2>{td(`categories.${category}`)}</h2>
                  <ul>{list.map(app => <Card key={app.slug} app={app} td={td} locale={locale} signedIn={signedIn} favorited={favorites.has(app.slug)} />)}</ul>
                </section>
              );
            })}
            </>}
          </nav>
        )}
      </main>
      <SiteFooter year={year} />
    </>
  );
}
