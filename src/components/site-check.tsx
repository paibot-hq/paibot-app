import ToolLayout from "./tool-layout";
import controls from "./tool-controls.module.css";
import styles from "./site-check.module.css";

import { useFetcher } from "react-router";
import { useTranslations } from "use-intl";
import type { action } from "../routes/site-check";

type Verdict = "ok" | "redirect" | "tooManyRedirects" | "clientError" | "serverError";

function verdictOf(httpStatus: number, tooManyRedirects: boolean): Verdict {
  if (tooManyRedirects) return "tooManyRedirects";
  if (httpStatus >= 500) return "serverError";
  if (httpStatus >= 400) return "clientError";
  if (httpStatus >= 300) return "redirect";
  return "ok";
}

export default function SiteCheck() {
  const t = useTranslations("App");
  const fetcher = useFetcher<typeof action>();
  const result = fetcher.data;
  const loading = fetcher.state !== "idle";
  const verdict = result?.status === "ok" ? verdictOf(result.httpStatus, result.tooManyRedirects) : null;

  return (
    <ToolLayout title={t("siteCheck.title")}>
      <fetcher.Form method="post" className={styles["form"]}>
        <input
          className={styles["input"]}
          name="url"
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder={t("siteCheck.placeholder")}
          aria-label={t("siteCheck.placeholder")}
        />
        <button className="auth-link" type="submit" disabled={loading}>
          {loading ? t("siteCheck.loading") : t("siteCheck.submit")}
        </button>
      </fetcher.Form>
      <p className={controls.label}>{t("siteCheck.hint")}</p>

      {result?.status === "error" && (
        <p className={controls.error} aria-live="polite">{t(`siteCheck.error.${result.reason}`)}</p>
      )}

      {result?.status === "ok" && verdict && (
        <div className={styles["result"]} aria-live="polite">
          <p className={`${styles["verdict"]} ${styles[verdict]}`}>
            {t(`siteCheck.verdict.${verdict}`, { status: result.httpStatus })}
          </p>
          <dl className={styles["fields"]}>
            <div><dt>{t("siteCheck.labels.status")}</dt><dd>{result.httpStatus}</dd></div>
            <div><dt>{t("siteCheck.labels.time")}</dt><dd>{t("siteCheck.ms", { ms: result.totalMs })}</dd></div>
            <div><dt>{t("siteCheck.labels.finalUrl")}</dt><dd>{result.finalUrl}</dd></div>
            <div><dt>{t("siteCheck.labels.contentType")}</dt><dd>{result.contentType ?? t("siteCheck.none")}</dd></div>
            <div><dt>{t("siteCheck.labels.server")}</dt><dd>{result.server ?? t("siteCheck.none")}</dd></div>
          </dl>
          {result.hops.length > 1 && (
            <section className={styles["hops"]}>
              <h2 className={controls.label}>{t("siteCheck.labels.redirects", { count: result.hops.length - 1 })}</h2>
              <ol>
                {result.hops.map(hop => (
                  <li key={hop.url}>
                    <span className={styles["hopStatus"]}>{hop.status}</span>
                    <span className={styles["hopUrl"]}>{hop.url}</span>
                    <span className={styles["hopTime"]}>{t("siteCheck.ms", { ms: hop.ms })}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      )}
    </ToolLayout>
  );
}
