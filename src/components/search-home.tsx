import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "use-intl";
import { Link } from "../i18n/navigation";
import { apps, APP_CATEGORIES, type DynamicT } from "../lib/apps";
import { MATH_CATALOG } from "../lib/math-catalog";
import { prepare, search, type Entry } from "../lib/search";
import SiteFooter from "./site-footer";
import styles from "./search-home.module.css";

// The top page: a search box, and what it finds - the apps, and the units and learning items of the math drills.
export default function SearchHome({ year }: { year: number }) {
  const t = useTranslations("App");
  const ts = useTranslations("App.search");
  const locale = useLocale();
  const td = t as unknown as DynamicT;
  const input = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const prepared = useMemo(() => {
    const entries: Entry[] = [];
    for (const app of apps) {
      if (app.status !== "published" || !app.href) continue;
      entries.push({ key: `app:${app.slug}`, kind: "app", href: app.href, title: td(`${app.messageKey}.title`), text: td(`${app.messageKey}.description`), keywords: td(`${app.messageKey}.keywords`), context: td(`categories.${app.category}`) });
    }
    for (const unit of MATH_CATALOG) {
      if (unit.status !== "published") continue;
      const unitTitle = td(`math.units.${unit.id}.title`);
      entries.push({ key: `unit:${unit.id}`, kind: "unit", href: `/math/${unit.id}`, title: unitTitle, text: td(`math.units.${unit.id}.summary`), keywords: "", context: td("math.title") });
      for (const item of unit.items) {
        entries.push({ key: `item:${unit.id}/${item.id}`, kind: "item", href: `/math/${unit.id}/${item.id}`, title: td(`math.units.${unit.id}.items.${item.id}.title`), text: td(`math.units.${unit.id}.items.${item.id}.summary`), keywords: "", context: `${td("math.title")} › ${unitTitle}` });
      }
    }
    return prepare(entries);
    // The texts depend on the language only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);
  const results = useMemo(() => search(prepared, query), [prepared, query]);

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
    if (!results.length) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setActive(index => Math.min(results.length - 1, index + 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive(index => Math.max(0, index - 1)); }
    else if (event.key === "Enter") { event.preventDefault(); document.getElementById(`result-${active}`)?.click(); }
  }

  return (
    <>
      <main className={styles.page}>
        <h1 className={styles.brand}><span className={styles.mark} aria-hidden="true" /><span>PAIBOT</span></h1>
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
            {APP_CATEGORIES.map(category => {
              const list = apps.filter(app => app.category === category && app.status === "published" && app.href);
              if (!list.length) return null;
              return (
                <section key={category}>
                  <h2>{td(`categories.${category}`)}</h2>
                  <ul>{list.map(app => <li key={app.slug}><Link href={app.href!}><app.icon aria-hidden="true" /><span className={styles.name}>{td(`${app.messageKey}.title`)}<span className={styles.about}>{td(`${app.messageKey}.description`)}</span></span></Link></li>)}</ul>
                </section>
              );
            })}
          </nav>
        )}
      </main>
      <SiteFooter year={year} />
    </>
  );
}
