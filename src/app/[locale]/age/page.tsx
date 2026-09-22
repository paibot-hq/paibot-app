import { getLocale, getTranslations } from "next-intl/server";
import { publicMetadata } from "../../../lib/seo";
import BirthYear from "../../../components/birth-year";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations("App");
  return publicMetadata(locale, "/age", `${t("age.title")} | PAIBOT.app`, t("age.description"));
}

export default function AgePage() {
  return <BirthYear year={new Date().getFullYear()} />;
}
