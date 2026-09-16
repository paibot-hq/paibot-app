import { getLocale, getTranslations } from "next-intl/server";
import { publicMetadata } from "../../../lib/seo";
import UrlEncodeTool from "../../../components/url-encode-tool";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations("App");
  return publicMetadata(locale, "/urlencode", `${t("urlencodeTitle")} | PAIBOT.app`, t("urlencodeDescription"));
}

export default function UrlEncodePage() {
  return <UrlEncodeTool />;
}
