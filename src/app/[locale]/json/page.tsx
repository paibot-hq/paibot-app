import { getLocale, getTranslations } from "next-intl/server";
import { publicMetadata } from "../../../lib/seo";
import JsonTool from "../../../components/json-tool";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations("App");
  return publicMetadata(locale, "/json", `${t("json.title")} | PAIBOT.app`, t("json.description"));
}

export default function JsonPage() {
  return <JsonTool />;
}
