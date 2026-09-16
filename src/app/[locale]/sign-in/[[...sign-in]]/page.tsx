import SignInWidget from "../../../../components/sign-in-widget";
import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("App");
  return { title: t("signIn"), robots: { index: false, follow: false } };
}

export default async function SignInPage() {
  const locale = await getLocale();
  return <main className="auth-page"><SignInWidget routing="path" path={`/${locale}/sign-in`} /></main>;
}
