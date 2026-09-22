import { getLocale, getTranslations } from "next-intl/server";
import { publicMetadata } from "../../../lib/seo";
import ArithmeticPractice from "../../../components/arithmetic-practice";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations("App");
  return publicMetadata(locale, "/arith", `${t("arith.title")} | PAIBOT.app`, t("arith.description"));
}

export default function ArithPage() {
  return <ArithmeticPractice />;
}
