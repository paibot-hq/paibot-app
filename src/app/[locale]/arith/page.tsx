import { getLocale, getTranslations } from "next-intl/server";
import { publicMetadata } from "../../../lib/seo";
import ArithmeticPractice from "../../../components/arithmetic-practice";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations("App");
  return publicMetadata(locale, "/arith", `${t("arithTitle")} | PAIBOT.app`, t("arithDescription"));
}

export default function ArithPage() {
  return <ArithmeticPractice />;
}
