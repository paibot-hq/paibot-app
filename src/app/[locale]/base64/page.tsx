import { getLocale, getTranslations } from "next-intl/server";
import { publicMetadata } from "../../../lib/seo";
import Base64Tool from "../../../components/base64-tool";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations("App");
  return publicMetadata(locale, "/base64", `${t("base64Title")} | PAIBOT.app`, t("base64Description"));
}

export default function Base64Page() {
  return <Base64Tool />;
}
