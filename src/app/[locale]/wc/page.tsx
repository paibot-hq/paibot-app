import { getLocale, getTranslations } from "next-intl/server";
import { publicMetadata } from "../../../lib/seo";
import CharCount from "../../../components/char-count";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations("App");
  return publicMetadata(locale, "/wc", `${t("wc.title")} | PAIBOT.app`, t("wc.description"));
}

export default function WcPage() {
  return <CharCount />;
}
