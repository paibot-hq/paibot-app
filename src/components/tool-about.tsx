import { useLocale, useTranslations } from "use-intl";
import { Link } from "../i18n/navigation";
import { type DynamicT } from "../lib/apps";
import { relatedApps, type AppData } from "../lib/app-catalog";
import { localizedUrl, toolStructuredData } from "../lib/seo";
import { useSiteMeta } from "../root";
import styles from "./tool-about.module.css";

// Under every tool: what it is in a few plain sentences (the page is otherwise only controls, which search engines read as a thin page), the
// tools of the same kind to go to next (so a tool is reached from other pages than the top one), and the same facts as structured data.
export default function ToolAbout({ app }: { app: AppData }) {
  const t = useTranslations("App");
  const dynamic = t as unknown as DynamicT;
  const locale = useLocale() as "ja" | "en" | "zh";
  const { siteOrigin } = useSiteMeta();
  const related = relatedApps(app);
  const data = toolStructuredData({
    name: dynamic(`${app.messageKey}.title`),
    description: dynamic(`${app.messageKey}.description`),
    url: localizedUrl(siteOrigin, locale, app.href!),
    locale,
    category: app.category,
    siteName: "PAIBOT",
    siteUrl: localizedUrl(siteOrigin, locale, ""),
  });
  return (
    <section className={styles.about} aria-labelledby="tool-about" data-tool-about>
      <h2 id="tool-about" className={styles.heading}>{t("apps.about")}</h2>
      <p className={styles.text}>{dynamic(`${app.messageKey}.description`)}</p>
      {related.length > 0 && (
        <nav aria-label={t("apps.related")}>
          <h3 className={styles.sub}>{t("apps.related")}</h3>
          <ul className={styles.list}>
            {related.map(other => <li key={other.slug}><Link href={other.href!}>{dynamic(`${other.messageKey}.title`)}</Link></li>)}
          </ul>
        </nav>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />
    </section>
  );
}
