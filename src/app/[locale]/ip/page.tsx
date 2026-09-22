import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { publicMetadata } from "../../../lib/seo";
import { clientIpFromHeaders } from "../../../lib/ip";
import IpLookup from "../../../components/ip-lookup";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations("App");
  return publicMetadata(locale, "/ip", `${t("ip.title")} | PAIBOT.app`, t("ip.description"));
}

export default async function IpPage() {
  const ip = clientIpFromHeaders(await headers());
  return <IpLookup ip={ip} />;
}
