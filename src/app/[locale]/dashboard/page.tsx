import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Dashboard from "../../../components/dashboard";

import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("App");
  return { title: t("dashboard"), robots: { index: false, follow: false } };
}

export default async function DashboardPage() {
  // Check authentication before rendering the protected page.
  // Uses auth() + redirect() instead of auth.protect(): the latter's redirect
  // is not correctly intercepted by vinext's router (falls through to a 404).
  const { userId } = await auth();
  if (!userId) redirect(`/${await getLocale()}/sign-in`);
  return <Dashboard />;
}
