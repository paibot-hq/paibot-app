import SignUpWidget from "../../../../components/sign-up-widget";
import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("App");
  return { title: t("signUp"), robots: { index: false, follow: false } };
}

export default async function SignUpPage() {
  const locale = await getLocale();
  return <main className="auth-page"><SignUpWidget routing="path" path={`/${locale}/sign-up`} /></main>;
}
