import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import ToolLayout from "../../../components/tool-layout";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("App");
  return { title: t("mathTitle"), robots: { index: false, follow: false } };
}

export default async function MathPage() {
  const t = await getTranslations("App");
  return (
    <ToolLayout title={t("mathComingSoonTitle")} layout="centered" centerTitle>
      <p>{t("mathComingSoonBody")}</p>
    </ToolLayout>
  );
}
