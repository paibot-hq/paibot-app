"use client";

import { useLocale, useTranslations } from "use-intl";
import { Link } from "../i18n/navigation";
import { apps, type DynamicT } from "../lib/apps";
import { places } from "../lib/rank";
import { RANK_DAYS } from "../lib/tool-ranking";
import SiteFooter from "./site-footer";
import styles from "./tool-ranking.module.css";

// Every published app, most viewed in the last week first (the ones not viewed yet at the end, in the catalog's order),
// with its views as a bar (the first is the full width) and its place (ties share one).
export default function ToolRanking({ ranking, year }: { ranking: { slug: string; views: number }[]; year: number }) {
  const t = useTranslations("App.ranking");
  const td = useTranslations("App") as unknown as DynamicT;
  const locale = useLocale();
  const viewsOf = new Map(ranking.map(r => [r.slug, r.views]));
  const rows = apps
    .filter(app => app.status === "published" && app.href && !app.private)
    .map((app, order) => ({ slug: app.slug, app, views: viewsOf.get(app.slug) ?? 0, order }))
    .sort((a, b) => b.views - a.views || a.order - b.order);
  const place = places(rows.map(r => r.views));
  const most = Math.max(1, rows[0]?.views ?? 0);
  const counted = rows.some(r => r.views > 0);
  return (
    <>
      <main className={`section ${styles.page}`} data-ranking="page">
        <header>
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1>{t("title")}</h1>
          <p className={styles.intro}>{t("intro", { days: RANK_DAYS })}</p>
        </header>
        {!counted && <p className={styles.empty} data-ranking="empty">{t("empty")}</p>}
        <ol className={styles.list} data-ranking="list">
            {rows.map(({ slug, views, app }, i) => (
              <li key={slug} data-slug={slug}>
                <span className={styles.rank} data-place={views ? place[i] : undefined}>{views ? place[i] : "–"}</span>
                <Link className={styles.tool} href={app!.href!}>
                  {app && <app.icon aria-hidden="true" />}
                  <span>{td(`${app!.messageKey}.title`)}</span>
                </Link>
                <span className={styles.track} aria-hidden="true">{views > 0 && <span className={styles.fill} style={{ width: `${Math.max(2, (views / most) * 100)}%` }} />}</span>
                <span className={styles.views}>{t("views", { count: views, formatted: views.toLocaleString(locale) })}</span>
              </li>
            ))}
        </ol>
        <p className={styles.note}>{t("note")}</p>
      </main>
      <SiteFooter year={year} />
    </>
  );
}
