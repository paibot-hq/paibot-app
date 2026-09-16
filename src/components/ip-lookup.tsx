"use client";

import ToolLayout from "./tool-layout";
import controls from "./tool-controls.module.css";

import styles from "./ip-lookup.module.css";

import { useTranslations } from "next-intl";

export default function IpLookup({ ip }: { ip: string | null }) {
  const t = useTranslations("App");
  return (
    <ToolLayout title={t("ipTitle")} layout="centered" contentWidth="auto">
      <p className={controls.label}>{t("ipLabel")}</p>
      <p className={styles["ip-value"]} aria-live="polite">{ip ?? t("ipUnknown")}</p>
      </ToolLayout>
  );
}
