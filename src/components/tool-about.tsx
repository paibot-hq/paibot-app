import { useLocale, useTranslations } from "use-intl";
import { Link } from "../i18n/navigation";
import { type DynamicT } from "../lib/apps";
import { relatedApps, type AppData } from "../lib/app-catalog";
import { localizedUrl, toolStructuredData } from "../lib/seo";
import { useSiteMeta } from "../root";
import styles from "./tool-about.module.css";

// Explain the tool, a concrete example when available, its limits and related tools.
export default function ToolAbout({ app }: { app: AppData }) {
  const t = useTranslations("App");
  const dynamic = t as unknown as DynamicT;
  const locale = useLocale() as "ja" | "en" | "zh";
  const { siteOrigin } = useSiteMeta();
  const related = relatedApps(app);
  const exampleKey = `${app.messageKey}.workedExample`;
  const content = t as unknown as { has: (key: string) => boolean; raw: (key: string) => unknown };
  const example = content.has(exampleKey) ? content.raw(exampleKey) as { title: string; steps: string[]; result: string; note: string; code?: string } : null;
  const data = toolStructuredData({
    name: dynamic(`${app.messageKey}.title`),
    description: dynamic(`${app.messageKey}.description`),
    url: localizedUrl(siteOrigin, locale, app.href!),
    locale,
    tags: app.tags,
    siteName: "PAIBOT.app",
    siteUrl: localizedUrl(siteOrigin, locale, ""),
  });
  return (
    <section className={styles.about} aria-labelledby="tool-about" data-tool-about>
      <h2 id="tool-about" className={styles.heading}>{t("apps.about")}</h2>
      <p className={styles.text}>{dynamic(`${app.messageKey}.about`)}</p>
      {example && <section className={styles.example} aria-labelledby="tool-example" data-tool-example>
        <h3 id="tool-example" className={styles.heading}>{example.title}</h3>
        <ol className={styles.steps}>{example.steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
        {example.code && <pre className={styles.code}><code>{example.code}</code></pre>}
        <p className={styles.text}>{example.result}</p>
        <p className={styles.text}>{example.note}</p>
      </section>}
      <p className={styles.feedback}><Link href="/about#contact">{t("about.contactTitle")}</Link>{" · "}<Link href="/legal/privacy">{t("footer.privacy")}</Link></p>
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
