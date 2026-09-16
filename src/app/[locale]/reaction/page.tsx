import { getLocale, getTranslations } from "next-intl/server";
import { publicMetadata } from "../../../lib/seo";
import ReactionTest from "../../../components/reaction-test";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations("App");
  return publicMetadata(locale, "/reaction", `${t("reactionTitle")} | PAIBOT.app`, t("reactionDescription"));
}

export default function ReactionPage() {
  return <ReactionTest />;
}
