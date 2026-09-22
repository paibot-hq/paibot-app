import { getLocale, getTranslations } from "next-intl/server";
import { publicMetadata } from "../../../lib/seo";
import UrlEncodeTool from "../../../components/url-encode-tool";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations("App");
  return publicMetadata(locale, "/urlencode", `${t("urlencode.title")} | PAIBOT.app`, t("urlencode.description"));
}

export default function UrlEncodePage() {
  return <UrlEncodeTool />;
}
