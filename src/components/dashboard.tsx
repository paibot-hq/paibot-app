"use client";

import { Link } from "../i18n/navigation";
import { useClerk } from "@clerk/nextjs";
import { useTranslations } from "next-intl";

export default function Dashboard() {
  const t = useTranslations("App");
  const { openUserProfile } = useClerk();
  return (
    <main className="section dashboard-page">
      <p className="eyebrow">PAIBOT.app</p>
      <h1>{t("dashboard")}</h1>
      <p>{t("dashboardDescription")}</p>
      <div className="dashboard-actions">
        <button className="auth-link" type="button" onClick={() => openUserProfile()}>{t("accountSettings")}</button>
        <Link className="auth-link" href="/">{t("backHome")}</Link>
      </div>
    </main>
  );
}
