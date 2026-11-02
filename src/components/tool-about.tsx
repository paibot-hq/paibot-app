import { useLocale, useTranslations } from "use-intl";
import { Link } from "../i18n/navigation";
import { type DynamicT } from "../lib/apps";
import { relatedApps, type AppData } from "../lib/app-catalog";
import { localizedUrl, toolStructuredData } from "../lib/seo";
import { useSiteMeta } from "../root";
import styles from "./tool-about.module.css";

// A tool's guide, written for the person using it: how to use it, how it works, what to watch out for (App.<key>.guide), and the
// questions people ask about it (App.<key>.faq). Raw message arrays, so a tool without one simply has none.
type GuideSection = { heading: string; paragraphs: string[] };
type Faq = { q: string; a: string };
type WorkedExample = { title: string; steps: string[]; result: string; note: string; code?: string };

// Under every tool: what it is in a few plain sentences (the page is otherwise only controls, which search engines read as a thin page), a
// concrete example when available, the guide and questions when the tool has them, the tools of the same kind to go to next (so a tool is
// reached from other pages than the top one), and the same facts as structured data.
export default function ToolAbout({ app }: { app: AppData }) {
  const t = useTranslations("App");
  const dynamic = t as unknown as DynamicT;
  const locale = useLocale() as "ja" | "en" | "zh";
  const { siteOrigin } = useSiteMeta();
  const related = relatedApps(app);
  // Keys built from the catalog, which the typed `t` cannot check (as `dynamic` above).
  const raw = t as unknown as { has: (key: string) => boolean; raw: (key: string) => unknown };
  const guide = raw.has(`${app.messageKey}.guide`) ? raw.raw(`${app.messageKey}.guide`) as GuideSection[] : [];
  const faq = raw.has(`${app.messageKey}.faq`) ? raw.raw(`${app.messageKey}.faq`) as Faq[] : [];
  const example = raw.has(`${app.messageKey}.workedExample`) ? raw.raw(`${app.messageKey}.workedExample`) as WorkedExample : null;
  const data = toolStructuredData({
    name: dynamic(`${app.messageKey}.title`),
    description: dynamic(`${app.messageKey}.description`),
    url: localizedUrl(siteOrigin, locale, app.href!),
    locale,
    category: app.category,
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
      {guide.map(section => (
        <section key={section.heading} className={styles.section}>
          <h3 className={styles.sub}>{section.heading}</h3>
          {section.paragraphs.map(paragraph => <p key={paragraph} className={styles.text}>{paragraph}</p>)}
        </section>
      ))}
      {faq.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sub}>{t("apps.faq")}</h3>
          <dl className={styles.faq}>
            {faq.map(item => <div key={item.q}><dt>{item.q}</dt><dd>{item.a}</dd></div>)}
          </dl>
        </section>
      )}
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
