import { getLocale, getTranslations } from "next-intl/server";
import { publicMetadata } from "../../../lib/seo";
import IpLookup from "../../../components/ip-lookup";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations("App");
  return publicMetadata(locale, "/ip", `${t("ip.title")} | PAIBOT.app`, t("ip.description"));
}

export default function IpPage() {
  return <IpLookup />;
}
