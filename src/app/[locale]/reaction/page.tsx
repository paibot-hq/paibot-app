import { getLocale, getTranslations } from "next-intl/server";
import { publicMetadata } from "../../../lib/seo";
import ReactionTest from "../../../components/reaction-test";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations("App");
  return publicMetadata(locale, "/reaction", `${t("reaction.title")} | PAIBOT.app`, t("reaction.description"));
}

export default function ReactionPage() {
  return <ReactionTest />;
}
