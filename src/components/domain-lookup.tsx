"use client";

import ToolLayout from "./tool-layout";
import controls from "./tool-controls.module.css";

import styles from "./domain-lookup.module.css";

import { useFetcher } from "react-router";
import { useTranslations } from "use-intl";
import type { action } from "../routes/domain";

export default function DomainLookup() {
  const t = useTranslations("App");
  const fetcher = useFetcher<typeof action>();
  const result = fetcher.data;
  const loading = fetcher.state !== "idle";

  const fields: { label: string; value: string | undefined }[] = result?.status === "ok" ? [
    { label: t("domain.registrarLabel"), value: result.parsed.registrar },
    { label: t("domain.registrantLabel"), value: result.parsed.registrant },
    { label: t("domain.creationLabel"), value: result.parsed.creationDate },
    { label: t("domain.expiryLabel"), value: result.parsed.expiryDate },
    { label: t("domain.nameServersLabel"), value: result.parsed.nameServers.join(", ") || undefined },
  ] : [];

  return (
    <ToolLayout title={t("domain.title")}>
      <fetcher.Form method="post" className={styles["form"]}>
        <input
          className={styles["input"]}
          name="domain"
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder={t("domain.placeholder")}
          aria-label={t("domain.placeholder")}
        />
        <button className="auth-link" type="submit" disabled={loading}>
          {loading ? t("domain.loading") : t("domain.submit")}
        </button>
      </fetcher.Form>

      {result?.status === "error" && (
        <p className={controls.error} aria-live="polite">{t(`domain.error.${result.reason}`)}</p>
      )}

      {result?.status === "ok" && (
        <div className={styles["result"]} aria-live="polite">
          <div className={`${styles["verdict"]} ${styles[result.availability]}`}>
            <p className={styles["verdictTitle"]}>{t(`domain.availability.${result.availability}`, { domain: result.domain })}</p>
            {result.availability === "available" && <p className={styles["verdictNote"]}>{t("domain.availability.availableNote")}</p>}
          </div>
          {result.availability !== "available" && fields.map(field => (
            <div key={field.label} className={styles["field"]}>
              <p className={controls.label}>{field.label}</p>
              <p className={styles["value"]}>{field.value ?? t("domain.unknown")}</p>
            </div>
          ))}
          <details className={styles["raw"]}>
            <summary>{t("domain.rawToggle")}</summary>
            <pre>{result.raw}</pre>
          </details>
        </div>
      )}
    </ToolLayout>
  );
}
