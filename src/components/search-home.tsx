import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "use-intl";
import { Link } from "../i18n/navigation";
import { apps, type AppEntry, type DynamicT } from "../lib/apps";
import { FEATURED_SLUGS } from "../lib/app-catalog";
import { prepare, search, type Entry } from "../lib/search";
import Card from "./app-card";
import SiteFooter from "./site-footer";
import { useFavoritesData } from "../routes/locale";
import styles from "./search-home.module.css";

// The top page: a search box that finds every app, and under it only a few: the most viewed and the featured ones, then a link to the
// list of every app (/apps). `popular`: the most viewed tools of the last week (src/lib/tool-ranking.ts), most first.
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
  const featuredApps = FEATURED_SLUGS.map(slug => apps.find(app => app.slug === slug && app.status === "published" && app.href))
    .filter((app): app is AppEntry => Boolean(app) && !popularApps.includes(app!));
  const total = apps.filter(app => app.status === "published" && app.href && !app.private).length;
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
        <p className={styles.tagline}>{ts("tagline")}</p>
        <p className={styles.introduction}>{ts("introduction")}</p>
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
            enterKeyHint="go"
            value={query}
            onChange={event => { setQuery(event.target.value); setActive(0); }}
            onKeyDown={onKeyDown}
            data-search="input"
          />
        </div>
        {!query.trim() && <p className={styles.browse}><Link href="/apps">{ts("allApps", { count: total })}</Link></p>}
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
            <section aria-labelledby="home-start" data-search="start">
              <h2 id="home-start">{ts("startTitle")}</h2>
              <p className={styles.categoryText}>{ts("startIntro")}</p>
              <div className={styles.tasks}>
                {([
                  ["photo", "/metadata", "/mosaic"],
                  ["writing", "/wc", "/date-calc"],
                  ["data", "/sql", "/json"],
                  ["math", "/math/arith/order-of-operations", "/math"],
                ] as const).map(([key, first, second]) => <article key={key} className={styles.task}>
                  <h3>{ts(`tasks.${key}.title`)}</h3>
                  <p>{ts(`tasks.${key}.body`)}</p>
                  <div className={styles.taskLinks}>
                    <Link href={first}>{ts(`tasks.${key}.firstLink`)} →</Link>
                    <Link href={second}>{ts(`tasks.${key}.secondLink`)} →</Link>
                  </div>
                  <ol>{(["first", "second"] as const).map(step => <li key={step}>{ts(`tasks.${key}.${step}`)}</li>)}</ol>
                </article>)}
              </div>
            </section>
            {popularApps.length > 0 && (
              <section data-search="popular">
                <h2>{ts("popular")}</h2>
                <ol className={styles.ranked}>{popularApps.map(app => <Card key={app.slug} app={app} td={td} locale={locale} signedIn={signedIn} favorited={favorites.has(app.slug)} />)}</ol>
                <p className={styles.more}><Link href="/ranking">{ts("ranking")}</Link></p>
              </section>
            )}
            <section data-search="featured">
              <h2>{ts("featured")}</h2>
              <ul>{featuredApps.map(app => <Card key={app.slug} app={app} td={td} locale={locale} signedIn={signedIn} favorited={favorites.has(app.slug)} />)}</ul>
              <p className={styles.more}><Link href="/apps" data-search="all-apps">{ts("allApps", { count: total })}</Link></p>
            </section>
            </>}
          </nav>
        )}
        <p className={styles.siteNote}>{ts("siteNote")} <Link href="/about">{ts("aboutLink")}</Link></p>
      </main>
      <SiteFooter year={year} />
    </>
  );
}
