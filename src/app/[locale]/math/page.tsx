import { getLocale, getTranslations } from "next-intl/server";
import { publicMetadata } from "../../../lib/seo";
import MathPractice from "../../../components/math-practice";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations("App");
  return publicMetadata(locale, "/math", `${t("mathTitle")} | PAIBOT.app`, t("mathDescription"));
}

export default function MathPage() {
  return <MathPractice />;
}
